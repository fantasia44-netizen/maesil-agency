"""브리핑 에이전시 API — 영업/창고 에이전시 브리핑 실행 및 조회."""
from __future__ import annotations

import logging
import threading

from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, require_admin
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/briefing", tags=["briefing"])


def _db():
    return get_maesil_total_client().schema("agent_work")


# ── 브리핑 실행 ────────────────────────────────────────────────────

def _run_sales_bg():
    from app.services.sales_agency import run_briefing
    try:
        run_briefing()
    except Exception as e:
        logger.error("[briefing] 영업(매출) 에이전시 실패: %s", e)


def _run_outreach_bg():
    from app.services.outreach_briefing import run_briefing
    try:
        run_briefing()
    except Exception as e:
        logger.error("[briefing] 영업(CRM) 에이전시 실패: %s", e)


def _run_warehouse_bg():
    from app.services.warehouse_agency import run_briefing
    try:
        run_briefing()
    except Exception as e:
        logger.error("[briefing] 창고 에이전시 실패: %s", e)


def _run_cs_bg():
    from app.services.cs_agency import run_briefing
    try:
        run_briefing()
    except Exception as e:
        logger.error("[briefing] CS 에이전시 실패: %s", e)


def _run_finance_bg():
    from app.services.finance_agency import run_briefing
    try:
        run_briefing()
    except Exception as e:
        logger.error("[briefing] 재무 에이전시 실패: %s", e)


@router.post("/run")
def run_briefing(
    agency: str = "all",   # "sales" | "outreach" | "warehouse" | "all"
    user: UserContext = Depends(require_admin),
) -> dict:
    """브리핑 실행 (백그라운드). agency=sales|outreach|warehouse|all."""
    launched = []
    if agency in ("sales", "all"):
        threading.Thread(target=_run_sales_bg, daemon=True).start()
        launched.append("sales")
    if agency in ("outreach", "all"):
        threading.Thread(target=_run_outreach_bg, daemon=True).start()
        launched.append("outreach")
    if agency in ("warehouse", "all"):
        threading.Thread(target=_run_warehouse_bg, daemon=True).start()
        launched.append("warehouse")
    if agency in ("cs", "all"):
        threading.Thread(target=_run_cs_bg, daemon=True).start()
        launched.append("cs")
    if agency in ("finance", "all"):
        threading.Thread(target=_run_finance_bg, daemon=True).start()
        launched.append("finance")
    if not launched:
        raise HTTPException(400, "agency는 sales|outreach|warehouse|all 중 하나")
    return {"ok": True, "launched": launched, "message": "브리핑 실행 중 — 30~60초 후 새로고침하세요"}


# ── 최신 브리핑 조회 ──────────────────────────────────────────────

@router.get("/latest")
def get_latest_briefings(user: UserContext = Depends(require_admin)) -> dict:
    """영업 + 창고 최신 브리핑 각 1건 반환."""
    result: dict = {}
    for agency_type in ("sales", "outreach", "warehouse", "cs", "finance"):
        try:
            resp = (
                _db().table("agency_briefings")
                .select("id,agency_type,status,headline,sections,alerts,period_from,period_to,created_at,error_msg")
                .eq("agency_type", agency_type)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            result[agency_type] = rows[0] if rows else None
        except Exception as e:
            logger.warning("[briefing] 조회 실패 [%s]: %s", agency_type, e)
            result[agency_type] = None
    return result


@router.get("/history")
def get_briefing_history(
    agency: str = "all",
    limit: int = 20,
    user: UserContext = Depends(require_admin),
) -> list[dict]:
    """브리핑 이력 조회."""
    q = (
        _db().table("agency_briefings")
        .select("id,agency_type,status,headline,alerts,period_from,period_to,created_at")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if agency != "all":
        q = q.eq("agency_type", agency)
    return q.execute().data or []
