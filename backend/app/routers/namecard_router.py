"""명함 리드 API — 사진 업로드 → Claude 비전 추출 → 자동 등록.

POST   /api/namecard/upload         — 명함 사진 업로드 → 추출 후 자동 등록
GET    /api/namecard/leads          — 명함 리드 목록
PATCH  /api/namecard/leads/{id}     — 수정(단계·모드·필드)
DELETE /api/namecard/leads/{id}     — 삭제
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.auth import UserContext, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/namecard", tags=["namecard"])

STAGES = {"new", "contacted", "replied", "deal", "archived"}
MODES = {"manual", "auto"}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_tid(user: UserContext) -> str:
    if not user.tenant_id:
        raise HTTPException(403, "연결된 워크스페이스가 없습니다.")
    return user.tenant_id


@router.post("/upload")
async def upload_namecard(
    file: UploadFile = File(...),
    event_name: str = Form(""),
    mode: str = Form("manual"),
    user: UserContext = Depends(get_current_user),
) -> dict:
    """명함 사진 → 추출 → namecard_leads 자동 등록. 등록된 리드 반환."""
    tid = _require_tid(user)
    if mode not in MODES:
        mode = "manual"
    image_bytes = await file.read()
    media_type = file.content_type or "image/jpeg"

    from app.services.namecard_service import extract_namecard
    extracted = extract_namecard(image_bytes, media_type, tid)
    if extracted.get("error"):
        raise HTTPException(422, extracted["error"])

    row = {
        "tenant_id": tid,
        "person_name": extracted.get("person_name") or None,
        "company_name": extracted.get("company_name") or None,
        "title": extracted.get("title") or None,
        "email": extracted.get("email") or None,
        "phone": extracted.get("phone") or None,
        "address": extracted.get("address") or None,
        "website": extracted.get("website") or None,
        "ai_memo": extracted.get("ai_memo") or None,
        "raw_extracted": extracted.get("raw_extracted") or {},
        "event_name": event_name.strip() or None,
        "source": "namecard",
        "mode": mode,
        "stage": "new",
    }
    try:
        resp = _db().table("namecard_leads").insert(row).execute()
        return (resp.data or [row])[0]
    except Exception as e:
        logger.error("[namecard] 등록 실패: %s", e)
        raise HTTPException(500, f"등록 실패: {e}")


@router.get("/leads")
def list_namecard_leads(
    stage: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    tid = _require_tid(user)
    q = (_db().table("namecard_leads").select("*")
         .eq("tenant_id", tid).order("created_at", desc=True).limit(2000))
    if stage:
        q = q.eq("stage", stage)
    return q.execute().data or []


class NamecardPatch(BaseModel):
    person_name: Optional[str] = None
    company_name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    ai_memo: Optional[str] = None
    event_name: Optional[str] = None
    mode: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/leads/{lead_id}")
def update_namecard_lead(
    lead_id: str, body: NamecardPatch,
    user: UserContext = Depends(get_current_user),
) -> dict:
    tid = _require_tid(user)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "수정할 필드가 없습니다.")
    if "mode" in update and update["mode"] not in MODES:
        raise HTTPException(400, f"mode는 {sorted(MODES)} 중 하나")
    if "stage" in update and update["stage"] not in STAGES:
        raise HTTPException(400, f"stage는 {sorted(STAGES)} 중 하나")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (_db().table("namecard_leads").update(update)
            .eq("tenant_id", tid).eq("id", lead_id).execute())
    if not resp.data:
        raise HTTPException(404, "명함 리드를 찾을 수 없습니다.")
    return resp.data[0]


@router.delete("/leads/{lead_id}")
def delete_namecard_lead(
    lead_id: str, user: UserContext = Depends(get_current_user),
) -> dict:
    tid = _require_tid(user)
    _db().table("namecard_leads").delete().eq("tenant_id", tid).eq("id", lead_id).execute()
    return {"ok": True}
