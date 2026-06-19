"""플랜/요금 정의 + 구독 DB 헬퍼.

가격·한도는 여기서 한 곳으로 관리(운영 중 조정 가능).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# plan key → 표시명/월요금(원)/한도
PLANS: dict[str, dict] = {
    "starter": {"name": "스타터", "price": 49000,  "daily_cap_max": 50,  "lead_cap": 2000},
    "pro":     {"name": "프로",    "price": 149000, "daily_cap_max": 200, "lead_cap": 10000},
}
TRIAL = {"name": "무료체험", "price": 0, "daily_cap_max": 20, "lead_cap": 500}
INTERNAL = {"name": "내부", "price": 0, "daily_cap_max": 100000, "lead_cap": 1000000}


def plan_limits(plan: str | None) -> dict:
    if plan == "internal":
        return INTERNAL
    if plan in PLANS:
        return PLANS[plan]
    return TRIAL


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def get_subscription(tenant_id: str) -> dict | None:
    try:
        resp = _db().table("tenant_subscriptions").select("*").eq("tenant_id", tenant_id).limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception:
        return None


def upsert_subscription(tenant_id: str, patch: dict) -> None:
    patch = dict(patch)
    patch["tenant_id"] = tenant_id
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    _db().table("tenant_subscriptions").upsert(patch, on_conflict="tenant_id").execute()


def set_tenant_plan(tenant_id: str, plan: str, status: str = "active") -> None:
    """tenants.plan/status 갱신 (스케줄러 대상·한도에 반영)."""
    _db().table("tenants").update({
        "plan": plan, "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", tenant_id).execute()


def process_billing_cycle() -> dict:
    """정기결제 주기 처리 (스케줄러가 주기적으로 호출).

    - active + 기간만료 → 빌링키로 재청구. 성공: +30일 연장. 실패: past_due + 테넌트 suspended.
    - canceled + 기간만료 → 구독 종료(ended) + 테넌트 canceled (영업 정지).
    """
    from app.services import portone
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    charged = failed = ended = 0
    try:
        due = (_db().table("tenant_subscriptions").select("*")
               .in_("status", ["active", "canceled"])
               .lte("current_period_end", now_iso).execute().data) or []
    except Exception as e:
        logger.warning("process_billing_cycle 조회 실패: %s", e)
        return {"charged": 0, "failed": 0, "ended": 0}

    for s in due:
        tid = s.get("tenant_id")
        plan = s.get("plan") or "starter"
        if not tid:
            continue
        if s.get("status") == "canceled":
            upsert_subscription(tid, {"status": "ended"})
            set_tenant_plan(tid, plan, "canceled")
            ended += 1
            continue
        bk = s.get("billing_key")
        amt = s.get("amount") or 0
        if not (bk and amt):
            continue
        res = portone.charge_subscription(tid, bk, amt,
                                          order_name=f"maesil-agency {plan} 구독 갱신",
                                          pg=s.get("billing_key_pg") or "card")
        if res.get("success"):
            upsert_subscription(tid, {
                "current_period_start": now_iso,
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "last_payment_id": res.get("payment_id"), "last_error": None,
            })
            set_tenant_plan(tid, plan, "active")
            charged += 1
        else:
            upsert_subscription(tid, {"status": "past_due", "last_error": res.get("error")})
            set_tenant_plan(tid, plan, "suspended")
            failed += 1
    if charged or failed or ended:
        logger.info("[billing] cycle charged=%d failed=%d ended=%d", charged, failed, ended)
    return {"charged": charged, "failed": failed, "ended": ended}
