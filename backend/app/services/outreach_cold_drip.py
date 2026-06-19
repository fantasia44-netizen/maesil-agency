"""
outreach_cold_drip.py — 유튜버 콜드 메일 일별 발송 스케줄 DB화.

매일 KST 오전 8시 이후 첫 스케줄러 사이클에서 schedule_daily_cold_drip() 호출.
approved 리드 최대 N개를 선택해 outreach_touchpoints(seq=1, pending)로 오전8시~오후8시
균등 분산 예약. 실제 발송은 outreach_followup.check_pending_followups() 가 담당.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

_KST = timezone(timedelta(hours=9))


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _today_kst_str() -> str:
    return datetime.now(_KST).date().isoformat()


def already_scheduled_today(tenant_id: str) -> bool:
    """오늘(KST) 날짜 범위 내 pending seq=1이 있으면 배치 생성된 것으로 판단."""
    now_kst = datetime.now(_KST)
    today_kst_start = datetime(now_kst.year, now_kst.month, now_kst.day, 0, 0, 0, tzinfo=_KST)
    tomorrow_kst_start = today_kst_start + timedelta(days=1)
    today_utc_start = today_kst_start.astimezone(timezone.utc).isoformat()
    tomorrow_utc_start = tomorrow_kst_start.astimezone(timezone.utc).isoformat()
    try:
        resp = (
            _db().table("outreach_touchpoints")
            .select("id", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("touch_sequence", 1)
            .eq("channel", "email")
            .eq("status", "pending")
            .gte("scheduled_for", today_utc_start)
            .lt("scheduled_for", tomorrow_utc_start)
            .execute()
        )
        return (resp.count or 0) > 0
    except Exception as e:
        logger.warning("already_scheduled_today 조회 실패: %s", e)
        return False


def _eligible_leads(tenant_id: str, cap: int, grades: list[str]) -> list[dict]:
    """오늘 발송 대상: approved + 이메일 있음 + 미발송, 점수순(테넌트 스코프)."""
    try:
        resp = (
            _db().table("outreach_leads")
            .select("id, contact_email, handle_name, platform, grade, score")
            .eq("tenant_id", tenant_id)
            .in_("platform", ["youtube", "naver_blog"])
            .in_("status", ["approved"])
            .in_("grade", grades)
            .is_("emailed_at", "null")
            .not_.is_("contact_email", "null")
            .order("score", desc=True)
            .limit(cap)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning("eligible_leads 조회 실패: %s", e)
        return []


def schedule_daily_cold_drip(tenant_id: str) -> dict:
    """
    오늘 발송 리스트를 outreach_touchpoints DB에 생성(테넌트 스코프).
    이미 오늘 일정이 있거나, 업무시간 전이거나, disabled면 스킵.
    반환: {"scheduled": N} 또는 {"skipped": reason}
    """
    from app.config import settings

    if not settings.outreach_cold_drip_enabled:
        return {"skipped": "disabled"}

    from app.services import outreach_gmail_sender as gm
    if not gm.is_configured(tenant_id):
        return {"skipped": "gmail not configured"}

    now_kst = datetime.now(_KST)
    if now_kst.weekday() >= 5:
        return {"skipped": "weekend"}
    start_h = settings.outreach_send_start_hour
    end_h = settings.outreach_send_end_hour
    if now_kst.hour < start_h:
        return {"skipped": "before business hours"}
    if now_kst.hour >= end_h:
        return {"skipped": "after business hours"}

    # ── top-up 방식: 매 사이클 오늘 누적이 cap 미만이면 부족분만 추가 예약 ──
    # (8am 1회 스냅샷-잠금이 아니라, 분석이 새 approved 리드를 만들수록 그날 안에 cap까지 채움)
    cap = max(1, settings.outreach_daily_cap)
    scheduled_ids = _scheduled_lead_ids_today(tenant_id)   # 오늘 이미 예약/발송된 seq=1 리드
    already = len(scheduled_ids)
    room = cap - already
    if room <= 0:
        return {"skipped": "daily cap reached", "scheduled": 0, "today_total": already, "cap": cap}

    grades = [g.strip() for g in settings.outreach_drip_grades.split(",") if g.strip()]
    # 여유있게 가져와 이미 예약된 리드 제외 후 room개 선택
    candidates = _eligible_leads(tenant_id, room + already + 50, grades)
    leads = [l for l in candidates if l["id"] not in scheduled_ids][:room]
    if not leads:
        return {"skipped": "no eligible leads", "scheduled": 0, "today_total": already, "cap": cap}

    # 지금 ~ end_h(KST) 남은 시간에 분산
    today = now_kst.date()
    end_dt = datetime(today.year, today.month, today.day, end_h, 0, 0, tzinfo=_KST)
    remaining_sec = max(60, int((end_dt - now_kst).total_seconds()))
    n = len(leads)
    gap_sec = remaining_sec / n if n > 1 else 0

    records = []
    for i, lead in enumerate(leads):
        scheduled_kst = now_kst + timedelta(seconds=int(gap_sec * i) + 30)
        records.append({
            "tenant_id": tenant_id,
            "lead_id": lead["id"],
            "touch_sequence": 1,
            "channel": "email",
            "status": "pending",
            "scheduled_for": scheduled_kst.astimezone(timezone.utc).isoformat(),
        })

    inserted = 0
    chunk = 50
    for i in range(0, len(records), chunk):
        try:
            _db().table("outreach_touchpoints").insert(records[i:i+chunk]).execute()
            inserted += len(records[i:i+chunk])
        except Exception as e:
            logger.error("cold drip 예약 삽입 실패 (chunk %d): %s", i, e)

    logger.info("[cold_drip] top-up 예약 +%d건 (오늘 누적 %d/%d)", inserted, already + inserted, cap)
    return {"scheduled": inserted, "today_total": already + inserted, "cap": cap}


def _scheduled_lead_ids_today(tenant_id: str) -> set:
    """오늘(KST) seq=1 이메일 터치포인트가 있는(pending+sent) 리드 id 집합(테넌트 스코프).
    top-up 시 이미 예약/발송된 리드를 제외하고 cap 누적을 계산하는 데 사용."""
    now_kst = datetime.now(_KST)
    today_start = datetime(now_kst.year, now_kst.month, now_kst.day, 0, 0, 0, tzinfo=_KST)
    tomorrow_start = today_start + timedelta(days=1)
    a = today_start.astimezone(timezone.utc).isoformat()
    b = tomorrow_start.astimezone(timezone.utc).isoformat()
    try:
        resp = (
            _db().table("outreach_touchpoints")
            .select("lead_id")
            .eq("tenant_id", tenant_id)
            .eq("touch_sequence", 1)
            .eq("channel", "email")
            .in_("status", ["pending", "sent"])
            .gte("scheduled_for", a)
            .lt("scheduled_for", b)
            .execute()
        )
        return {r["lead_id"] for r in (resp.data or []) if r.get("lead_id")}
    except Exception as e:
        logger.warning("_scheduled_lead_ids_today 조회 실패: %s", e)
        return set()
