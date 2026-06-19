"""PortOne v2 API 래퍼 (maesil-agency 이식판).

빌링키 조회 / 정기결제 / 결제조회 / 취소 / 웹훅 검증.
PortOne v2 서버사이드: Authorization: PortOne {api_secret}.
설정은 전역 secrets(에이전시 PortOne 계정), billing_key는 테넌트별.

필요 전역 시크릿(secrets 테이블):
  portone_store_id, portone_api_secret,
  portone_channel_card, portone_channel_kakao, portone_webhook_secret
"""
from __future__ import annotations

import base64
import hashlib
import hmac as _hmac
import logging
import time
import uuid

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://api.portone.io"


def _cfg(name: str) -> str:
    from app.services.secrets import get_secret
    return (get_secret(name) or "").strip()


def _headers() -> dict:
    return {"Authorization": f"PortOne {_cfg('portone_api_secret')}", "Content-Type": "application/json"}


def is_configured() -> bool:
    return bool(_cfg("portone_api_secret") and _cfg("portone_store_id"))


# ── 빌링키 조회 ──────────────────────────────────────────────────────
def get_billing_key_info(billing_key: str) -> dict | None:
    if not _cfg("portone_api_secret"):
        return None
    try:
        r = httpx.get(f"{_BASE}/billing-keys/{billing_key}", headers=_headers(), timeout=8)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error("[PortOne] 빌링키 조회 실패: %s", e)
        return None


# ── 정기결제 (빌링키 즉시 청구) ──────────────────────────────────────
def charge_subscription(tenant_id: str, billing_key: str, amount: int, order_name: str,
                        customer: dict | None = None, pg: str = "card") -> dict:
    """빌링키로 구독 결제 청구. Returns {success, payment_id, error?, data?}."""
    api_secret = _cfg("portone_api_secret")
    if not api_secret:
        return {"success": False, "error": "포트원 인증 실패"}

    channel_key = _cfg("portone_channel_kakao") if pg == "kakaopay" else _cfg("portone_channel_card")
    if not channel_key:
        return {"success": False, "error": f"채널키 미설정 (pg={pg})"}

    payment_id = f"sub_{tenant_id[:8]}_{uuid.uuid4().hex[:8]}"
    payload = {
        "storeId": _cfg("portone_store_id"),
        "channelKey": channel_key,
        "billingKey": billing_key,
        "orderName": order_name,
        "amount": {"total": amount},
        "currency": "KRW",
        "customer": customer or {},
    }
    try:
        r = httpx.post(f"{_BASE}/payments/{payment_id}/billing-key", headers=_headers(), json=payload, timeout=15)
        data = r.json()
        payment = data.get("payment", {})
        paid = r.status_code == 200 and (payment.get("status") == "PAID" or payment.get("paidAt"))
        if paid:
            return {"success": True, "payment_id": payment_id, "data": data}
        err = (payment.get("message") or (payment.get("failureReason") or {}).get("message")
               or data.get("message") or data.get("type") or str(r.status_code))
        logger.error("[PortOne] 결제 실패 상세: %s", data)
        return {"success": False, "payment_id": payment_id, "error": err, "data": data}
    except Exception as e:
        logger.error("[PortOne] 결제 실패: %s", e)
        return {"success": False, "error": str(e)}


def get_payment(payment_id: str) -> dict | None:
    if not _cfg("portone_api_secret"):
        return None
    try:
        r = httpx.get(f"{_BASE}/payments/{payment_id}", headers=_headers(), timeout=8)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error("[PortOne] 결제 조회 실패: %s", e)
        return None


def cancel_payment(payment_id: str, reason: str, amount: int | None = None) -> dict:
    if not _cfg("portone_api_secret"):
        return {"success": False, "error": "포트원 인증 실패"}
    payload: dict = {"reason": reason[:200]}
    if amount and amount > 0:
        payload["amount"] = amount
    try:
        r = httpx.post(f"{_BASE}/payments/{payment_id}/cancel", headers=_headers(), json=payload, timeout=15)
        data = r.json() if r.content else {}
        if r.status_code == 200:
            c = data.get("cancellation") or {}
            return {"success": True, "cancellation_id": c.get("id", ""),
                    "cancelled_amount": c.get("totalAmount", amount or 0), "data": data}
        return {"success": False, "error": data.get("message") or data.get("type") or f"status={r.status_code}"}
    except Exception as e:
        logger.error("[PortOne] 취소 실패: %s", e)
        return {"success": False, "error": str(e)}


def delete_billing_key(billing_key: str, reason: str = "subscription cancelled") -> bool:
    if not _cfg("portone_api_secret"):
        return False
    try:
        r = httpx.request("DELETE", f"{_BASE}/billing-keys/{billing_key}",
                          headers=_headers(), json={"reason": reason[:200]}, timeout=10)
        return r.status_code in (200, 204)
    except Exception as e:
        logger.error("[PortOne] 빌링키 삭제 실패: %s", e)
        return False


# ── 웹훅 서명 검증 (Standard Webhooks) ───────────────────────────────
def verify_webhook(payload_bytes: bytes, headers: dict) -> bool:
    secret = _cfg("portone_webhook_secret")
    if not secret:
        logger.error("[PortOne] webhook_secret 미설정 — 검증 거부")
        return False
    if secret.startswith("whsec_"):
        try:
            secret_bytes = base64.b64decode(secret[6:])
        except Exception:
            return False
    else:
        secret_bytes = secret.encode()

    def _h(*names):
        for n in names:
            v = headers.get(n)
            if v:
                return v
        return ""
    msg_id = _h("webhook-id", "Webhook-Id")
    msg_ts = _h("webhook-timestamp", "Webhook-Timestamp")
    msg_sig = _h("webhook-signature", "Webhook-Signature")
    if not (msg_id and msg_ts and msg_sig):
        return False
    try:
        if abs(int(time.time()) - int(msg_ts)) > 300:
            return False
    except (TypeError, ValueError):
        return False

    sig_payload = f'{msg_id}.{msg_ts}.{payload_bytes.decode("utf-8", errors="replace")}'
    expected = base64.b64encode(
        _hmac.new(secret_bytes, sig_payload.encode(), hashlib.sha256).digest()
    ).decode()
    for part in msg_sig.split():
        if "," in part:
            ver, sig = part.split(",", 1)
            if ver == "v1" and _hmac.compare_digest(sig, expected):
                return True
    return False
