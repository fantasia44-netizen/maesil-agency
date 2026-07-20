"""재무센터 API — (주)매실패밀리 부가세 신고자료 (super_admin 전용).

maesil-total(해서물산) 회계와 데이터 완전 분리 — agent_work.finance_* 만 사용.

POST   /api/finance/uploads/tax-invoice   — 홈택스 전자(세금)계산서 엑셀 업로드
GET    /api/finance/uploads               — 업로드 이력
DELETE /api/finance/uploads/{id}          — 업로드 배치 롤백 (해당 배치 계산서 삭제)
GET    /api/finance/tax-invoices          — 계산서 목록 (분기/방향 필터)
PATCH  /api/finance/tax-invoices/{id}     — 매입 공제/불공제 토글
GET    /api/finance/vat-summary           — 분기 부가세 집계 (매출세액-매입세액=납부세액)
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/finance", tags=["finance"])

_QUARTER_RANGE = {
    1: ("01-01", "03-31"), 2: ("04-01", "06-30"),
    3: ("07-01", "09-30"), 4: ("10-01", "12-31"),
}
# 법인 일반과세: 분기별 신고 (예정/확정)
_QUARTER_LABEL = {1: "1기 예정", 2: "1기 확정", 3: "2기 예정", 4: "2기 확정"}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


def _quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    if quarter not in _QUARTER_RANGE:
        raise HTTPException(400, "quarter는 1~4 사이여야 합니다.")
    a, b = _QUARTER_RANGE[quarter]
    return f"{year}-{a}", f"{year}-{b}"


# ── 업로드 ────────────────────────────────────────────────────────────

@router.post("/uploads/tax-invoice")
async def upload_tax_invoice(
    file: UploadFile = File(...),
    direction: str = Form(...),
    is_tax_exempt: bool = Form(False),
    user: UserContext = Depends(_require_admin),
) -> dict:
    """홈택스 전자(세금)계산서 엑셀 업로드 → 파싱 → 중복 제외 저장."""
    if direction not in ("sales", "purchase"):
        raise HTTPException(400, "direction은 sales 또는 purchase여야 합니다.")

    content = await file.read()
    if not content:
        raise HTTPException(400, "빈 파일입니다.")

    from app.services.finance_hometax import parse_hometax_excel
    try:
        parsed = parse_hometax_excel(content, file.filename or "",
                                     direction=direction, is_tax_exempt=is_tax_exempt)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not parsed:
        raise HTTPException(400, "파싱된 계산서가 없습니다. 파일 내용을 확인하세요.")

    db = _db()

    # 기존 승인번호 조회 → 중복 제외 (200개씩 청크)
    numbers = [r["invoice_number"] for r in parsed if r["invoice_number"]]
    existing: set[str] = set()
    for i in range(0, len(numbers), 200):
        resp = (db.table("finance_tax_invoices").select("invoice_number")
                .in_("invoice_number", numbers[i:i + 200]).execute())
        existing |= {r["invoice_number"] for r in (resp.data or [])}

    new_rows = [r for r in parsed
                if not r["invoice_number"] or r["invoice_number"] not in existing]
    skipped = len(parsed) - len(new_rows)

    # 업로드 배치 기록
    up = db.table("finance_uploads").insert({
        "kind": "tax_invoice",
        "direction": direction,
        "filename": file.filename,
        "row_count": len(parsed),
        "inserted_count": len(new_rows),
        "skipped_count": skipped,
        "created_by": user.email,
    }).execute()
    upload_id = up.data[0]["id"] if up.data else None

    inserted = 0
    for i in range(0, len(new_rows), 200):
        chunk = [{**r, "upload_id": upload_id} for r in new_rows[i:i + 200]]
        try:
            resp = db.table("finance_tax_invoices").insert(chunk).execute()
            inserted += len(resp.data or [])
        except Exception as e:
            logger.error("[finance] 계산서 저장 실패 (chunk %d): %s", i, e)
            raise HTTPException(500, f"저장 중 오류: {str(e)[:200]}")

    logger.info("[finance] 업로드 %s: 파싱 %d, 신규 %d, 중복 %d (%s)",
                file.filename, len(parsed), inserted, skipped, direction)
    return {"ok": True, "upload_id": upload_id, "parsed": len(parsed),
            "inserted": inserted, "skipped": skipped}


@router.get("/uploads")
def list_uploads(limit: int = Query(30, le=100),
                 user: UserContext = Depends(_require_admin)) -> list[dict]:
    resp = (_db().table("finance_uploads").select("*")
            .order("created_at", desc=True).limit(limit).execute())
    return resp.data or []


@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: str,
                  user: UserContext = Depends(_require_admin)) -> dict:
    """업로드 배치 롤백 — 해당 배치로 들어간 계산서를 삭제하고 이력 제거."""
    db = _db()
    inv = (db.table("finance_tax_invoices").delete()
           .eq("upload_id", upload_id).execute())
    db.table("finance_uploads").delete().eq("id", upload_id).execute()
    return {"ok": True, "deleted_invoices": len(inv.data or [])}


# ── 계산서 목록/수정 ─────────────────────────────────────────────────

@router.get("/tax-invoices")
def list_tax_invoices(
    year: int = Query(...),
    quarter: int = Query(...),
    direction: Optional[str] = None,
    limit: int = Query(500, le=2000),
    user: UserContext = Depends(_require_admin),
) -> list[dict]:
    start, end = _quarter_bounds(year, quarter)
    q = (_db().table("finance_tax_invoices").select("*")
         .gte("write_date", start).lte("write_date", end)
         .order("write_date", desc=True).limit(limit))
    if direction in ("sales", "purchase"):
        q = q.eq("direction", direction)
    return q.execute().data or []


class InvoicePatch(BaseModel):
    deductible: Optional[bool] = None
    nondeduct_reason: Optional[str] = None


@router.patch("/tax-invoices/{invoice_id}")
def patch_invoice(invoice_id: str, body: InvoicePatch,
                  user: UserContext = Depends(_require_admin)) -> dict:
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.deductible is True and body.nondeduct_reason is None:
        update["nondeduct_reason"] = None  # 공제 복귀 시 사유 제거
    if not update:
        raise HTTPException(400, "변경할 값이 없습니다.")
    resp = (_db().table("finance_tax_invoices").update(update)
            .eq("id", invoice_id).execute())
    if not resp.data:
        raise HTTPException(404, "계산서를 찾을 수 없습니다.")
    return {"ok": True}


# ── 부가세 집계 ──────────────────────────────────────────────────────

@router.get("/vat-summary")
def vat_summary(
    year: int = Query(...),
    quarter: int = Query(...),
    user: UserContext = Depends(_require_admin),
) -> dict:
    """분기 부가세 집계 (법인 일반과세).

    매출세액(과세분) - 공제 매입세액 = 납부(환급)세액.
    영세율은 과세표준 포함·세액 0, 면세는 참고(과세표준 제외).
    ※ 세금계산서 기반 수치 — 카드매출·현금영수증 집계는 2단계에서 합산.
    """
    start, end = _quarter_bounds(year, quarter)
    rows = (_db().table("finance_tax_invoices")
            .select("direction, tax_type, deductible, supply_cost_total, tax_total")
            .gte("write_date", start).lte("write_date", end)
            .limit(10000).execute().data or [])

    def _zero():
        return {"count": 0, "supply": 0, "tax": 0}

    sales = {"과세": _zero(), "영세": _zero(), "면세": _zero()}
    purchase = {"공제": _zero(), "불공제": _zero(), "면세": _zero()}

    for r in rows:
        supply = r.get("supply_cost_total") or 0
        tax = r.get("tax_total") or 0
        if r["direction"] == "sales":
            bucket = sales.get(r.get("tax_type") or "과세", sales["과세"])
        else:
            if (r.get("tax_type") or "과세") == "면세":
                bucket = purchase["면세"]
            elif r.get("deductible", True):
                bucket = purchase["공제"]
            else:
                bucket = purchase["불공제"]
        bucket["count"] += 1
        bucket["supply"] += supply
        bucket["tax"] += tax

    sales_tax = sales["과세"]["tax"]                       # 매출세액
    input_tax = purchase["공제"]["tax"]                    # 공제 매입세액
    taxable_base = sales["과세"]["supply"] + sales["영세"]["supply"]  # 과세표준

    return {
        "year": year,
        "quarter": quarter,
        "label": f"{year}년 {_QUARTER_LABEL[quarter]} ({start} ~ {end})",
        "sales": sales,
        "purchase": purchase,
        "taxable_base": taxable_base,
        "sales_tax": sales_tax,
        "input_tax": input_tax,
        "payable_tax": sales_tax - input_tax,   # 양수=납부, 음수=환급
        "invoice_count": len(rows),
    }
