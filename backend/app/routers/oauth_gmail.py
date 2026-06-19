"""
oauth_gmail.py — 테넌트별 Gmail OAuth 연결 플로우.

각 테넌트가 자기 Google Cloud Console의 OAuth 클라이언트(client_id/secret)로
gmail.send 동의를 받아 refresh_token을 본인 워크스페이스에 저장한다.
(공유 클라이언트 X — 한 테넌트 스팸 신고가 전체를 정지시키는 리스크 격리)

흐름:
  1. 테넌트가 설정에서 자기 client_id/secret 저장 (PUT /api/outreach/gmail-secrets)
  2. GET /api/oauth/gmail/start (인증) → 동의 URL 반환 → 프런트가 redirect
  3. Google 동의 → GET /api/oauth/gmail/callback (공개, state로 테넌트 복원)
     → 코드를 테넌트 client로 교환 → refresh_token 저장

선행 조건(테넌트가 자기 Console에서):
  - OAuth 클라이언트(웹) 생성, 승인된 리디렉트 URI =
      {OUTREACH_OAUTH_REDIRECT_URI}  (전역 시크릿/설정으로 1회 지정)
  - OAuth 동의화면에 gmail.send 스코프
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from app.auth import UserContext, get_current_user
from app.tenant_context import TenantContext

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/oauth/gmail", tags=["oauth"])

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/gmail.send"


def _state_secret() -> bytes:
    from app.auth import JWT_SECRET
    return JWT_SECRET.encode()


def _make_state(tenant_id: str) -> str:
    b = base64.urlsafe_b64encode(tenant_id.encode()).decode().rstrip("=")
    sig = hmac.new(_state_secret(), tenant_id.encode(), hashlib.sha256).hexdigest()[:24]
    return f"{b}.{sig}"


def _verify_state(state: str) -> str | None:
    try:
        b, sig = (state or "").split(".", 1)
        pad = "=" * (-len(b) % 4)
        tid = base64.urlsafe_b64decode(b + pad).decode()
        expected = hmac.new(_state_secret(), tid.encode(), hashlib.sha256).hexdigest()[:24]
        return tid if hmac.compare_digest(sig, expected) else None
    except Exception:
        return None


def _redirect_uri() -> str | None:
    """승인된 리디렉트 URI — 전역 시크릿/설정으로 1회 지정 (모든 테넌트 공통: 우리 콜백)."""
    from app.services.secrets import get_secret
    from app.config import settings
    return get_secret("outreach_oauth_redirect_uri") or (getattr(settings, "outreach_oauth_redirect_uri", "") or None)


@router.get("/start")
def start(user: UserContext = Depends(get_current_user)) -> dict:
    """동의 URL 생성. 프런트가 fetch 후 window.location 으로 이동."""
    from app.routers.outreach import _require_tid
    from app.services.secrets import get_tenant_secret
    tid = _require_tid(user)

    client_id = get_tenant_secret(tid, "outreach_gmail_client_id")
    if not client_id:
        raise HTTPException(400, "먼저 본인 Google OAuth client_id/secret을 저장하세요.")
    redirect_uri = _redirect_uri()
    if not redirect_uri:
        raise HTTPException(500, "서버에 outreach_oauth_redirect_uri 미설정 (관리자).")

    from urllib.parse import urlencode
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": _SCOPE,
        "access_type": "offline",
        "prompt": "consent",          # refresh_token 보장
        "state": _make_state(tid),
    }
    return {"auth_url": f"{_AUTH_URL}?{urlencode(params)}"}


@router.get("/callback", response_class=HTMLResponse)
def callback(code: str = "", state: str = "", error: str = "") -> HTMLResponse:
    """Google 동의 후 콜백(공개). state로 테넌트 복원 → 코드 교환 → refresh_token 저장."""
    if error:
        return _page(f"연결 취소/실패: {error}", ok=False)
    tid = _verify_state(state)
    if not tid or not code:
        return _page("유효하지 않은 요청입니다.", ok=False)

    from app.services.secrets import get_tenant_secret, upsert_tenant_secret
    client_id = get_tenant_secret(tid, "outreach_gmail_client_id")
    client_secret = get_tenant_secret(tid, "outreach_gmail_client_secret")
    redirect_uri = _redirect_uri()
    if not (client_id and client_secret and redirect_uri):
        return _page("OAuth 설정이 불완전합니다 (client_id/secret/redirect).", ok=False)

    try:
        r = httpx.post(_TOKEN_URL, data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }, timeout=15)
        r.raise_for_status()
        tok = r.json()
    except Exception as e:
        logger.error("[oauth_gmail] 토큰 교환 실패 [%s]: %s", tid, e)
        return _page("토큰 교환에 실패했습니다. client_secret/redirect URI를 확인하세요.", ok=False)

    refresh_token = tok.get("refresh_token")
    if not refresh_token:
        return _page("refresh_token이 발급되지 않았습니다. (이미 연결된 계정이면 Google 보안설정에서 권한 제거 후 재시도)", ok=False)

    upsert_tenant_secret(tid, "outreach_gmail_refresh_token", refresh_token, "oauth_token")
    logger.info("[oauth_gmail] 연결 완료 — tenant=%s", tid)
    return _page("Gmail 연결이 완료되었습니다! 이제 본인 Gmail로 콜드메일이 발송됩니다.", ok=True)


def _page(msg: str, ok: bool = True) -> HTMLResponse:
    color = "#059669" if ok else "#dc2626"
    icon = "✓" if ok else "✕"
    html = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Gmail 연결</title></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:60px 20px;text-align:center">
<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 32px;box-shadow:0 2px 16px rgba(0,0,0,.06)">
<div style="font-size:44px;color:{color}">{icon}</div>
<h2 style="color:#1e293b;font-size:18px;margin:16px 0 8px">{msg}</h2>
<p style="color:#64748b;font-size:14px">이 창을 닫고 설정 페이지로 돌아가세요.</p>
</div></body></html>"""
    return HTMLResponse(content=html, status_code=200 if ok else 400)
