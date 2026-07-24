"""
oauth_gmail_watch.py — 반송·회신 감시용 Gmail(gmail_* 전역 시크릿) 재연결 플로우.

gmail_watcher가 쓰는 gmail_refresh_token은 만료(테스트모드 7일 / 폐기)되면 401로
반송·회신 자동 감시가 멈춘다. 이 라우터가 원클릭 재인증으로 새 refresh_token을
발급받아 전역 시크릿에 저장한다.
(영업 콜드메일 발송용 outreach_gmail_*는 oauth_gmail.py가 별도로 담당.)

흐름:
  1. 설정에서 gmail_client_id / gmail_client_secret 저장 (기존 시크릿 카드)
  2. GET /api/oauth/gmail-watch/start (super_admin) → 동의 URL 반환 → 프런트가 redirect
  3. Google 동의 → GET /api/oauth/gmail-watch/callback (공개, state로 CSRF 검증)
     → 코드 교환 → gmail_refresh_token 저장

선행 조건(Google Cloud Console):
  - OAuth 클라이언트는 **웹 애플리케이션** 타입이어야 함 (Desktop 앱은 웹 리디렉트 불가)
  - 승인된 리디렉트 URI = {maesil_agency_url}/api/oauth/gmail-watch/callback
  - 동의화면 스코프에 gmail.readonly
"""
from __future__ import annotations

import hashlib
import hmac
import logging
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from app.auth import UserContext, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/oauth/gmail-watch", tags=["oauth"])

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
_STATE_MARKER = "gmail-watch"


def _state_secret() -> bytes:
    from app.auth import JWT_SECRET
    return JWT_SECRET.encode()


def _make_state() -> str:
    sig = hmac.new(_state_secret(), _STATE_MARKER.encode(), hashlib.sha256).hexdigest()[:24]
    return f"{_STATE_MARKER}.{sig}"


def _verify_state(state: str) -> bool:
    try:
        marker, sig = (state or "").split(".", 1)
        if marker != _STATE_MARKER:
            return False
        expected = hmac.new(_state_secret(), marker.encode(), hashlib.sha256).hexdigest()[:24]
        return hmac.compare_digest(sig, expected)
    except Exception:
        return False


def _redirect_uri() -> str | None:
    """콜백 주소 — 전용 override 우선, 없으면 백엔드 베이스 URL에서 파생."""
    from app.services.secrets import get_secret
    override = get_secret("gmail_watch_redirect_uri")
    if override:
        return override.strip()
    base = get_secret("maesil_agency_url")
    if not base:
        return None
    return base.rstrip("/") + "/api/oauth/gmail-watch/callback"


@router.get("/start")
def start(user: UserContext = Depends(get_current_user)) -> dict:
    """동의 URL 생성(관리자 전용). 프런트가 fetch 후 window.location 으로 이동."""
    if not user.is_super_admin:
        raise HTTPException(403, "관리자만 Gmail 감시 계정을 재연결할 수 있습니다.")
    from app.services.secrets import get_secret
    client_id = get_secret("gmail_client_id")
    if not client_id:
        raise HTTPException(400, "먼저 gmail_client_id / gmail_client_secret을 저장하세요.")
    redirect_uri = _redirect_uri()
    if not redirect_uri:
        raise HTTPException(500, "maesil_agency_url 미설정 — 콜백 주소를 만들 수 없습니다 (설정에서 등록).")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": _SCOPE,
        "access_type": "offline",
        "prompt": "consent",          # refresh_token 재발급 보장
        "state": _make_state(),
    }
    return {"auth_url": f"{_AUTH_URL}?{urlencode(params)}", "redirect_uri": redirect_uri}


@router.post("/run")
def run_now(user: UserContext = Depends(get_current_user)) -> dict:
    """지금 즉시 회신·반송 감시 1회 실행 (진단용, 관리자 전용).

    스케줄러(15분)나 ENABLE_GMAIL_WATCHER 플래그와 무관하게 강제 실행하고,
    감시 계정·발신주소 일치 여부·검색 결과(checked/found)를 그대로 반환한다.
    "받는 메일 감시가 지금 어디까지 되는지"를 즉시 실측하는 용도.
    """
    if not user.is_super_admin:
        raise HTTPException(403, "관리자만 감시를 실행할 수 있습니다.")

    from app.config import settings
    from app.services.secrets import get_secret
    from app.services.gmail_watcher import get_watch_account, watch_replies, watch_bounces

    account = get_watch_account()
    from_raw = (get_secret("gmail_from_email") or "").strip()
    bare_from = from_raw.split("<")[-1].rstrip(">").strip().lower()
    account_matches_from = None
    if account.get("ok") and bare_from:
        account_matches_from = (account.get("account") or "").lower() == bare_from

    # 대상 테넌트 — 활성 영업 테넌트 전체, 없으면 호출자 본인 워크스페이스로 폴백
    try:
        from app.services.tenants import list_active_outreach_tenants
        tenants = [t.get("id") for t in list_active_outreach_tenants() if t.get("id")]
    except Exception:
        tenants = []
    if not tenants and user.tenant_id:
        tenants = [user.tenant_id]

    results = []
    for tid in tenants:
        try:
            rep = watch_replies(tid, 30)
        except Exception as e:
            rep = {"ok": False, "error": str(e)[:200]}
        try:
            bo = watch_bounces(tid, 20)
        except Exception as e:
            bo = {"ok": False, "error": str(e)[:200]}
        results.append({"tenant_id": str(tid)[:8], "replies": rep, "bounces": bo})

    return {
        "enable_gmail_watcher": settings.enable_gmail_watcher,
        "watch_account": account,
        "from_email": bare_from or None,
        "account_matches_from": account_matches_from,
        "tenants_checked": len(results),
        "results": results,
    }


@router.get("/callback", response_class=HTMLResponse)
def callback(code: str = "", state: str = "", error: str = "") -> HTMLResponse:
    """Google 동의 후 콜백(공개). state로 CSRF 검증 → 코드 교환 → gmail_refresh_token 저장."""
    if error:
        return _page(f"연결 취소/실패: {error}", ok=False)
    if not _verify_state(state) or not code:
        return _page("유효하지 않은 요청입니다.", ok=False)

    from app.services.secrets import get_secret, upsert_secret
    client_id = get_secret("gmail_client_id")
    client_secret = get_secret("gmail_client_secret")
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
        logger.error("[oauth_gmail_watch] 토큰 교환 실패: %s", e)
        return _page("토큰 교환에 실패했습니다. client_secret / redirect URI를 확인하세요.", ok=False)

    refresh_token = tok.get("refresh_token")
    if not refresh_token:
        return _page(
            "refresh_token이 발급되지 않았습니다. "
            "(이미 연결된 계정이면 Google 계정 → 보안 → 서드파티 액세스에서 권한 제거 후 재시도)",
            ok=False,
        )

    upsert_secret("gmail_refresh_token", refresh_token, "oauth_token", "반송·회신 감시용 (재연결)")
    logger.info("[oauth_gmail_watch] 감시용 Gmail 재연결 완료 — refresh_token 갱신")
    return _page("Gmail 재연결이 완료되었습니다! 반송·회신 자동 감시가 다시 작동합니다.", ok=True)


def _page(msg: str, ok: bool = True) -> HTMLResponse:
    color = "#059669" if ok else "#dc2626"
    icon = "✓" if ok else "✕"
    html = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Gmail 재연결</title></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:60px 20px;text-align:center">
<div style="max-width:460px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 32px;box-shadow:0 2px 16px rgba(0,0,0,.06)">
<div style="font-size:44px;color:{color}">{icon}</div>
<h2 style="color:#1e293b;font-size:18px;margin:16px 0 8px">{msg}</h2>
<p style="color:#64748b;font-size:14px">이 창을 닫고 설정 페이지로 돌아가세요.</p>
</div></body></html>"""
    return HTMLResponse(content=html, status_code=200 if ok else 400)
