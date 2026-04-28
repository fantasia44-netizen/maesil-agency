"""
인증 라우터.

POST /api/auth/login    — 이메일+비밀번호 → JWT
GET  /api/auth/me       — 현재 로그인 유저 정보
POST /api/auth/setup    — 최초 super_admin 계정 생성 (users 테이블이 빈 경우만)
POST /api/auth/users    — super_admin이 customer 계정 생성
PATCH /api/auth/users/{id} — super_admin이 계정 수정 (operator_id 연결 등)
GET  /api/auth/users    — super_admin이 전체 유저 목록 조회
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import (
    UserContext,
    create_token,
    get_current_user,
    get_user_by_email,
    hash_password,
    require_admin,
    verify_password,
)
from app.db.maesil_total_client import get_maesil_total_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _users_table():
    return get_maesil_total_client().schema("agent_work").table("users")


# ─────────────────────────────────────────────────────────────────
# 로그인
# ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    email: str
    display_name: str | None
    insight_operator_id: str | None


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    if not user.get("is_active", True):
        raise HTTPException(403, "비활성화된 계정입니다. 관리자에게 문의하세요.")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")

    # last_login_at 갱신
    try:
        _users_table().update({"last_login_at": datetime.now(timezone.utc).isoformat()}).eq("id", user["id"]).execute()
    except Exception:
        pass

    token = create_token(user)
    return LoginResponse(
        token=token,
        role=user["role"],
        email=user["email"],
        display_name=user.get("display_name"),
        insight_operator_id=str(user["insight_operator_id"]) if user.get("insight_operator_id") else None,
    )


# ─────────────────────────────────────────────────────────────────
# 내 정보
# ─────────────────────────────────────────────────────────────────

@router.get("/me")
def me(user: UserContext = Depends(get_current_user)) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "display_name": user.display_name,
        "insight_operator_id": user.insight_operator_id,
        "is_super_admin": user.is_super_admin,
    }


# ─────────────────────────────────────────────────────────────────
# 최초 super_admin 계정 생성 (users 테이블이 완전히 비어 있을 때만)
# ─────────────────────────────────────────────────────────────────

class SetupRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


@router.post("/setup")
def setup(body: SetupRequest) -> dict:
    """최초 1회만 허용. users 테이블에 계정이 하나라도 있으면 거부."""
    count_resp = _users_table().select("id", count="exact").execute()
    if (count_resp.count or 0) > 0:
        raise HTTPException(403, "이미 계정이 존재합니다. /api/auth/login을 사용하세요.")

    if len(body.password) < 8:
        raise HTTPException(400, "비밀번호는 8자 이상이어야 합니다.")

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "email":         body.email.lower().strip(),
        "password_hash": hash_password(body.password),
        "role":          "super_admin",
        "display_name":  body.display_name or "관리자",
        "is_active":     True,
        "created_at":    now,
        "updated_at":    now,
    }
    resp = _users_table().insert(row).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(500, "계정 생성 실패")

    user = rows[0]
    token = create_token(user)
    return {"ok": True, "token": token, "email": user["email"], "role": user["role"]}


# ─────────────────────────────────────────────────────────────────
# 유저 관리 (super_admin 전용)
# ─────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "customer"
    display_name: str | None = None
    insight_operator_id: str | None = None  # 매실인사이트 operator_id


class PatchUserRequest(BaseModel):
    display_name: str | None = None
    insight_operator_id: str | None = None
    is_active: bool | None = None
    password: str | None = None


@router.post("/users")
def create_user(body: CreateUserRequest, admin: UserContext = Depends(require_admin)) -> dict:
    if body.role not in ("super_admin", "customer"):
        raise HTTPException(400, "role은 'super_admin' 또는 'customer'")
    if len(body.password) < 8:
        raise HTTPException(400, "비밀번호는 8자 이상")
    if get_user_by_email(body.email):
        raise HTTPException(409, "이미 사용 중인 이메일입니다.")

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "email":                body.email.lower().strip(),
        "password_hash":        hash_password(body.password),
        "role":                 body.role,
        "display_name":         body.display_name,
        "insight_operator_id":  body.insight_operator_id,
        "is_active":            True,
        "created_by":           admin.id,
        "created_at":           now,
        "updated_at":           now,
    }
    resp = _users_table().insert(row).execute()
    rows = resp.data or []
    created = rows[0] if rows else row
    created.pop("password_hash", None)
    return created


@router.patch("/users/{user_id}")
def patch_user(user_id: str, body: PatchUserRequest, admin: UserContext = Depends(require_admin)) -> dict:
    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.display_name is not None:
        update["display_name"] = body.display_name
    if body.insight_operator_id is not None:
        update["insight_operator_id"] = body.insight_operator_id or None
    if body.is_active is not None:
        update["is_active"] = body.is_active
    if body.password:
        if len(body.password) < 8:
            raise HTTPException(400, "비밀번호는 8자 이상")
        update["password_hash"] = hash_password(body.password)

    resp = _users_table().update(update).eq("id", user_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "user not found")
    rows[0].pop("password_hash", None)
    return rows[0]


@router.get("/users")
def list_users(admin: UserContext = Depends(require_admin)) -> list[dict]:
    resp = _users_table().select(
        "id, email, role, display_name, insight_operator_id, is_active, last_login_at, created_at"
    ).order("created_at").execute()
    return resp.data or []
