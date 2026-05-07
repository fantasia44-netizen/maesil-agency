"""
JWT 기반 인증 시스템.

역할:
  super_admin — 개발자(본인), 모든 기능
  customer    — 매실인사이트 대표자, 채팅만

토큰 흐름:
  POST /api/auth/login → JWT (30일)
  모든 요청: Authorization: Bearer <JWT>
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request

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


# ── FastAPI 의존성 ───────────────────────────────────────────────────
def get_current_user(request: Request) -> UserContext:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "인증 토큰이 필요합니다.")
    token = auth.split(" ", 1)[1].strip()
    payload = decode_token(token)
    return UserContext(
        id=payload["sub"],
        email=payload["email"],
        role=payload["role"],
        insight_operator_id=payload.get("insight_operator_id"),
        display_name=payload.get("display_name"),
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
