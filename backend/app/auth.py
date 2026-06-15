"""
JWT 기반 인증 시스템.

역할:
  super_admin — 개발자(본인), 모든 기능
  customer    — 매실인사이트 대표자, 채팅만

토큰 흐름:
  POST /api/auth/login → JWT (7일)
  모든 요청: Authorization: Bearer <JWT>

AUTH_REVALIDATE=1(기본)이면 매 요청마다 DB에서 is_active/role 을 재확인하므로
계정 비활성화·권한 강등이 토큰 만료를 기다리지 않고 즉시 반영됩니다.
(AUTH_REVALIDATE_CACHE_TTL 초 단위 캐시로 DB 부하 완화.)
"""
from __future__ import annotations

import os
import threading
import time
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request

from app.config import settings

# passlib 1.7.4 + bcrypt 4.x 호환 패치 (bcrypt.__about__ 제거됨)
try:
    import bcrypt as _bcrypt_mod
    if not hasattr(_bcrypt_mod, "__about__"):
        _bcrypt_mod.__about__ = type("_about", (), {"__version__": _bcrypt_mod.__version__})()
except Exception:
    pass

from passlib.context import CryptContext

from app.db.maesil_total_client import get_maesil_total_client

# ── 설정 ────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET 환경변수가 비어 있거나 너무 짧습니다(32자 이상 필요). "
        "Render 환경변수에 강력한 시크릿을 설정하세요."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── 유저 컨텍스트 ────────────────────────────────────────────────────
class UserContext:
    def __init__(
        self,
        id: str,
        email: str,
        role: str,
        insight_operator_id: str | None,
        display_name: str | None = None,
    ):
        self.id = id
        self.email = email
        self.role = role
        self.insight_operator_id = insight_operator_id  # 데이터 격리 키
        self.display_name = display_name

    @property
    def is_super_admin(self) -> bool:
        return self.role == "super_admin"

    @property
    def operator_id(self) -> str | None:
        """에이전트 쿼리용 operator_id.
        super_admin은 secrets 테이블의 기본값 사용, customer는 본인 insight_operator_id."""
        return self.insight_operator_id


# ── 비밀번호 ────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ─────────────────────────────────────────────────────────────
def create_token(user_row: dict) -> str:
    payload = {
        "sub":                  str(user_row["id"]),
        "email":                user_row["email"],
        "role":                 user_row["role"],
        "insight_operator_id":  str(user_row["insight_operator_id"])
                                if user_row.get("insight_operator_id") else None,
        "display_name":         user_row.get("display_name"),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "토큰이 만료되었습니다. 다시 로그인하세요.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "유효하지 않은 토큰입니다.")


# ── DB 헬퍼 ─────────────────────────────────────────────────────────
def _users_table():
    return get_maesil_total_client().schema("agent_work").table("users")


def get_user_by_email(email: str) -> dict | None:
    resp = _users_table().select("*").eq("email", email.lower().strip()).limit(1).execute()
    rows = resp.data or []
    return rows[0] if rows else None


# ── 사용자 상태 재검증 캐시 (id → (row, expire_at)) ──────────────────
_revalidate_cache: dict[str, tuple[dict | None, float]] = {}
_revalidate_lock = threading.Lock()


def _fresh_user_row(user_id: str) -> dict | None:
    """DB에서 사용자 현재 상태 조회(짧은 TTL 캐시)."""
    ttl = max(0, settings.auth_revalidate_cache_ttl)
    now = time.monotonic()
    if ttl:
        with _revalidate_lock:
            entry = _revalidate_cache.get(user_id)
            if entry and now < entry[1]:
                return entry[0]
    try:
        resp = (
            _users_table()
            .select("id, role, is_active, insight_operator_id, display_name")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        row = rows[0] if rows else None
    except Exception:
        # DB 일시 장애 시 토큰만으로 통과(가용성 우선). None 반환 대신 신호용 sentinel.
        return {"__db_error__": True}
    if ttl:
        with _revalidate_lock:
            _revalidate_cache[user_id] = (row, now + ttl)
    return row


def invalidate_revalidate_cache(user_id: str | None = None) -> None:
    with _revalidate_lock:
        if user_id is None:
            _revalidate_cache.clear()
        else:
            _revalidate_cache.pop(user_id, None)


# ── FastAPI 의존성 ───────────────────────────────────────────────────
def get_current_user(request: Request) -> UserContext:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "인증 토큰이 필요합니다.")
    token = auth.split(" ", 1)[1].strip()
    payload = decode_token(token)

    user_id = payload["sub"]
    role = payload["role"]
    insight_operator_id = payload.get("insight_operator_id")
    display_name = payload.get("display_name")

    # 매 요청 재검증: 비활성화/권한변경 즉시 반영 (AUTH_REVALIDATE=0 이면 생략)
    if settings.auth_revalidate:
        row = _fresh_user_row(user_id)
        if row is None:
            raise HTTPException(401, "계정을 찾을 수 없습니다. 다시 로그인하세요.")
        if not row.get("__db_error__"):
            if not row.get("is_active", True):
                raise HTTPException(403, "비활성화된 계정입니다. 관리자에게 문의하세요.")
            # DB의 현재 값으로 갱신(토큰 페이로드보다 우선)
            role = row.get("role", role)
            insight_operator_id = (
                str(row["insight_operator_id"]) if row.get("insight_operator_id") else None
            )
            display_name = row.get("display_name", display_name)

    return UserContext(
        id=user_id,
        email=payload["email"],
        role=role,
        insight_operator_id=insight_operator_id,
        display_name=display_name,
    )


def require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    """super_admin 전용 라우트에 사용."""
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")
    return user


# 기존 routers가 Depends(require_bearer)를 사용하므로 호환성 유지
# → require_admin으로 동작 (super_admin만 허용)
def require_bearer(request: Request) -> None:
    """하위 호환: 기존 admin 라우터가 사용. require_admin과 동일."""
    user = get_current_user(request)
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다.")
