"""
gmail_watcher.py — Gmail API 회신 추적 + Claude Haiku 회신 분석.

스케줄러에서 15분마다 호출.
필요 시크릿:
  - gmail_client_id
  - gmail_client_secret
  - gmail_refresh_token
  - gmail_from_email   (발송에 사용한 Gmail 주소)

동작 방식:
  1. emailed 상태 리드 조회 (emailed_at 있음, reply_type 없음)
  2. Gmail API로 해당 이메일 주소의 회신 스레드 탐색
  3. 회신 발견 → Haiku로 분류 (interested/question/declined/auto_reply/other)
  4. DB 업데이트 (status=replied, reply_type, reply_summary)
"""
from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

logger = logging.getLogger(__name__)

_GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

# ── DB 헬퍼 ──────────────────────────────────────────────────────────

def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _get_secret(name: str) -> str | None:
    from app.services.secrets import get_secret
    return get_secret(name)


# ── OAuth2 액세스 토큰 갱신 ───────────────────────────────────────────

def _get_access_token(client_id: str, client_secret: str, refresh_token: str) -> str | None:
    try:
        r = httpx.post(_GMAIL_TOKEN_URL, data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }, timeout=10)
        r.raise_for_status()
        return r.json().get("access_token")
    except Exception as e:
        logger.error("Gmail 토큰 갱신 실패: %s", e)
        return None


# ── Gmail 검색 ────────────────────────────────────────────────────────

def _search_threads(token: str, query: str, max_results: int = 50) -> list[str]:
    """Gmail 스레드 ID 목록 반환."""
    try:
        r = httpx.get(
            f"{_GMAIL_API_BASE}/users/me/threads",
            params={"q": query, "maxResults": max_results},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        r.raise_for_status()
        return [t["id"] for t in r.json().get("threads", [])]
    except Exception as e:
        logger.warning("Gmail 스레드 검색 실패: %s", e)
        return []


def _get_thread(token: str, thread_id: str) -> dict:
    try:
        r = httpx.get(
            f"{_GMAIL_API_BASE}/users/me/threads/{thread_id}",
            params={"format": "metadata", "metadataHeaders": ["Subject", "From", "To", "Date"]},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning("Gmail 스레드 조회 실패 [%s]: %s", thread_id, e)
        return {}


def _get_message_text(token: str, message_id: str) -> str:
    """메시지 본문 텍스트 추출 (최대 2000자)."""
    try:
        r = httpx.get(
            f"{_GMAIL_API_BASE}/users/me/messages/{message_id}",
            params={"format": "full"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        r.raise_for_status()
        msg = r.json()
        return _extract_text_from_payload(msg.get("payload", {}))[:2000]
    except Exception as e:
        logger.debug("메시지 본문 조회 실패 [%s]: %s", message_id, e)
        return ""


def _extract_text_from_payload(payload: dict) -> str:
    """Gmail 메시지 payload에서 plain text 추출."""
    mime = payload.get("mimeType", "")

    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    if mime == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            import re
            html = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
            return re.sub(r"<[^>]+>", " ", html)

    # multipart → 재귀
    for part in payload.get("parts", []):
        text = _extract_text_from_payload(part)
        if text.strip():
            return text
    return ""


def _header_val(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


# ── Haiku 회신 분류 ───────────────────────────────────────────────────

def _classify_reply(reply_text: str, handle_name: str, api_key: str) -> dict:
    """Claude Haiku로 회신 의도 분류."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    prompt = f"""아래는 파트너십 제안 이메일에 대한 회신입니다. 의도를 분류하고 JSON으로만 답하세요.

채널명: {handle_name}
회신 내용:
{reply_text[:1500]}

분류 기준:
- interested: 긍정적 반응, 미팅/통화 희망, 더 알고 싶다는 반응
- question: 조건·수수료·서비스 등에 대한 질문 (관심 있지만 궁금한 게 있음)
- declined: 거절 (바쁨, 맞지 않음, 관심 없음)
- auto_reply: 자동응답 (부재중, 오피스 아웃)
- other: 분류 불가

{{
  "reply_type": "interested|question|declined|auto_reply|other",
  "summary": "회신 내용 핵심 1문장 (한국어)",
  "urgency": "high|medium|low",
  "suggested_action": "담당자가 해야 할 다음 행동 1문장 (한국어)"
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.warning("Haiku 회신 분류 실패: %s", e)
        return {"reply_type": "other", "summary": "분류 실패", "urgency": "low", "suggested_action": "수동 확인 필요"}


# ── 알림 이메일 ───────────────────────────────────────────────────────

def _notify_admin_reply(lead: dict, classification: dict) -> None:
    """회신 수신 시 담당자 알림."""
    admin_email = _get_secret("admin_email") or _get_secret("maesil_admin_email")
    if not admin_email:
        return

    from app.services.notify_client import send_email

    handle = lead.get("handle_name", "채널")
    reply_type = classification.get("reply_type", "other")
    summary = classification.get("summary", "")
    action = classification.get("suggested_action", "")
    urgency = classification.get("urgency", "low")

    type_label = {
        "interested": "🎉 관심 표명",
        "question": "❓ 질문 회신",
        "declined": "❌ 거절",
        "auto_reply": "🤖 자동응답",
        "other": "📩 기타 회신",
    }.get(reply_type, "📩 회신")

    urgency_color = {"high": "#dc2626", "medium": "#d97706", "low": "#64748b"}.get(urgency, "#64748b")

    subject = f"[영업회신] {handle} — {type_label}"
    html = f"""<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h3 style="color:#0f172a">{type_label} 수신</h3>
<p><strong>채널:</strong> {handle}</p>
<p><strong>점수:</strong> {lead.get('score', 0)}점 ({lead.get('grade', '?')}급)</p>
<p><strong>이메일:</strong> {lead.get('contact_email', '-')}</p>
<p><strong>요약:</strong> {summary}</p>
<p style="color:{urgency_color}"><strong>긴급도:</strong> {urgency.upper()}</p>
<p><strong>권장 행동:</strong> {action}</p>
<p style="margin-top:16px">
  <a href="{lead.get('platform_url','#')}" style="color:#2563eb">{handle} 채널 보기</a>
</p>
</div>"""

    try:
        send_email(to=admin_email, subject=subject, html=html, source="maesil-agency")
    except Exception as e:
        logger.warning("회신 알림 발송 실패: %s", e)


# ── 메인 감시 루프 ────────────────────────────────────────────────────

def watch_replies(limit: int = 30) -> dict:
    """
    emailed 리드 회신 감시. 스케줄러에서 15분마다 호출.
    """
    client_id = _get_secret("gmail_client_id")
    client_secret = _get_secret("gmail_client_secret")
    refresh_token = _get_secret("gmail_refresh_token")
    from_email = _get_secret("gmail_from_email")
    api_key = _get_secret("anthropic_api_key") or ""

    if not all([client_id, client_secret, refresh_token, from_email]):
        return {"skipped": True, "reason": "Gmail 시크릿 미설정"}

    access_token = _get_access_token(client_id, client_secret, refresh_token)  # type: ignore[arg-type]
    if not access_token:
        return {"ok": False, "error": "액세스 토큰 갱신 실패"}

    # emailed 상태 리드 조회
    try:
        resp = (
            _db().table("outreach_leads")
            .select("id, handle_name, contact_email, platform_url, score, grade, emailed_at")
            .eq("status", "emailed")
            .is_("reply_type", "null")
            .order("emailed_at", desc=True)
            .limit(limit)
            .execute()
        )
        leads = resp.data or []
    except Exception as e:
        return {"ok": False, "error": f"리드 조회 실패: {e}"}

    if not leads:
        return {"ok": True, "checked": 0, "found_replies": 0}

    found = 0
    checked = 0

    for lead in leads:
        to_addr = lead.get("contact_email")
        if not to_addr:
            continue

        checked += 1

        # Gmail 검색: 보낸 메일 스레드에 답장이 온 것
        # from:(상대방 이메일) to:(내 이메일) — 가장 직접적
        query = f"from:{to_addr} to:{from_email}"
        thread_ids = _search_threads(access_token, query, max_results=5)

        if not thread_ids:
            # fallback: 내가 보낸 메일 스레드에 2개 이상의 메시지
            query2 = f"to:{to_addr} from:{from_email}"
            thread_ids2 = _search_threads(access_token, query2, max_results=5)
            # 각 스레드의 메시지 수 확인 → 2개 이상이면 회신 있음
            for tid in thread_ids2:
                thread = _get_thread(access_token, tid)
                messages = thread.get("messages", [])
                if len(messages) >= 2:
                    # 가장 마지막 메시지의 발신자가 상대방인지 확인
                    last_msg = messages[-1]
                    headers = last_msg.get("payload", {}).get("headers", [])
                    from_val = _header_val(headers, "From")
                    if to_addr.lower() in from_val.lower():
                        thread_ids = [tid]
                        break
            if not thread_ids:
                continue

        # 회신 메시지 추출
        reply_text = ""
        reply_date: datetime | None = None

        for tid in thread_ids[:2]:
            thread = _get_thread(access_token, tid)
            messages = thread.get("messages", [])
            for msg_meta in messages:
                headers = msg_meta.get("payload", {}).get("headers", [])
                from_val = _header_val(headers, "From")
                if to_addr.lower() not in from_val.lower():
                    continue
                # 상대방 메시지 → 본문 가져오기
                mid = msg_meta.get("id", "")
                reply_text = _get_message_text(access_token, mid)
                date_str = _header_val(headers, "Date")
                try:
                    reply_date = parsedate_to_datetime(date_str).replace(tzinfo=timezone.utc)
                except Exception:
                    reply_date = datetime.now(timezone.utc)
                break
            if reply_text:
                break

        if not reply_text:
            continue

        # Haiku 회신 분류
        classification = _classify_reply(reply_text, lead.get("handle_name", "채널"), api_key)
        reply_type = classification.get("reply_type", "other")
        summary = classification.get("summary", "")

        # DB 업데이트
        now = datetime.now(timezone.utc).isoformat()
        new_status = "replied"
        if reply_type == "declined":
            new_status = "rejected"
        elif reply_type in ("interested", "question"):
            new_status = "replied"

        try:
            _db().table("outreach_leads").update({
                "status": new_status,
                "reply_type": reply_type,
                "reply_summary": summary[:300],
                "reply_received_at": reply_date.isoformat() if reply_date else now,
                "updated_at": now,
            }).eq("id", lead["id"]).execute()
            logger.info("[gmail_watcher] 회신 감지: %s → %s (%s)", lead.get("handle_name"), reply_type, new_status)
        except Exception as e:
            logger.error("[gmail_watcher] DB 업데이트 실패 [%s]: %s", lead["id"], e)
            continue

        # 담당자 알림 (declined 제외 또는 선택)
        if reply_type not in ("auto_reply",):
            _notify_admin_reply(lead, classification)

        found += 1

    logger.info("[gmail_watcher] 완료: checked=%d found=%d", checked, found)
    return {"ok": True, "checked": checked, "found_replies": found}
