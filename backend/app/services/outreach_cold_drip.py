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


def already_scheduled_today() -> bool:
    """오늘(KST) seq=1 pending/sent 터치포인트가 이미 있으면 True."""
    today_kst = _today_kst_str()
    try:
        resp = (
            _db().table("outreach_touchpoints")
            .select("id", count="exact")
            .eq("touch_sequence", 1)
            .eq("channel", "email")
            .in_("status", ["pending", "sent"])
            .gte("scheduled_for", today_kst)
            .execute()
        )
        return (resp.count or 0) > 0
    except Exception as e:
        logger.warning("already_scheduled_today 조회 실패: %s", e)
        return False


def _eligible_leads(cap: int, grades: list[str]) -> list[dict]:
    """오늘 발송 대상: approved + 이메일 있음 + 미발송, 점수순."""
    try:
        resp = (
            _db().table("outreach_leads")
            .select("id, contact_email, handle_name, platform, grade, score")
            .eq("platform", "youtube")
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


def schedule_daily_cold_drip() -> dict:
    """
    오늘 발송 리스트를 outreach_touchpoints DB에 생성.
    이미 오늘 일정이 있거나, 업무시간 전이거나, disabled면 스킵.
    반환: {"scheduled": N} 또는 {"skipped": reason}
    """
    from app.config import settings

    if not settings.outreach_cold_drip_enabled:
        return {"skipped": "disabled"}

    from app.services import outreach_gmail_sender as gm
    if not gm.is_configured():
        return {"skipped": "gmail not configured"}

    now_kst = datetime.now(_KST)
    if now_kst.weekday() >= 5:
        return {"skipped": "weekend"}
    if now_kst.hour < settings.outreach_send_start_hour:
        return {"skipped": "before business hours"}

    if already_scheduled_today():
        return {"skipped": "already scheduled today"}

    cap = max(1, settings.outreach_daily_cap)
    grades = [g.strip() for g in settings.outreach_drip_grades.split(",") if g.strip()]
    leads = _eligible_leads(cap, grades)

    if not leads:
        return {"skipped": "no eligible leads", "scheduled": 0}

    # 오전 start_hour ~ end_hour KST 균등 분산
    start_h = settings.outreach_send_start_hour
    end_h = settings.outreach_send_end_hour
    today = now_kst.date()
    window_sec = (end_h - start_h) * 3600
    n = len(leads)
    gap_sec = window_sec / n if n > 1 else window_sec

    records = []
    for i, lead in enumerate(leads):
        offset_sec = int(gap_sec * i)
        scheduled_kst = datetime(today.year, today.month, today.day,
                                 start_h, 0, 0, tzinfo=_KST) + timedelta(seconds=offset_sec)
        # 과거 시각이면 지금 + 1분으로 (오늘 늦게 처음 실행 시)
        if scheduled_kst < datetime.now(_KST):
            scheduled_kst = datetime.now(_KST) + timedelta(minutes=1 + i)
        records.append({
            "lead_id": lead["id"],
            "touch_sequence": 1,
            "channel": "email",
            "status": "pending",
            "scheduled_for": scheduled_kst.astimezone(timezone.utc).isoformat(),
        })

    # 기존 오늘 seq=1 pending 제거 후 일괄 삽입 (멱등)
    try:
        today_str = _today_kst_str()
        _db().table("outreach_touchpoints").delete()\
            .eq("touch_sequence", 1)\
            .eq("channel", "email")\
            .eq("status", "pending")\
            .gte("scheduled_for", today_str)\
            .execute()
    except Exception as e:
        logger.warning("기존 pending 정리 실패: %s", e)

    inserted = 0
    chunk = 50
    for i in range(0, len(records), chunk):
        try:
            _db().table("outreach_touchpoints").insert(records[i:i+chunk]).execute()
            inserted += len(records[i:i+chunk])
        except Exception as e:
            logger.error("cold drip 예약 삽입 실패 (chunk %d): %s", i, e)

    logger.info("[cold_drip] 오늘 발송 예약 %d건 생성", inserted)
    return {"scheduled": inserted}
