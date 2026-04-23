"""
Settings 페이지에서 시스템 키를 등록/조회/테스트하는 API.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services import secrets as secrets_svc
from app.auth import require_bearer

router = APIRouter(prefix="/api/secrets", tags=["secrets"], dependencies=[Depends(require_bearer)])


class SecretUpsert(BaseModel):
    name: str
    value: str
    kind: str
    notes: str | None = None


@router.get("")
def list_secrets() -> list[dict]:
    return secrets_svc.list_secrets_masked()


@router.put("")
def upsert_secret(body: SecretUpsert) -> dict:
    if not body.name or not body.value or not body.kind:
        raise HTTPException(status_code=400, detail="name, value, kind are required")
    secrets_svc.upsert_secret(body.name, body.value, body.kind, body.notes)

    # maesil-insight Supabase URL이 등록되면 db_registry에도 동기화
    if body.name == "maesil_insight_supabase_url":
        try:
            from app.db.autotool_client import get_autotool_client
            get_autotool_client().schema("agent_work").table("db_registry").update({
                "supabase_url": body.value,
            }).eq("name", "maesil-insight").execute()
        except Exception:
            pass

    return {"ok": True}


@router.post("/{name}/test")
def test_secret(name: str) -> dict:
    """
    Phase 1 스텁: 실제 연결 테스트는 Phase 2에서 kind별로 구현.
    (render: services list 호출 / supabase: from("_health").select 등)
    """
    value = secrets_svc.get_secret(name)
    if value is None:
        raise HTTPException(status_code=404, detail="secret not found")
    # TODO(Phase 2): kind별 실제 테스트
    secrets_svc.mark_tested(name, ok=True, error=None)
    return {"ok": True, "note": "stub — 실제 검증은 Phase 2에서 구현"}
