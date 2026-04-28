"""
alert_dispatcher — alert_events 중 아직 발송 안 된 이벤트를 채널로 발송.

채널 종류:
  - 'email'  → notify_client.send_email() (maesil-insight 게이트웨이 경유)
  - 'widget' → DB 적재만으로 충분 (대시보드가 /api/alerts/recent 폴링)

severity 우선순위:
  info < warning < error < critical
  channel.severity_min 이상의 이벤트만 발송.
"""
from __future__ import annotations

import html as html_lib
import logging
from datetime import datetime, timezone
from typing import Iterable

from app.db.autotool_client import get_autotool_client
from app.services import notify_client

logger = logging.getLogger(__name__)

SEV_RANK = {"info": 0, "warning": 1, "error": 2, "critical": 3}


# ─────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────
def _events_table():
    return get_autotool_client().schema("agent_work").table("alert_events")


def _channels_table():
    return get_autotool_client().schema("agent_work").table("alert_channels")


def _list_active_channels() -> list[dict]:
    resp = _channels_table().select("*").eq("is_active", True).execute()
    return resp.data or []


def _list_undispatched_events(scan_limit: int = 200) -> list[dict]:
    """sent_channels 가 비어있는 이벤트.
    최근 N건을 desc로 가져와 Python에서 필터 후 chronological 순으로 반환.
    분당 수 건 수준 운영 부하라 200건 스캔이면 백로그 충분히 커버."""
    resp = (
        _events_table()
        .select("*")
        .order("created_at", desc=True)
        .limit(scan_limit)
        .execute()
    )
    rows = resp.data or []
    pending = [r for r in rows if not (r.get("sent_channels") or [])]
    # 처리는 오래된 순으로
    pending.reverse()
    return pending


def _mark_sent(event_id: str, sent_entries: list[dict]) -> None:
    _events_table().update({"sent_channels": sent_entries}).eq("id", event_id).execute()


# ─────────────────────────────────────────────────────────────────
# 채널별 발송
# ─────────────────────────────────────────────────────────────────
def _meets_severity(channel_min: str, event_sev: str) -> bool:
    return SEV_RANK.get(event_sev, 0) >= SEV_RANK.get(channel_min, 0)


def _format_email_html(event: dict) -> tuple[str, str]:
    """(subject, html) 반환."""
    sev = (event.get("severity") or "error").upper()
    program = event.get("program_name") or "(unknown)"
    title = event.get("title") or "알림"
    msg = event.get("message") or ""
    created = event.get("created_at") or ""

    subject = f"[maesil-agency · {sev}] {program} — {title[:80]}"
    color = {"CRITICAL": "#b91c1c", "ERROR": "#dc2626", "WARNING": "#d97706", "INFO": "#2563eb"}.get(sev, "#dc2626")

    safe_title = html_lib.escape(title)
    safe_msg = html_lib.escape(msg[:3000])
    safe_program = html_lib.escape(program)

    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">
      <div style="border-left:4px solid {color};padding:12px 16px;background:#fafafa;">
        <div style="color:{color};font-weight:600;font-size:13px;letter-spacing:0.05em;">{sev}</div>
        <div style="font-size:18px;margin-top:4px;font-weight:600;">{safe_title}</div>
        <div style="color:#475569;font-size:13px;margin-top:6px;">프로그램: <strong>{safe_program}</strong> · {html_lib.escape(created)}</div>
      </div>
      <pre style="background:#0f172a;color:#e2e8f0;padding:12px;font-size:12px;
                  border-radius:6px;overflow:auto;margin-top:12px;
                  white-space:pre-wrap;word-break:break-all;">{safe_msg}</pre>
      <p style="color:#64748b;font-size:12px;margin-top:16px;">
        maesil-agency 감시 시스템 자동 발송 · 채널 설정은 /settings 에서 변경
      </p>
    </div>
    """
    return subject, html


def _send_to_channel(event: dict, channel: dict) -> dict:
    """1개 이벤트를 1개 채널로 발송. 반환: {channel_id, kind, sent_at, ok, error}."""
    now = datetime.now(timezone.utc).isoformat()
    base = {"channel_id": channel["id"], "kind": channel["kind"], "sent_at": now}

    kind = channel["kind"]
    if kind == "widget":
        # 위젯은 DB 적재만으로 충분, 발송 OK 표시만
        return {**base, "ok": True, "error": None}

    if kind == "email":
        target = (channel.get("target") or "").strip()
        if not target:
            return {**base, "ok": False, "error": "email target 미설정"}
        subject, html = _format_email_html(event)
        result = notify_client.send_email(target, subject, html)
        return {**base, "ok": bool(result.get("ok")), "error": result.get("error"), "external_id": result.get("id")}

    return {**base, "ok": False, "error": f"unsupported kind: {kind}"}


# ─────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────
def dispatch_pending(limit: int = 50) -> dict:
    """미발송 이벤트를 모든 활성 채널로 fan-out.

    Returns: { events_processed, total_sends, ok_sends, errors: [...] }
    """
    channels = _list_active_channels()
    if not channels:
        return {"events_processed": 0, "total_sends": 0, "ok_sends": 0, "errors": [], "note": "활성 채널 없음"}

    events = _list_undispatched_events(scan_limit=max(limit * 2, 200))
    total_sends = 0
    ok_sends = 0
    errors: list[dict] = []

    for ev in events:
        sent_entries: list[dict] = []
        for ch in channels:
            if not _meets_severity(ch.get("severity_min", "error"), ev.get("severity", "error")):
                continue
            entry = _send_to_channel(ev, ch)
            sent_entries.append(entry)
            total_sends += 1
            if entry.get("ok"):
                ok_sends += 1
            else:
                errors.append({"event_id": ev["id"], "channel_id": ch["id"], "error": entry.get("error")})

        if sent_entries:
            try:
                _mark_sent(ev["id"], sent_entries)
            except Exception as e:
                logger.warning("dispatcher: mark_sent failed for %s — %s", ev.get("id"), e)

    return {
        "events_processed": len(events),
        "total_sends": total_sends,
        "ok_sends": ok_sends,
        "errors": errors[:20],
    }


__all__ = ["dispatch_pending"]
