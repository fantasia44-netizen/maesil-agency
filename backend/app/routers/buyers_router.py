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
    """엑셀(.xlsx/.xls)·CSV 유연 임포트 — 컬럼명 한글/영문 자동 인식.

    aT BMS / KOTRA / KITA 등에서 받은 파일을 컬럼명 그대로 업로드 가능.
    (업체명/회사명/company → company_name, 이메일/email → contact_email 등)
    """
    from app.services.buyer_import import parse_buyer_file

    content = await file.read()
    try:
        parsed = parse_buyer_file(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.warning("[buyers/import] 파싱 실패: %s", e)
        raise HTTPException(400, f"파일 처리 실패: {e}")

    rows = parsed["rows"]
    if not rows:
        raise HTTPException(400, "유효한 행 없음 (회사명이 있는 행이 없습니다)")

    # 기존 회사명(+국가) 적재 — 중복 삽입 방지
    existing: set[str] = set()
    try:
        ex = _db().table("buyer_leads").select("company_name, country").limit(5000).execute().data or []
        for r in ex:
            existing.add(f"{(r.get('company_name') or '').lower().strip()}::{(r.get('country') or '').lower().strip()}")
    except Exception:
        pass

    now = datetime.now(timezone.utc).isoformat()
    to_insert = []
    dup = 0
    seen = set(existing)
    for r in rows:
        key = f"{r['company_name'].lower().strip()}::{(r.get('country') or '').lower().strip()}"
        if key in seen:
            dup += 1
            continue
        seen.add(key)
        to_insert.append({**r, "source": "import", "status": "discovered",
                          "created_at": now, "updated_at": now})

    inserted = 0
    for i in range(0, len(to_insert), 100):
        _db().table("buyer_leads").insert(to_insert[i:i+100]).execute()
        inserted += len(to_insert[i:i+100])

    return {
        "inserted": inserted,
        "duplicates_skipped": dup,
        "rows_no_company": parsed["skipped_no_company"],
        "column_mapping": parsed["mapping"],
        "notes_columns": parsed["notes_columns"],
        "total_rows": len(rows),
    }


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


@router.delete("/{buyer_id}", status_code=204, response_model=None)
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


# ── 이메일 초안 생성 ─────────────────────────────────────────────────────────

@router.post("/{buyer_id}/email-draft")
def generate_email_draft(buyer_id: str, user: UserContext = Depends(_require_admin)) -> dict:
    """Claude Haiku로 바이어 맞춤 영문 이메일 초안 생성."""
    rows = _db().table("buyer_leads").select("*").eq("id", buyer_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, "바이어 없음")
    b = rows[0]

    from app.services.secrets import get_secret
    api_key = get_secret("anthropic_api_key")
    if not api_key:
        raise HTTPException(400, "anthropic_api_key 미설정")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are a B2B export sales specialist for a Korean company.
Write a professional cold email to a potential overseas buyer.

Buyer information:
- Company: {b.get('company_name', '')}
- Country: {b.get('country', '')}
- Contact: {b.get('contact_name') or 'Purchasing Manager'}
- Title: {b.get('contact_title') or 'Import Manager'}
- Industry: {b.get('industry') or 'Import/Distribution'}
- Product interest: {b.get('product_interest') or 'Korean products'}
- Source: {b.get('source', '')}

Write a concise, professional cold email (subject + body).
- Language: English (the buyer's country is {b.get('country', '')})
- Tone: professional but warm
- Length: 150-200 words body
- Mention their specific product interest
- End with a clear CTA (schedule a call or request a catalog)

Return JSON only:
{{"subject": "...", "body_html": "<p>...</p>..."}}"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    import json, re
    text = msg.content[0].text.strip()
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if not m:
        raise HTTPException(500, "초안 생성 실패")
    try:
        draft = json.loads(m.group(0))
    except Exception:
        raise HTTPException(500, "초안 파싱 실패")
    return {"subject": draft.get("subject", ""), "body_html": draft.get("body_html", "")}


# ── 이메일 발송 ──────────────────────────────────────────────────────────────

class EmailSendRequest(BaseModel):
    subject: str
    body_html: str


@router.post("/{buyer_id}/send-email")
def send_email_to_buyer(buyer_id: str, body: EmailSendRequest,
                        user: UserContext = Depends(_require_admin)) -> dict:
    """Gmail API로 바이어에게 이메일 발송 + 상태 contacted로 변경."""
    rows = _db().table("buyer_leads").select("*").eq("id", buyer_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, "바이어 없음")
    b = rows[0]
    email = (b.get("contact_email") or "").strip()
    if not email:
        raise HTTPException(400, "이메일 주소 없음")

    from app.services.outreach_gmail_sender import send, is_configured
    if not is_configured():
        raise HTTPException(400, "Gmail 미설정 — Settings > outreach_gmail_* 시크릿 확인")

    result = send(None, email, body.subject, body.body_html)
    if not result.get("ok"):
        raise HTTPException(502, f"발송 실패: {result.get('error')}")

    now = datetime.now(timezone.utc).isoformat()
    _db().table("buyer_leads").update({
        "status": "contacted",
        "emailed_at": now,
        "updated_at": now,
    }).eq("id", buyer_id).execute()

    return {"ok": True, "message_id": result.get("id")}
