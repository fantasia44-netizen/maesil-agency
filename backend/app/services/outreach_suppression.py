"""
outreach_suppression.py — 영업 이메일 수신거부/차단 + 컴플라이언스 헬퍼.

정보통신망법 대응:
  - (광고) 제목 표기
  - 전송자 정보 + 수신거부 수단(링크/회신) 본문 명시
  - 수신거부/차단 목록(suppression) 발송 전 차단
  - 야간(21~08시 KST) 자동 발송 보류

수신거부 링크 토큰은 JWT_SECRET 기반 HMAC 서명(상태 비저장, 위변조 방지).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone

from app.config import settings

logger = logging.getLogger(__name__)

TABLE = "outreach_suppression"
SCHEMA = "agent_work"
_KST = timezone(timedelta(hours=9))


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema(SCHEMA)


def _secret() -> bytes:
    return os.environ.get("JWT_SECRET", "").encode()


def _norm(email: str) -> str:
    return (email or "").strip().lower()


# ── 수신거부 토큰 (상태 비저장 HMAC) ───────────────────────────────────
def make_unsub_token(tenant_id: str, email: str) -> str:
    """HMAC 서명 unsub 토큰. payload=tenant_id|email (콜백에서 테넌트 복원)."""
    e = _norm(email)
    payload = f"{tenant_id}|{e}"
    b = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()[:24]
    return f"{b}.{sig}"


def verify_unsub_token(token: str) -> tuple[str | None, str] | None:
    """반환: (tenant_id, email). 구 토큰(email만)은 tenant_id=None (레거시 하위호환)."""
    try:
        b, sig = (token or "").split(".", 1)
        pad = "=" * (-len(b) % 4)
        payload = base64.urlsafe_b64decode(b + pad).decode()
        expected = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()[:24]
        if not hmac.compare_digest(sig, expected):
            return None
        if "|" in payload:
            tid, email = payload.split("|", 1)
            return (tid, email)
        return (None, payload)  # 구 토큰 — 이미 발송된 메일의 링크
    except Exception:
        return None


def unsubscribe_link(tenant_id: str, email: str) -> str | None:
    base = (settings.unsubscribe_base_url or "").rstrip("/")
    if not base:
        return None
    return f"{base}/api/outreach/unsubscribe?token={make_unsub_token(tenant_id, email)}"


# ── suppression 목록 ──────────────────────────────────────────────────
def is_suppressed(tenant_id: str, email: str) -> bool:
    e = _norm(email)
    if not e:
        return False
    try:
        resp = _db().table(TABLE).select("email").eq("tenant_id", tenant_id).eq("email", e).limit(1).execute()
        return bool(resp.data)
    except Exception as ex:
        msg = str(ex).lower()
        # 테이블 자체가 없으면(마이그레이션 037 미실행) 수신거부 기록도 없음 → 발송 허용
        if ("pgrst205" in msg or "42p01" in msg or "schema cache" in msg
                or "does not exist" in msg or "could not find" in msg):
            logger.warning("suppression 테이블 미존재(037 미실행?) — 발송 허용: %s", ex)
            return False
        # 그 외(네트워크/타임아웃 등) 일시 오류는 보수적으로 차단 → 스팸 리스크 최소화
        logger.warning("is_suppressed 조회 실패 [%s]: %s — 안전상 발송 차단", e, ex)
        return True


def add_suppression(tenant_id: str, email: str, reason: str = "unsubscribe",
                    source: str = "link", note: str | None = None) -> bool:
    e = _norm(email)
    if not e:
        return False
    now = datetime.now(timezone.utc).isoformat()
    try:
        _db().table(TABLE).upsert(
            {"tenant_id": tenant_id, "email": e, "reason": reason, "source": source,
             "note": note, "created_at": now},
            on_conflict="tenant_id,email",
        ).execute()
        # 해당 테넌트의 같은 이메일 리드 상태도 전환 → 이후 팔로업 차단
        new_status = "blocked" if reason == "blocked" else "unsubscribe"
        try:
            _db().table("outreach_leads").update(
                {"status": new_status, "updated_at": now}
            ).eq("tenant_id", tenant_id).eq("contact_email", e).execute()
        except Exception as ex:
            logger.warning("리드 상태 전환 실패 [%s]: %s", e, ex)
        logger.info("suppression 추가 [%s] reason=%s source=%s", e, reason, source)
        return True
    except Exception as ex:
        logger.error("add_suppression 실패 [%s]: %s", e, ex)
        return False


# ── 컴플라이언스 헬퍼 ─────────────────────────────────────────────────
def with_ad_subject(subject: str) -> str:
    """제목 맨 앞 '(광고)' 표기 (이미 있으면 유지)."""
    if not settings.outreach_ad_prefix:
        return subject
    s = subject or ""
    return s if s.lstrip().startswith("(광고)") else f"(광고) {s}"


def compliance_footer_html(tenant_id: str, email: str) -> str:
    """전송자 정보 + 수신거부 수단 표준 푸터."""
    import html as _html
    sender = _html.escape(settings.outreach_sender_info or "매실인사이트")
    link = unsubscribe_link(tenant_id, email)
    if link:
        # 발신이 noreply + 카톡 유도 모델 → 회신 안내 제거, 링크 전용
        unsub = f'수신거부: <a href="{link}" target="_blank" rel="noopener">클릭</a>'
    else:
        unsub = '수신을 원치 않으시면 본 메일에 "수신거부"라고 회신해 주세요.'
    return (
        '<div style="margin-top:24px;padding:16px 20px;border-top:1px solid #e5e7eb;'
        'font-size:11.5px;color:#9ca3af;line-height:1.7;text-align:center">'
        '본 메일은 공개된 비즈니스 연락처로 발송된 광고성 제휴 제안입니다.<br>'
        f'보내는 사람: {sender}<br>{unsub}'
        '</div>'
    )


def inject_compliance_footer(tenant_id: str, html: str, email: str) -> str:
    """HTML 본문에 컴플라이언스 푸터 삽입(</body> 직전, 없으면 끝에 추가)."""
    footer = compliance_footer_html(tenant_id, email)
    if "</body>" in html:
        return html.replace("</body>", footer + "</body>", 1)
    return html + footer


def inject_open_pixel(html: str, lead_id: str) -> str:
    """이메일 오픈 추적 픽셀 삽입 (</body> 직전)."""
    base = (settings.unsubscribe_base_url or "").rstrip("/")
    if not base or not lead_id:
        return html
    pixel = f'<img src="{base}/api/outreach/px?lid={lead_id}" width="1" height="1" alt="" style="display:none">'
    if "</body>" in html:
        return html.replace("</body>", pixel + "</body>", 1)
    return html + pixel


def is_quiet_hours(now: datetime | None = None) -> bool:
    """KST 기준 21:00~08:00 이면 True (자동 발송 보류 시간대)."""
    if not settings.outreach_quiet_hours:
        return False
    h = (now or datetime.now(_KST)).astimezone(_KST).hour
    return h >= 21 or h < 8
