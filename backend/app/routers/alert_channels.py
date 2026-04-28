"""
감시 채널 CRUD — settings 페이지에서 등록/조회/수정/삭제.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_bearer
from app.db.autotool_client import get_autotool_client

router = APIRouter(prefix="/api/alert-channels", tags=["alert-channels"], dependencies=[Depends(require_bearer)])

ALLOWED_KINDS = {"email", "widget"}
ALLOWED_SEV = {"info", "warning", "error", "critical"}


def _table():
    return get_autotool_client().schema("agent_work").table("alert_channels")


class ChannelIn(BaseModel):
    kind: str = Field(..., description="'email' | 'widget'")
    target: str | None = None
    label: str | None = None
    severity_min: str = "error"
    is_active: bool = True
    notes: str | None = None


class ChannelPatch(BaseModel):
    target: str | None = None
    label: str | None = None
    severity_min: str | None = None
    is_active: bool | None = None
    notes: str | None = None


def _validate(kind: str, severity_min: str, target: str | None) -> None:
    if kind not in ALLOWED_KINDS:
        raise HTTPException(400, detail=f"kind must be one of {sorted(ALLOWED_KINDS)}")
    if severity_min not in ALLOWED_SEV:
        raise HTTPException(400, detail=f"severity_min must be one of {sorted(ALLOWED_SEV)}")
    if kind == "email" and not (target or "").strip():
        raise HTTPException(400, detail="email 채널은 target(수신 이메일)이 필수입니다")


@router.get("")
def list_channels() -> list[dict]:
    resp = _table().select("*").order("created_at", desc=False).execute()
    return resp.data or []


@router.post("")
def create_channel(body: ChannelIn) -> dict:
    _validate(body.kind, body.severity_min, body.target)
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "kind": body.kind,
        "target": (body.target or "").strip() or None,
        "label": (body.label or "").strip() or None,
        "severity_min": body.severity_min,
        "is_active": body.is_active,
        "notes": body.notes,
        "updated_at": now,
    }
    resp = _table().insert(payload).execute()
    rows = resp.data or []
    return rows[0] if rows else {"ok": True}


@router.patch("/{channel_id}")
def update_channel(channel_id: str, body: ChannelPatch) -> dict:
    update: dict = {}
    if body.target is not None:
        update["target"] = body.target.strip() or None
    if body.label is not None:
        update["label"] = body.label.strip() or None
    if body.severity_min is not None:
        if body.severity_min not in ALLOWED_SEV:
            raise HTTPException(400, detail=f"severity_min must be one of {sorted(ALLOWED_SEV)}")
        update["severity_min"] = body.severity_min
    if body.is_active is not None:
        update["is_active"] = body.is_active
    if body.notes is not None:
        update["notes"] = body.notes

    if not update:
        return {"ok": True, "noop": True}

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = _table().update(update).eq("id", channel_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, detail="channel not found")
    return rows[0]


@router.delete("/{channel_id}")
def delete_channel(channel_id: str) -> dict:
    _table().delete().eq("id", channel_id).execute()
    return {"ok": True}


@router.post("/{channel_id}/test")
def test_channel(channel_id: str) -> dict:
    """등록된 채널로 테스트 알림을 즉시 발송."""
    resp = _table().select("*").eq("id", channel_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, detail="channel not found")
    channel = rows[0]

    test_event = {
        "id": "test-event",
        "program_name": "(test)",
        "severity": "info",
        "title": "감시 채널 테스트",
        "message": "이 메시지가 보이면 채널이 정상 동작합니다.\n— maesil-agency",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # severity_min 검사 우회 (테스트는 항상 발송)
    from app.services.alert_dispatcher import _send_to_channel  # type: ignore
    result = _send_to_channel(test_event, channel)
    return {"ok": bool(result.get("ok")), "detail": result}
