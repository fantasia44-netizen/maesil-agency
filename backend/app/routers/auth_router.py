"""
인증 라우터.

POST /api/auth/login              — 이메일+비밀번호 → JWT
GET  /api/auth/me                 — 현재 로그인 유저 정보
POST /api/auth/setup              — 최초 super_admin 계정 생성 (users 테이블이 빈 경우만)
POST /api/auth/users              — super_admin이 customer 계정 생성
PATCH /api/auth/users/{id}        — super_admin이 계정 수정 (operator_id 연결 등)
GET  /api/auth/users              — super_admin이 전체 유저 목록 조회
POST /api/auth/invites            — super_admin이 초대 링크 토큰 생성 (7일 유효)
GET  /api/auth/invites/check/{t}  — 토큰 유효성 검증 (공개)
POST /api/auth/join               — 초대 토큰으로 계정 생성 (공개)
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import (
    UserContext,
    create_token,
    get_current_user,
    get_user_by_email,
    hash_password,
    invalidate_revalidate_cache,
    require_admin,
    verify_password,
)
from app.config import settings
from app.db.maesil_total_client import get_maesil_total_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─────────────────────────────────────────────────────────────────
# 로그인 무차별 대입 방어 (인메모리). LOGIN_MAX_ATTEMPTS=0 이면 비활성.
# ─────────────────────────────────────────────────────────────────
_login_fail: dict[str, list[float]] = {}   # key → 실패 시각 목록
_login_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _login_key(request: Request, email: str) -> str:
    return f"{_client_ip(request)}|{(email or '').lower().strip()}"


def _login_check_locked(key: str) -> None:
    if settings.login_max_attempts <= 0:
        return
    window = settings.login_lockout_minutes * 60
    now = time.monotonic()
    with _login_lock:
        fails = [t for t in _login_fail.get(key, []) if now - t < window]
        _login_fail[key] = fails
        if len(fails) >= settings.login_max_attempts:
            raise HTTPException(
                429, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요."
            )


def _login_record_fail(key: str) -> None:
    if settings.login_max_attempts <= 0:
        return
    with _login_lock:
        _login_fail.setdefault(key, []).append(time.monotonic())


def _login_reset(key: str) -> None:
    with _login_lock:
        _login_fail.pop(key, None)


def _hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _users_table():
    return get_maesil_total_client().schema("agent_work").table("users")


def _snapshots_table():
    return get_maesil_total_client().schema("agent_work").table("snapshots")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────────
# 초대 링크 (invite token)
# ─────────────────────────────────────────────────────────────────

def _find_invite(token: str) -> dict | None:
    """유효한 invite 토큰 row 반환. 만료/사용됨/없음이면 None.

    신규: payload.token_hash(sha256) 와 비교.
    레거시: payload.token(평문) 도 호환 비교.
    """
    if not token or len(token) < 16:
        return None
    token_hash = _hash_invite_token(token)
    now_iso = _now()
    resp = _snapshots_table().select("*").eq("kind", "invite").gt("valid_until", now_iso).execute()
    for row in (resp.data or []):
        payload = row.get("payload") or {}
        if payload.get("used_at"):
            continue
        stored_hash = payload.get("token_hash") or ""
        if stored_hash and hmac.compare_digest(str(stored_hash), token_hash):
            return row
        legacy = payload.get("token") or ""   # 레거시 평문 호환
        if legacy and hmac.compare_digest(str(legacy), str(token)):
            return row
    return None


class InviteCreateRequest(BaseModel):
    role: str = "customer"  # 최소권한 기본값. super_admin 초대는 명시적으로 지정.


class JoinRequest(BaseModel):
    token: str
    email: str
    password: str
    display_name: str | None = None


@router.post("/invites")
def create_invite(body: InviteCreateRequest, admin: UserContext = Depends(require_admin)) -> dict:
    """초대 링크 토큰 생성 (7일 유효). super_admin 전용."""
    if body.role not in ("super_admin", "customer"):
        raise HTTPException(400, "role은 'super_admin' 또는 'customer'")

    token = secrets.token_urlsafe(24)
    valid_until = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    # 토큰은 해시만 저장(DB 유출 시에도 토큰 재사용 불가). 평문은 응답으로 1회만 반환.
    _snapshots_table().insert({
        "agent_type": "system",
        "kind": "invite",
        "payload": {
            "token_hash": _hash_invite_token(token),
            "role": body.role,
            "created_by": admin.email,
        },
        "valid_until": valid_until,
        "created_at": _now(),
    }).execute()

    return {"token": token, "role": body.role, "valid_until": valid_until}


@router.get("/invites/check/{token}")
def check_invite(token: str) -> dict:
    """토큰 유효성 검증 — 공개 엔드포인트."""
    row = _find_invite(token)
    if not row:
        raise HTTPException(404, "유효하지 않거나 만료된 초대 링크입니다.")
    payload = row.get("payload") or {}
    return {"valid": True, "role": payload.get("role", "customer")}


@router.post("/join")
def join(body: JoinRequest) -> dict:
    """초대 토큰으로 계정 생성 — 공개 엔드포인트.

    동시 join race를 막기 위해 user 생성 전에 invite를 먼저 used_at으로 마킹하고,
    그 결과 row의 used_at가 본인이 찍은 것이 맞을 때만 진행한다.
    """
    row = _find_invite(body.token)
    if not row:
        raise HTTPException(404, "유효하지 않거나 만료된 초대 링크입니다.")

    if not body.email.strip():
        raise HTTPException(400, "이메일을 입력하세요.")
    if len(body.password) < 8:
        raise HTTPException(400, "비밀번호는 8자 이상이어야 합니다.")

    payload = dict(row.get("payload") or {})
    if payload.get("used_at"):
        raise HTTPException(409, "이미 사용된 초대 링크입니다.")

    # ── 1) invite 선점: payload.used_at 마킹 + valid_until 과거화
    claim_id = secrets.token_urlsafe(16)
    now = _now()
    past = datetime(2000, 1, 1, tzinfo=timezone.utc).isoformat()
    payload["used_at"] = now
    payload["claim_id"] = claim_id
    claim_resp = (
        _snapshots_table()
        .update({"payload": payload, "valid_until": past})
        .eq("id", row["id"])
        .is_("payload->>used_at", "null")  # 다른 동시 요청이 먼저 마킹했으면 0 row 갱신
        .execute()
    )
    claimed_rows = claim_resp.data or []
    if not claimed_rows:
        raise HTTPException(409, "이미 사용된 초대 링크입니다.")
    claimed = claimed_rows[0]
    claimed_payload = claimed.get("payload") or {}
    if claimed_payload.get("claim_id") != claim_id:
        # 동시성: 누군가 한 ms 차이로 먼저 선점함
        raise HTTPException(409, "이미 사용된 초대 링크입니다.")

    # ── 2) 이메일 중복 체크 (선점 후)
    if get_user_by_email(body.email):
        raise HTTPException(409, "이미 사용 중인 이메일입니다.")

    role = claimed_payload.get("role", "customer")
    if role not in ("super_admin", "customer"):
        raise HTTPException(500, "초대 link role 설정 오류")

    new_row = {
        "email":         body.email.lower().strip(),
        "password_hash": hash_password(body.password),
        "role":          role,
        "display_name":  body.display_name or None,
        "is_active":     True,
        "created_at":    now,
        "updated_at":    now,
    }
    resp = _users_table().insert(new_row).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(500, "계정 생성 실패")

    user = rows[0]
    token_jwt = create_token(user)
    return {
        "ok": True,
        "token": token_jwt,
        "email": user["email"],
        "role": user["role"],
        "display_name": user.get("display_name"),
    }


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
def login(body: LoginRequest, request: Request) -> LoginResponse:
    lk = _login_key(request, body.email)
    _login_check_locked(lk)

    user = get_user_by_email(body.email)
    if not user:
        _login_record_fail(lk)
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    if not user.get("is_active", True):
        raise HTTPException(403, "비활성화된 계정입니다. 관리자에게 문의하세요.")
    if not verify_password(body.password, user["password_hash"]):
        _login_record_fail(lk)
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")

    _login_reset(lk)

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
        "tenant_id": user.tenant_id,
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
    invalidate_revalidate_cache(user_id)  # 비활성화/강등 즉시 반영
    rows[0].pop("password_hash", None)
    return rows[0]


@router.get("/users")
def list_users(admin: UserContext = Depends(require_admin)) -> list[dict]:
    resp = _users_table().select(
        "id, email, role, display_name, insight_operator_id, is_active, last_login_at, created_at"
    ).order("created_at").execute()
    return resp.data or []
