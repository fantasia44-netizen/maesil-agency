"""슈퍼어드민 전용 관리 API.

GET  /api/admin/tenants           — 전체 테넌트 목록 + 구독/영업 현황
GET  /api/admin/tenants/{id}      — 테넌트 상세
PATCH /api/admin/tenants/{id}     — 상태 변경 (activate/suspend)
GET  /api/admin/users             — 전체 유저 목록 (테넌트 포함)
GET  /api/admin/stats             — 전체 집계 (테넌트 수·매출·영업 발송)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_super_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


# ── 테넌트 목록 ──────────────────────────────────────────────────────────────

@router.get("/tenants")
def list_tenants(user: UserContext = Depends(_require_super_admin)) -> list[dict]:
    """전체 테넌트 + 구독 + 영업 발송 요약."""
    tenants = (_db().table("tenants")
               .select("id, name, plan, status, trial_ends_at, created_at")
               .order("created_at", desc=True).execute().data or [])

    now_iso = datetime.now(timezone.utc).isoformat()
    result = []
    for t in tenants:
        tid = t["id"]

        # 구독 정보
        sub_rows = (_db().table("subscriptions")
                    .select("status, current_period_end, amount")
                    .eq("tenant_id", tid).order("created_at", desc=True)
                    .limit(1).execute().data or [])
        sub = sub_rows[0] if sub_rows else {}

        # 영업 발송 현황
        try:
            tp = (_db().table("outreach_touchpoints")
                  .select("status", count="exact")
                  .eq("tenant_id", tid).execute())
            total_tp = tp.count or 0
            sent_tp = (_db().table("outreach_touchpoints")
                       .select("id", count="exact")
                       .eq("tenant_id", tid).eq("status", "sent").execute()).count or 0
        except Exception:
            total_tp = sent_tp = 0

        # 리드 수
        try:
            lead_count = (_db().table("outreach_leads")
                          .select("id", count="exact")
                          .eq("tenant_id", tid).execute()).count or 0
        except Exception:
            lead_count = 0

        # 트라이얼 만료 여부
        trial_expired = (t.get("plan") == "trial"
                         and t.get("trial_ends_at")
                         and t["trial_ends_at"] < now_iso)

        result.append({
            **t,
            "trial_expired": trial_expired,
            "subscription": sub,
            "lead_count": lead_count,
            "touchpoint_total": total_tp,
            "touchpoint_sent": sent_tp,
        })
    return result


@router.get("/tenants/{tenant_id}")
def get_tenant(tenant_id: str, user: UserContext = Depends(_require_super_admin)) -> dict:
    rows = (_db().table("tenants")
            .select("*").eq("id", tenant_id).limit(1).execute().data or [])
    if not rows:
        raise HTTPException(404, "테넌트 없음")
    t = rows[0]

    # 구독 이력
    subs = (_db().table("subscriptions")
            .select("*").eq("tenant_id", tenant_id)
            .order("created_at", desc=True).limit(10).execute().data or [])

    # 영업 설정
    cfg_rows = (_db().table("tenant_outreach_config")
                .select("*").eq("tenant_id", tenant_id).limit(1).execute().data or [])

    # 유저 목록
    users = (_db().table("users")
             .select("id, email, display_name, role, created_at")
             .eq("tenant_id", tenant_id).execute().data or [])

    return {**t, "subscriptions": subs, "outreach_config": cfg_rows[0] if cfg_rows else {},
            "users": users}


class TenantPatch(BaseModel):
    status: str | None = None  # active / suspended
    plan: str | None = None


@router.patch("/tenants/{tenant_id}")
def patch_tenant(tenant_id: str, body: TenantPatch,
                 user: UserContext = Depends(_require_super_admin)) -> dict:
    allowed = {"active", "suspended"}
    if body.status and body.status not in allowed:
        raise HTTPException(400, f"status는 {allowed} 중 하나")
    upd: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status:
        upd["status"] = body.status
    if body.plan:
        upd["plan"] = body.plan
    _db().table("tenants").update(upd).eq("id", tenant_id).execute()
    return {"ok": True, "tenant_id": tenant_id, **upd}


# ── 전체 유저 목록 ───────────────────────────────────────────────────────────

@router.get("/users")
def list_all_users(user: UserContext = Depends(_require_super_admin)) -> list[dict]:
    return (_db().table("users")
            .select("id, email, display_name, role, tenant_id, created_at")
            .order("created_at", desc=True).execute().data or [])


# ── 전체 집계 ────────────────────────────────────────────────────────────────

@router.get("/stats")
def admin_stats(user: UserContext = Depends(_require_super_admin)) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()

    tenants = (_db().table("tenants").select("id, plan, status, trial_ends_at")
               .execute().data or [])
    total = len(tenants)
    active = sum(1 for t in tenants if t["status"] == "active"
                 and not (t.get("plan") == "trial"
                          and t.get("trial_ends_at", "") < now_iso))
    trial = sum(1 for t in tenants if t.get("plan") == "trial")
    suspended = sum(1 for t in tenants if t["status"] == "suspended")

    try:
        sent = (_db().table("outreach_touchpoints")
                .select("id", count="exact").eq("status", "sent").execute()).count or 0
    except Exception:
        sent = 0

    try:
        leads = (_db().table("outreach_leads")
                 .select("id", count="exact").execute()).count or 0
    except Exception:
        leads = 0

    # 이번달 구독 매출
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0,
                                                      second=0, microsecond=0).isoformat()
    try:
        paid_rows = (_db().table("subscriptions")
                     .select("amount").eq("status", "active")
                     .gte("created_at", month_start).execute().data or [])
        monthly_revenue = sum(r.get("amount", 0) or 0 for r in paid_rows)
    except Exception:
        monthly_revenue = 0

    return {
        "tenants": {"total": total, "active": active, "trial": trial, "suspended": suspended},
        "outreach": {"total_leads": leads, "total_sent": sent},
        "revenue": {"monthly_krw": monthly_revenue},
    }
