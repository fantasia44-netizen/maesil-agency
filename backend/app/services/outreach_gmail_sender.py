"""
outreach_gmail_sender.py — 콜드 영업 메일을 별도 Workspace 메일박스의 Gmail API로 발송.

트랜잭션(Resend)과 완전 분리. 실제 메일박스 발송이라 도달률↑, Resend 콜드 밴 무관.

필요 시크릿(secrets 테이블):
  outreach_gmail_client_id
  outreach_gmail_client_secret
  outreach_gmail_refresh_token   (scope: gmail.send)
  outreach_gmail_from            (예: "매실K <partner@maesil-partners.com>")
"""
from __future__ import annotations

import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def _secret(tenant_id: str | None, name: str) -> str | None:
    """테넌트별 Gmail 시크릿 — 없으면 전역 fallback (super_admin/기본 테넌트)."""
    from app.services.secrets import get_tenant_secret
    return get_tenant_secret(tenant_id, name)


def is_configured(tenant_id: str | None = None) -> bool:
    """해당 테넌트(또는 전역)의 Gmail OAuth 시크릿 3종이 모두 있으면 True."""
    return all(_secret(tenant_id, n) for n in (
        "outreach_gmail_client_id",
        "outreach_gmail_client_secret",
        "outreach_gmail_refresh_token",
    ))


def _access_token(tenant_id: str | None = None) -> str | None:
    cid = _secret(tenant_id, "outreach_gmail_client_id")
    csec = _secret(tenant_id, "outreach_gmail_client_secret")
    rtok = _secret(tenant_id, "outreach_gmail_refresh_token")
    if not (cid and csec and rtok):
        return None
    try:
        r = httpx.post(_TOKEN_URL, data={
            "client_id": cid, "client_secret": csec,
            "refresh_token": rtok, "grant_type": "refresh_token",
        }, timeout=10)
        r.raise_for_status()
        return r.json().get("access_token")
    except Exception as e:
        logger.error("outreach gmail 토큰 갱신 실패: %s", e)
        return None


def send(tenant_id: str | None, to: str, subject: str, html: str) -> dict:
    """Gmail API로 단일 발송(테넌트별 Gmail). Returns {ok, id?, error?}."""
    token = _access_token(tenant_id)
    if not token:
        return {"ok": False, "error": "outreach gmail 인증 실패(시크릿 확인)"}

    from_addr = _secret(tenant_id, "outreach_gmail_from") or "partner@maesil-partners.com"

    msg = MIMEMultipart("alternative")
    msg["To"] = to
    msg["From"] = from_addr
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    try:
        r = httpx.post(
            _SEND_URL,
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
            json={"raw": raw},
            timeout=15,
        )
        if r.status_code == 200:
            return {"ok": True, "id": r.json().get("id")}
        logger.warning("outreach gmail 발송 실패 (HTTP %d): %s — %s",
                       r.status_code, to, r.text[:300])
        return {"ok": False, "error": f"HTTP {r.status_code}", "status": r.status_code}
    except Exception as e:
        logger.error("outreach gmail 발송 오류: %s — %s", to, e)
        return {"ok": False, "error": str(e)[:200]}
