"""바이어발굴 API — 해외 B2B 바이어 리드 관리.

GET    /api/buyers              — 바이어 목록
POST   /api/buyers              — 바이어 수동 추가
POST   /api/buyers/import       — CSV 일괄 업로드
PATCH  /api/buyers/{id}         — 상태/정보 수정
DELETE /api/buyers/{id}         — 삭제
POST   /api/buyers/{id}/contact — 이메일 발송 (Gmail API)
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/buyers", tags=["buyers"])

STATUSES = {"discovered", "contacted", "replied", "negotiating", "deal", "rejected"}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


@router.get("")
def list_buyers(
    limit: int = Query(100, le=500),
    offset: int = 0,
    status: Optional[str] = None,
    country: Optional[str] = None,
    q: Optional[str] = None,
    user: UserContext = Depends(_require_admin),
) -> dict:
    query = (_db().table("buyer_leads")
             .select("*")
             .order("created_at", desc=True))
    if status:
        query = query.eq("status", status)
    if country:
        query = query.eq("country", country)
    if q:
        query = query.ilike("company_name", f"%{q}%")

    total_resp = (_db().table("buyer_leads").select("id", count="exact").execute())
    rows = query.range(offset, offset + limit - 1).execute().data or []
    return {"rows": rows, "total": total_resp.count or 0}


class BuyerCreate(BaseModel):
    company_name: str
    country: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    industry: Optional[str] = None
    product_interest: Optional[str] = None
    source: str = "manual"  # manual | apollo | csv | kotra
    notes: Optional[str] = None


@router.post("", status_code=201)
def create_buyer(body: BuyerCreate, user: UserContext = Depends(_require_admin)) -> dict:
    row = {
        **body.model_dump(),
        "status": "discovered",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    resp = _db().table("buyer_leads").insert(row).execute()
    return (resp.data or [{}])[0]


@router.post("/import", status_code=201)
async def import_csv(
    file: UploadFile = File(...),
    user: UserContext = Depends(_require_admin),
) -> dict:
    """CSV 컬럼: company_name, country, contact_name, contact_email, contact_title, industry, product_interest"""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    for row in reader:
        if not row.get("company_name"):
            continue
        rows.append({
            "company_name": row.get("company_name", "").strip(),
            "country": row.get("country", "").strip(),
            "contact_name": row.get("contact_name", "").strip() or None,
            "contact_email": row.get("contact_email", "").strip() or None,
            "contact_title": row.get("contact_title", "").strip() or None,
            "industry": row.get("industry", "").strip() or None,
            "product_interest": row.get("product_interest", "").strip() or None,
            "source": "csv",
            "status": "discovered",
            "created_at": now,
            "updated_at": now,
        })
    if not rows:
        raise HTTPException(400, "유효한 행 없음 (company_name 필수)")

    inserted = 0
    for i in range(0, len(rows), 100):
        _db().table("buyer_leads").insert(rows[i:i+100]).execute()
        inserted += len(rows[i:i+100])
    return {"inserted": inserted}


class BuyerPatch(BaseModel):
    status: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None


@router.patch("/{buyer_id}")
def patch_buyer(buyer_id: str, body: BuyerPatch,
                user: UserContext = Depends(_require_admin)) -> dict:
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "변경 항목 없음")
    if "status" in upd and upd["status"] not in STATUSES:
        raise HTTPException(400, f"status: {STATUSES}")
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    _db().table("buyer_leads").update(upd).eq("id", buyer_id).execute()
    return {"ok": True}


@router.delete("/{buyer_id}", status_code=204)
def delete_buyer(buyer_id: str, user: UserContext = Depends(_require_admin)) -> None:
    _db().table("buyer_leads").delete().eq("id", buyer_id).execute()


# ── 자동 발굴 ────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    keywords: list[str]                      # ["korean food", "k-beauty"]
    countries: list[str] | None = None       # ["USA", "Japan", "Germany"] — None이면 전체
    sources: list[str] | None = None         # ["ec21", "tradekey", "europages", "exporthub", "importyeti"]
    limit_per_source: int = 30


@router.post("/scan")
def trigger_scan(body: ScanRequest, user: UserContext = Depends(_require_admin)) -> dict:
    """무료 소스에서 국가별 바이어 자동 발굴."""
    from app.services.buyer_scanner import scan_buyers

    if not body.keywords:
        raise HTTPException(400, "keywords 최소 1개 필요")

    import threading
    result_holder: dict = {}

    def run():
        try:
            result_holder.update(scan_buyers(
                keywords=body.keywords,
                countries=body.countries,
                sources=body.sources,
                limit_per_source=body.limit_per_source,
            ))
        except Exception as e:
            result_holder["error"] = str(e)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout=180)

    return result_holder if result_holder else {"status": "scanning", "message": "백그라운드 실행 중"}
