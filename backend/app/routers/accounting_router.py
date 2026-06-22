"""회계 API — 구독 매출 + 수동 수입/지출 항목 관리.

GET  /api/accounting/summary   — 월별 매출·비용 요약
GET  /api/accounting/entries   — 수동 항목 목록
POST /api/accounting/entries   — 수동 항목 추가
DELETE /api/accounting/entries/{id} — 항목 삭제
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/accounting", tags=["accounting"])


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


@router.get("/summary")
def accounting_summary(
    months: int = Query(6, le=24),
    user: UserContext = Depends(_require_admin),
) -> dict:
    """최근 N개월 구독 매출 + 수동 항목 합산."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 구독 매출: tenant_subscriptions에서 active 건
    subs = (_db().table("tenant_subscriptions")
            .select("tenant_id, amount, status, current_period_start")
            .execute().data or [])

    active_mrr = sum(s.get("amount") or 0 for s in subs if s.get("status") == "active")

    # 수동 항목 (최근 N개월)
    cutoff = (month_start.replace(month=month_start.month - months + 1)
              if month_start.month > months else
              month_start.replace(year=month_start.year - 1,
                                  month=12 - (months - month_start.month - 1))).isoformat()

    entries = (_db().table("accounting_entries")
               .select("*")
               .gte("entry_date", cutoff[:10])
               .order("entry_date", desc=True)
               .execute().data or [])

    total_income = sum(e.get("amount", 0) for e in entries if e.get("kind") == "income")
    total_expense = sum(e.get("amount", 0) for e in entries if e.get("kind") == "expense")

    return {
        "active_mrr": active_mrr,
        "subscription_count": sum(1 for s in subs if s.get("status") == "active"),
        "manual_income": total_income,
        "manual_expense": total_expense,
        "net": total_income - total_expense,
        "period_months": months,
    }


@router.get("/entries")
def list_entries(
    limit: int = Query(100, le=500),
    offset: int = 0,
    kind: str | None = None,
    user: UserContext = Depends(_require_admin),
) -> list[dict]:
    q = (_db().table("accounting_entries")
         .select("*").order("entry_date", desc=True))
    if kind:
        q = q.eq("kind", kind)
    return q.range(offset, offset + limit - 1).execute().data or []


class EntryCreate(BaseModel):
    kind: str        # income | expense
    category: str    # 구독수입 | 용역수입 | 마케팅비 | 인건비 | 기타 등
    amount: int      # 원
    entry_date: str  # YYYY-MM-DD
    description: str | None = None
    tenant_id: str | None = None


@router.post("/entries", status_code=201)
def create_entry(body: EntryCreate, user: UserContext = Depends(_require_admin)) -> dict:
    if body.kind not in ("income", "expense"):
        raise HTTPException(400, "kind는 income 또는 expense")
    row = {
        "kind": body.kind,
        "category": body.category,
        "amount": body.amount,
        "entry_date": body.entry_date,
        "description": body.description,
        "tenant_id": body.tenant_id,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    resp = _db().table("accounting_entries").insert(row).execute()
    return (resp.data or [{}])[0]


@router.delete("/entries/{entry_id}", status_code=204, response_model=None)
def delete_entry(entry_id: str, user: UserContext = Depends(_require_admin)) -> None:
    _db().table("accounting_entries").delete().eq("id", entry_id).execute()
