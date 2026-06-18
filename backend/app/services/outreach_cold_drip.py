"""
outreach_cold_drip.py — 유튜버 콜드 메일 저속 드립 발송.

스케줄러(3분 주기)에서 process_cold_drip() 호출.
정책: OUTREACH_COLD_DRIP_ENABLED=1 일 때만, 업무시간(평일 KST 10~17),
하루 OUTREACH_DAILY_CAP(기본 30)통, 발송 간격 = 업무시간/일일상한(기본 ~14분).
발송은 별도 Workspace 메일박스 Gmail API (outreach_gmail_sender).
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

_KST = timezone(timedelta(hours=9))
_last_send_mono = 0.0  # 발송 간격 페이싱(프로세스 메모리). 재시작 시 0 — 무방.


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _within_business_hours(now_kst: datetime, start_h: int, end_h: int) -> bool:
    if now_kst.weekday() >= 5:  # 토(5)·일(6) 제외
        return False
    return start_h <= now_kst.hour < end_h


def _sent_today() -> int:
    """오늘(KST) 발송된 유튜버 콜드 리드 수 — 재시작 후에도 상한 유지(DB 기준)."""
    start_kst = datetime.now(_KST).replace(hour=0, minute=0, second=0, microsecond=0)
    start_utc = start_kst.astimezone(timezone.utc).isoformat()
    try:
        resp = (
            _db().table("outreach_leads")
            .select("id", count="exact")
            .eq("platform", "youtube")
            .gte("emailed_at", start_utc)
            .execute()
        )
        return resp.count or 0
    except Exception as e:
        logger.warning("_sent_today 조회 실패: %s", e)
        return 0


def _next_lead(grades: list[str]) -> dict | None:
    """발송 대상 1건: 유튜브·이메일 있음·미발송·지정 등급, 점수순."""
    try:
        resp = (
            _db().table("outreach_leads")
            .select("*")
            .eq("platform", "youtube")
            .in_("status", ["approved"])
            .in_("grade", grades)
            .is_("emailed_at", "null")
            .not_.is_("contact_email", "null")
            .order("score", desc=True)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.warning("_next_lead 조회 실패: %s", e)
        return None


def process_cold_drip() -> dict:
    global _last_send_mono
    from app.config import settings

    if not settings.outreach_cold_drip_enabled:
        return {"skipped": "disabled"}

    from app.services import outreach_gmail_sender as gm
    if not gm.is_configured():
        return {"skipped": "gmail not configured"}

    now_kst = datetime.now(_KST)
    if not _within_business_hours(now_kst, settings.outreach_send_start_hour,
                                  settings.outreach_send_end_hour):
        return {"skipped": "outside business hours"}

    cap = max(1, settings.outreach_daily_cap)
    sent = _sent_today()
    if sent >= cap:
        return {"skipped": "daily cap reached", "sent_today": sent}

    # 발송 간격(분) = 업무시간 / 상한
    window_min = max(1, (settings.outreach_send_end_hour - settings.outreach_send_start_hour) * 60)
    gap_sec = (window_min / cap) * 60
    if _last_send_mono and (time.monotonic() - _last_send_mono) < gap_sec:
        return {"skipped": "pacing", "sent_today": sent}

    grades = [g.strip() for g in settings.outreach_drip_grades.split(",") if g.strip()]
    lead = _next_lead(grades)
    if not lead:
        return {"skipped": "no eligible lead", "sent_today": sent}

    to = lead.get("contact_email")
    lead_id = lead.get("id")

    # 수신거부/차단 → 발송 제외 + 상태 전환(재선택 방지)
    from app.services.outreach_suppression import is_suppressed
    if is_suppressed(to):
        try:
            _db().table("outreach_leads").update(
                {"status": "unsubscribe", "updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", lead_id).execute()
        except Exception:
            pass
        return {"skipped": "suppressed lead", "sent_today": sent}

    from app.services.outreach_mailer import build_lead_email
    subject, html = build_lead_email(lead)
    result = gm.send(to, subject, html)

    now_iso = datetime.now(timezone.utc).isoformat()
    if result.get("ok"):
        _last_send_mono = time.monotonic()
        try:
            _db().table("outreach_leads").update({
                "status": "emailed", "emailed_at": now_iso, "updated_at": now_iso,
            }).eq("id", lead_id).execute()
        except Exception as e:
            logger.warning("드립 발송 후 상태 갱신 실패 [%s]: %s", lead_id, e)

        # 터치포인트 1차 기록 (발송 이력 통합 추적용)
        try:
            _db().table("outreach_touchpoints").upsert({
                "lead_id": lead_id,
                "touch_sequence": 1,
                "channel": "email",
                "status": "sent",
                "scheduled_for": now_iso,
                "sent_at": now_iso,
            }, on_conflict="lead_id,touch_sequence").execute()
            # 2~3차 팔로업 이메일 예약 (7일, 14일 후)
            for seq, days in [(2, 7), (3, 14)]:
                scheduled = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
                _db().table("outreach_touchpoints").upsert({
                    "lead_id": lead_id,
                    "touch_sequence": seq,
                    "channel": "email",
                    "status": "pending",
                    "scheduled_for": scheduled,
                }, on_conflict="lead_id,touch_sequence").execute()
        except Exception as e:
            logger.warning("드립 터치포인트 기록 실패 [%s]: %s", lead_id, e)

        logger.info("[cold_drip] 발송 %s → %s (%d/%d)",
                    lead.get("handle_name"), to, sent + 1, cap)
        return {"sent": 1, "to": to, "sent_today": sent + 1, "cap": cap}

    logger.warning("[cold_drip] 발송 실패 %s → %s: %s", lead.get("handle_name"), to, result.get("error"))
    return {"error": result.get("error"), "sent_today": sent}
