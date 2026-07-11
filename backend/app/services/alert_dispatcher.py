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

from app.db.maesil_total_client import get_maesil_total_client
from app.services import dev_agent, notify_client

logger = logging.getLogger(__name__)

SEV_RANK = {"info": 0, "warning": 1, "error": 2, "critical": 3}


# ─────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────
def _events_table():
    return get_maesil_total_client().schema("agent_work").table("alert_events")


def _channels_table():
    return get_maesil_total_client().schema("agent_work").table("alert_channels")


def _list_active_channels() -> list[dict]:
    resp = _channels_table().select("*").eq("is_active", True).execute()
    return resp.data or []


def _list_undispatched_events(scan_limit: int = 200) -> list[dict]:
    """아직 발송 안 된(또는 일부 채널 실패) 이벤트 반환.

    sent_channels 가 비어있으면 → 완전 미발송
    sent_channels 에 ok=False 항목이 있으면 → 부분 실패 (재시도 대상)
    최근 N건을 desc로 가져와 Python에서 필터 후 chronological 순으로 반환.
    """
    resp = (
        _events_table()
        .select("*")
        .order("created_at", desc=True)
        .limit(scan_limit)
        .execute()
    )
    rows = resp.data or []
    pending = []
    for r in rows:
        sent = r.get("sent_channels") or []
        if not sent:
            # 완전 미발송
            pending.append(r)
        elif any(not e.get("ok") for e in sent):
            # 일부 채널 실패 → 재시도 대상으로 포함, 실패 채널 ID만 별도 표시
            r["_retry_channel_ids"] = {e["channel_id"] for e in sent if not e.get("ok")}
            r["_already_sent_channel_ids"] = {e["channel_id"] for e in sent if e.get("ok")}
            pending.append(r)
    # 처리는 오래된 순으로
    pending.reverse()
    return pending


def _mark_sent(event_id: str, sent_entries: list[dict]) -> None:
    """성공 항목을 sent_channels에 append (기존 성공분 보존)."""
    # 기존 sent_channels 조회 후 성공 항목만 누적 (중복 channel_id 덮어쓰기)
    resp = _events_table().select("sent_channels").eq("id", event_id).limit(1).execute()
    existing: list[dict] = []
    if resp.data:
        existing = resp.data[0].get("sent_channels") or []

    # channel_id 기준으로 merge (새 항목이 우선)
    merged: dict[str, dict] = {e["channel_id"]: e for e in existing}
    for e in sent_entries:
        merged[e["channel_id"]] = e

    _events_table().update({"sent_channels": list(merged.values())}).eq("id", event_id).execute()


# ─────────────────────────────────────────────────────────────────
# 채널별 발송
# ─────────────────────────────────────────────────────────────────
def _meets_severity(channel_min: str, event_sev: str) -> bool:
    return SEV_RANK.get(event_sev, 0) >= SEV_RANK.get(channel_min, 0)


def _chat_url(event_id: str) -> str:
    import os
    base = os.environ.get("FRONTEND_URL", "https://maesil-agency-frontend.onrender.com").rstrip("/")
    return f"{base}/chat?alert_id={event_id}"


def _format_email_html(event: dict, analysis: "dev_agent.ErrorAnalysis | None" = None) -> tuple[str, str]:
    """(subject, html) 반환. analysis 있으면 AI 분석 섹션 포함."""
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

    # AI 분석 섹션 (있을 때만)
    ai_section = ""
    if analysis and analysis.ok:
        conf_color = {"high": "#16a34a", "medium": "#d97706", "low": "#94a3b8"}.get(analysis.confidence, "#94a3b8")
        ai_section = f"""
      <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;
                    display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;">🤖</span>
          <span style="font-weight:600;font-size:13px;">AI 에러 분석</span>
          <span style="margin-left:auto;font-size:11px;color:{conf_color};font-weight:600;">
            신뢰도: {html_lib.escape(analysis.confidence)}
          </span>
        </div>
        <div style="padding:12px 16px;">
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;
                        letter-spacing:0.05em;margin-bottom:4px;">■ 원인 추정</div>
            <div style="font-size:13px;color:#1e293b;">{html_lib.escape(analysis.root_cause)}</div>
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;
                        letter-spacing:0.05em;margin-bottom:4px;">■ 영향 범위</div>
            <div style="font-size:13px;color:#1e293b;">{html_lib.escape(analysis.impact)}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;
                        letter-spacing:0.05em;margin-bottom:4px;">■ 수정 방향</div>
            <div style="font-size:13px;color:#1e293b;white-space:pre-line;">{html_lib.escape(analysis.fix_suggestion)}</div>
          </div>
        </div>
      </div>"""

    event_id = event.get("id") or ""
    chat_link = _chat_url(event_id) if event_id else ""

    chat_button = ""
    if chat_link:
        chat_button = f"""
      <div style="margin-top:20px;text-align:center;">
        <a href="{html_lib.escape(chat_link)}"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                  padding:11px 28px;border-radius:8px;font-size:14px;font-weight:600;
                  letter-spacing:0.02em;">
          💬 채팅에서 분석하기
        </a>
        <p style="color:#94a3b8;font-size:11px;margin-top:8px;">
          개발 AI와 대화해 원인 분석 및 수정 방향을 확인하세요.
        </p>
      </div>"""

    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">
      <div style="border-left:4px solid {color};padding:12px 16px;background:#fafafa;">
        <div style="color:{color};font-weight:600;font-size:13px;letter-spacing:0.05em;">{sev}</div>
        <div style="font-size:18px;margin-top:4px;font-weight:600;">{safe_title}</div>
        <div style="color:#475569;font-size:13px;margin-top:6px;">프로그램: <strong>{safe_program}</strong> · {html_lib.escape(created)}</div>
      </div>
      {ai_section}
      <div style="margin-top:12px;">
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;
                    letter-spacing:0.05em;margin-bottom:6px;">■ 원문 로그</div>
        <pre style="background:#0f172a;color:#e2e8f0;padding:12px;font-size:12px;
                    border-radius:6px;overflow:auto;
                    white-space:pre-wrap;word-break:break-all;">{safe_msg}</pre>
      </div>
      {chat_button}
      <p style="color:#64748b;font-size:12px;margin-top:16px;">
        maesil-agency 감시 시스템 자동 발송 · 채널 설정은 /settings 에서 변경
      </p>
    </div>
    """
    return subject, html


def _is_quota_error(err: str | None) -> bool:
    """이메일 provider 일일 quota 초과(429) 여부. 서킷브레이커 트리거."""
    if not err:
        return False
    e = err.lower()
    return "429" in e or "quota" in e or "too many requests" in e


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

        # error/critical 이벤트만 AI 분석 (info/warning은 스킵해서 API 비용 절감)
        analysis = None
        if SEV_RANK.get(event.get("severity", "info"), 0) >= SEV_RANK["error"]:
            try:
                analysis = dev_agent.analyze_error(
                    program_name=event.get("program_name") or "unknown",
                    severity=event.get("severity", "error"),
                    title=event.get("title") or "",
                    message=event.get("message") or "",
                    source=event.get("source") or "render-logs",
                )
            except Exception as e:
                logger.warning("dev_agent 호출 실패 (이메일은 계속): %s", e)

        subject, html = _format_email_html(event, analysis)
        result = notify_client.send_email(target, subject, html)
        return {**base, "ok": bool(result.get("ok")), "error": result.get("error"), "external_id": result.get("id")}

    return {**base, "ok": False, "error": f"unsupported kind: {kind}"}


# ─────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────
def dispatch_pending(limit: int = 50) -> dict:
    """미발송 이벤트를 모든 활성 채널로 fan-out.

    성공한 채널만 sent_channels에 기록 → 실패 채널은 다음 사이클에 재시도.
    단, severity 미충족으로 스킵된 채널은 '처리 대상 아님'이므로 전체 채널이
    severity 미충족이면 이벤트 자체를 건드리지 않음.

    Returns: { events_processed, total_sends, ok_sends, errors: [...] }
    """
    channels = _list_active_channels()
    if not channels:
        return {"events_processed": 0, "total_sends": 0, "ok_sends": 0, "errors": [], "note": "활성 채널 없음"}

    events = _list_undispatched_events(scan_limit=max(limit * 2, 200))
    total_sends = 0
    ok_sends = 0
    errors: list[dict] = []
    # 서킷브레이커: 이메일 quota(429)를 한 번이라도 만나면 이 사이클 내 이메일 발송 중단.
    # (quota 소진 상태에서 계속 시도하면 폭주 + Claude 분석 비용 낭비)
    email_circuit_open = False

    for ev in events:
        ok_entries: list[dict] = []   # 성공한 채널만 마킹 (실패는 제외 → 재시도 대상)
        # 재시도 이벤트: 이전에 이미 성공한 채널은 건너뜀 (중복 발송 방지)
        already_sent_ids: set = ev.get("_already_sent_channel_ids") or set()

        for ch in channels:
            if ch["id"] in already_sent_ids:
                continue  # 이전 사이클에서 이미 성공 → 스킵
            if not _meets_severity(ch.get("severity_min", "error"), ev.get("severity", "error")):
                continue
            # quota 서킷 열림 → 이메일 채널은 건너뜀 (다음 사이클 재시도 대상으로 남김)
            if email_circuit_open and ch.get("kind") == "email":
                continue
            entry = _send_to_channel(ev, ch)
            total_sends += 1
            if entry.get("ok"):
                ok_sends += 1
                ok_entries.append(entry)
            else:
                errors.append({"event_id": ev["id"], "channel_id": ch["id"], "error": entry.get("error")})
                logger.warning("dispatcher: 채널 발송 실패 [event=%s channel=%s]: %s",
                               ev.get("id"), ch.get("id"), entry.get("error"))
                if ch.get("kind") == "email" and _is_quota_error(entry.get("error")):
                    email_circuit_open = True
                    logger.error("dispatcher: 이메일 quota 초과 감지 — 이번 사이클 이메일 발송 중단(서킷 오픈)")

        # 성공한 채널이 1개 이상 있을 때만 마킹 (실패 채널은 다음 사이클 재시도)
        if ok_entries:
            try:
                _mark_sent(ev["id"], ok_entries)
            except Exception as e:
                logger.warning("dispatcher: mark_sent failed for %s — %s", ev.get("id"), e)

    return {
        "events_processed": len(events),
        "total_sends": total_sends,
        "ok_sends": ok_sends,
        "errors": errors[:20],
    }


__all__ = ["dispatch_pending"]
