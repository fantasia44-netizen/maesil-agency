"""구독/결제 API — PortOne 빌링키 정기결제 (테넌트 단위)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_tenant
from app.tenant_context import TenantContext
from app.services import portone, plans

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _tenant_row(tenant_id: str) -> dict:
    r = _db().table("tenants").select("id, name, plan, status, trial_ends_at").eq("id", tenant_id).limit(1).execute()
    rows = r.data or []
    return rows[0] if rows else {}


@router.get("/plans")
def list_plans(user: UserContext = Depends(get_current_user)) -> dict:
    return {"plans": plans.PLANS, "trial": plans.TRIAL}


@router.get("/portone-config")
def portone_public_config(user: UserContext = Depends(get_current_user)) -> dict:
    """브라우저 SDK용 공개 설정(store_id/channel_key). api_secret/webhook_secret은 미반환."""
    from app.services.secrets import get_secret
    return {
        "store_id":      get_secret("portone_store_id") or "",
        "channel_card":  get_secret("portone_channel_card") or "",
        "channel_kakao": get_secret("portone_channel_kakao") or "",
        "configured":    portone.is_configured(),
    }


@router.get("/status")
def billing_status(ctx: TenantContext = Depends(require_tenant)) -> dict:
    t = _tenant_row(ctx.tenant_id)
    sub = plans.get_subscription(ctx.tenant_id) or {}
    return {
        "plan": t.get("plan"),
        "tenant_status": t.get("status"),
        "trial_ends_at": t.get("trial_ends_at"),
        "portone_configured": portone.is_configured(),
        "subscription": {
            "status": sub.get("status", "none"),
            "plan": sub.get("plan"),
            "card_info": sub.get("card_info"),
            "billing_key_set": bool(sub.get("billing_key")),
            "current_period_end": sub.get("current_period_end"),
            "amount": sub.get("amount"),
        },
    }


class BillingKeySave(BaseModel):
    billing_key: str
    pg: str = "card"   # card | kakaopay


@router.post("/billing-key/save")
def save_billing_key(body: BillingKeySave, ctx: TenantContext = Depends(require_tenant)) -> dict:
    """프런트 PortOne SDK 카드등록 후 받은 billing_key 저장."""
    bk = (body.billing_key or "").strip()
    if not bk:
        raise HTTPException(400, "billing_key 없음")
    info = portone.get_billing_key_info(bk)
    card_info = None
    if info:
        methods = (info.get("billingKey") or info).get("methods") if isinstance(info, dict) else None
        # PortOne 응답 구조 다양 — 카드 마스킹 정보만 best-effort 추출
        try:
            m = (info.get("methods") or methods or [{}])
            card = (m[0].get("card") if m else {}) or {}
            card_info = {"number": card.get("number"), "issuer": card.get("issuer") or card.get("name")}
        except Exception:
            card_info = None
    plans.upsert_subscription(ctx.tenant_id, {
        "billing_key": bk, "billing_key_pg": body.pg, "card_info": card_info,
    })
    return {"ok": True, "card_info": card_info}


class SubscribeReq(BaseModel):
    plan: str   # starter | pro


@router.post("/subscribe")
def subscribe(body: SubscribeReq, ctx: TenantContext = Depends(require_tenant)) -> dict:
    """선택 플랜으로 즉시 1회 결제 → 구독 활성화(+1개월) + tenants.plan 갱신."""
    if body.plan not in plans.PLANS:
        raise HTTPException(400, "유효하지 않은 플랜")
    sub = plans.get_subscription(ctx.tenant_id) or {}
    bk = sub.get("billing_key")
    if not bk:
        raise HTTPException(400, "결제수단(카드)을 먼저 등록하세요.")

    price = plans.PLANS[body.plan]["price"]
    t = _tenant_row(ctx.tenant_id)
    res = portone.charge_subscription(
        ctx.tenant_id, bk, price,
        order_name=f"maesil-agency {plans.PLANS[body.plan]['name']} 구독",
        pg=sub.get("billing_key_pg") or "card",
        customer={"customData": {"tenant_id": ctx.tenant_id}},
    )
    now = datetime.now(timezone.utc)
    if not res.get("success"):
        plans.upsert_subscription(ctx.tenant_id, {"status": "past_due", "last_error": res.get("error")})
        raise HTTPException(402, f"결제 실패: {res.get('error')}")

    plans.upsert_subscription(ctx.tenant_id, {
        "plan": body.plan, "status": "active", "amount": price,
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "last_payment_id": res.get("payment_id"), "last_error": None,
    })
    plans.set_tenant_plan(ctx.tenant_id, body.plan, "active")
    return {"ok": True, "plan": body.plan, "payment_id": res.get("payment_id")}


@router.post("/cancel")
def cancel(ctx: TenantContext = Depends(require_tenant)) -> dict:
    """구독 해지 — 현재 기간까지 사용, 자동 갱신 중지."""
    sub = plans.get_subscription(ctx.tenant_id)
    if not sub or sub.get("status") != "active":
        raise HTTPException(400, "활성 구독이 없습니다.")
    plans.upsert_subscription(ctx.tenant_id, {
        "status": "canceled", "canceled_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "message": "현재 기간 종료까지 사용 가능합니다."}


@router.post("/retry")
def retry_payment(ctx: TenantContext = Depends(require_tenant)) -> dict:
    """past_due 상태 구독 재결제 시도."""
    sub = plans.get_subscription(ctx.tenant_id)
    if not sub:
        raise HTTPException(400, "구독 정보 없음")
    if sub.get("status") not in ("past_due", "active"):
        raise HTTPException(400, "재결제 대상이 아닙니다")
    bk = sub.get("billing_key")
    amt = sub.get("amount") or 0
    plan_key = sub.get("plan") or "starter"
    if not bk or not amt:
        raise HTTPException(400, "결제수단 또는 금액 정보 없음")
    res = portone.charge_subscription(
        ctx.tenant_id, bk, amt,
        order_name=f"maesil-agency {plans.PLANS.get(plan_key, {}).get('name', plan_key)} 재결제",
        pg=sub.get("billing_key_pg") or "card",
    )
    now = datetime.now(timezone.utc)
    if not res.get("success"):
        plans.upsert_subscription(ctx.tenant_id, {"status": "past_due", "last_error": res.get("error")})
        raise HTTPException(402, f"결제 실패: {res.get('error')}")
    plans.upsert_subscription(ctx.tenant_id, {
        "status": "active", "last_error": None,
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "last_payment_id": res.get("payment_id"),
    })
    plans.set_tenant_plan(ctx.tenant_id, plan_key, "active")
    return {"ok": True, "payment_id": res.get("payment_id")}


@router.post("/webhook")
async def webhook(request: Request) -> dict:
    """PortOne 웹훅 — 서명 검증 + 멱등 처리 + 구독 상태 반영."""
    body = await request.body()
    if not portone.verify_webhook(body, dict(request.headers)):
        raise HTTPException(401, "invalid signature")
    import json as _j
    try:
        data = _j.loads(body.decode("utf-8"))
    except Exception:
        data = {}

    event_id = request.headers.get("webhook-id") or request.headers.get("Webhook-Id") or ""
    if event_id:
        try:
            _db().table("billing_events").insert({
                "event_id": event_id, "kind": data.get("type"), "payload": data,
            }).execute()
        except Exception:
            return {"ok": True, "dedup": True}

    event_type = data.get("type") or ""
    payment = data.get("data") or data.get("payment") or {}
    custom_data = payment.get("customData") or payment.get("custom_data") or {}
    tenant_id = (custom_data.get("tenant_id") or "").strip()

    now = datetime.now(timezone.utc)

    if event_type in ("Transaction.Paid", "transaction.paid") and tenant_id:
        amt = (payment.get("amount") or {}).get("total") or payment.get("amount") or 0
        plans.upsert_subscription(tenant_id, {
            "status": "active", "last_error": None,
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "last_payment_id": payment.get("paymentId") or payment.get("payment_id") or "",
        })
        logger.info("[billing] webhook Paid tenant=%s amt=%s", tenant_id, amt)

    elif event_type in ("Transaction.Failed", "transaction.failed") and tenant_id:
        err = (payment.get("failureReason") or {}).get("message") or payment.get("message") or event_type
        plans.upsert_subscription(tenant_id, {"status": "past_due", "last_error": err})
        plans.set_tenant_plan(tenant_id, plans.get_subscription(tenant_id).get("plan") or "starter", "suspended")
        logger.warning("[billing] webhook Failed tenant=%s err=%s", tenant_id, err)

    elif event_type in ("BillingKey.Deleted", "billing_key.deleted") and tenant_id:
        plans.upsert_subscription(tenant_id, {"billing_key": None, "status": "canceled"})
        logger.info("[billing] webhook BillingKey.Deleted tenant=%s", tenant_id)

    logger.info("[billing] webhook %s tenant=%s", event_type, tenant_id or "(unknown)")
    return {"ok": True}
