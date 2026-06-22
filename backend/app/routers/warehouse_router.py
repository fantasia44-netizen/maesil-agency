"""창고·물류 API — maesil-insight DB의 production_logs / shipment_logs 조회.

GET /api/warehouse/summary    — SKU별 재고 현황 (입고 - 출고)
GET /api/warehouse/production — 입고(생산) 목록
GET /api/warehouse/shipments  — 출고 목록
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from supabase import create_client

from app.auth import UserContext, get_current_user, require_admin
from app.services.secrets import get_secret

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


def _insight_db():
    """maesil-insight Supabase 클라이언트 (public 스키마)."""
    url = get_secret("maesil_insight_supabase_url") or ""
    key = get_secret("m_insight_service_role") or ""
    if not url or not key:
        return None
    return create_client(url, key)


def _operator_id(user: UserContext) -> str | None:
    """슈퍼어드민: maesil-insight operator_id 시크릿에서 가져옴."""
    return get_secret("maesil-insight_operator_id") or None


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


@router.get("/summary")
def warehouse_summary(user: UserContext = Depends(_require_admin)) -> dict:
    """SKU별 재고 현황: 누적 입고 - 누적 출고."""
    db = _insight_db()
    if not db:
        return {"error": "maesil-insight 연결 미설정", "items": []}
    oid = _operator_id(user)
    if not oid:
        return {"error": "operator_id 미설정", "items": []}

    # 입고 합계 (SKU별)
    prod = (db.table("production_logs")
            .select("sku, product_name, actual_qty")
            .eq("operator_id", oid).eq("status", "completed")
            .execute().data or [])

    # 출고 합계 (SKU별)
    ship = (db.table("shipment_logs")
            .select("sku, qty")
            .eq("operator_id", oid).in_("status", ["shipped", "delivered"])
            .execute().data or [])

    in_map: dict[str, dict] = {}
    for r in prod:
        sku = r.get("sku") or r.get("product_name") or "미분류"
        if sku not in in_map:
            in_map[sku] = {"sku": sku, "product_name": r.get("product_name", ""), "qty_in": 0, "qty_out": 0}
        in_map[sku]["qty_in"] += r.get("actual_qty", 0)

    for r in ship:
        sku = r.get("sku") or "미분류"
        if sku not in in_map:
            in_map[sku] = {"sku": sku, "product_name": sku, "qty_in": 0, "qty_out": 0}
        in_map[sku]["qty_out"] += r.get("qty", 0)

    items = [
        {**v, "stock": v["qty_in"] - v["qty_out"]}
        for v in in_map.values()
    ]
    items.sort(key=lambda x: x["stock"], reverse=True)
    return {"items": items, "total_skus": len(items)}


@router.get("/production")
def production_list(
    limit: int = Query(50, le=200),
    offset: int = 0,
    user: UserContext = Depends(_require_admin),
) -> dict:
    db = _insight_db()
    if not db:
        return {"error": "maesil-insight 연결 미설정", "rows": []}
    oid = _operator_id(user)
    if not oid:
        return {"error": "operator_id 미설정", "rows": []}

    resp = (db.table("production_logs")
            .select("*")
            .eq("operator_id", oid)
            .order("production_date", desc=True)
            .range(offset, offset + limit - 1)
            .execute())
    return {"rows": resp.data or [], "count": len(resp.data or [])}


@router.get("/shipments")
def shipment_list(
    limit: int = Query(50, le=200),
    offset: int = 0,
    sku: Optional[str] = None,
    channel: Optional[str] = None,
    user: UserContext = Depends(_require_admin),
) -> dict:
    db = _insight_db()
    if not db:
        return {"error": "maesil-insight 연결 미설정", "rows": []}
    oid = _operator_id(user)
    if not oid:
        return {"error": "operator_id 미설정", "rows": []}

    q = (db.table("shipment_logs")
         .select("*")
         .eq("operator_id", oid)
         .order("shipment_date", desc=True))
    if sku:
        q = q.eq("sku", sku)
    if channel:
        q = q.eq("channel", channel)
    resp = q.range(offset, offset + limit - 1).execute()
    return {"rows": resp.data or [], "count": len(resp.data or [])}
