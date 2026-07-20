"""finance_system_sales — 인사이트·스튜디오 결제 DB에서 분기 매출 자동 집계.

(주)매실패밀리 매출 = 매실인사이트(payments + agency_payments) + 매실스튜디오(payments).
두 시스템 모두 payments에 supply_amount/tax_amount(부가세 분리)가 이미 있음.

용도: 부가세 신고 시 3자 대사 —
  ① 시스템 매출(이 집계, 운영의 진실)
  ② 업로드된 카드매출·현금영수증 (PG 정산/홈택스 자료)
  ③ 세금계산서 매출
  → 신고 기준은 홈택스 '신고도움서비스' 카드매출 숫자. 차이나면 원인 추적.

필요 시크릿:
  maesil_insight_supabase_url / m_insight_service_role      (기존, CS·창고와 공유)
  maesil_studio_supabase_url  / maesil_studio_service_role  (신규)
"""
from __future__ import annotations

import logging

from supabase import create_client

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)

_QUARTER_MONTHS = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}


def _bounds_kst(year: int, quarter: int) -> tuple[str, str]:
    """분기 경계 (KST 기준 ISO). end는 exclusive (다음 분기 첫날 00:00)."""
    m1, m2 = _QUARTER_MONTHS[quarter]
    start = f"{year}-{m1:02d}-01T00:00:00+09:00"
    if m2 == 12:
        end = f"{year + 1}-01-01T00:00:00+09:00"
    else:
        end = f"{year}-{m2 + 1:02d}-01T00:00:00+09:00"
    return start, end


def _zero() -> dict:
    return {"paid_count": 0, "amount": 0, "supply": 0, "tax": 0,
            "refund_count": 0, "refund_amount": 0,
            "excluded_count": 0, "excluded_amount": 0}


# 매출로 잡지 않는 결제 유형 (테스트·수동 포인트지급 등)
_NON_REVENUE_TYPES = {"test_payment", "point_grant", "admin_grant", "manual", "free", "gift"}


def _is_real_revenue(row: dict) -> bool:
    """부가세 과세 매출 = status=paid 이면서 비매출 유형이 아닌 결제.
    (기존 인사이트/스튜디오 매출 화면과 동일하게 status=paid 기준. pg_provider는
    실데이터에서 비어있는 경우가 많아 조건으로 쓰지 않음.)"""
    if (row.get("status") or "") != "paid":
        return False
    return (row.get("payment_type") or "") not in _NON_REVENUE_TYPES


def _aggregate_payments(sb, table: str, start: str, end: str) -> dict:
    """paid_at 기준 분기 결제 집계. 비매출 유형은 제외 집계로 분리.
    by_type: 어떤 payment_type이 잡혔는지 진단용 (금액 이상 시 원인 파악)."""
    rows = (sb.table(table)
            .select("amount, supply_amount, tax_amount, status, refund_status, "
                    "refund_amount, paid_at, pg_provider, payment_type, order_name")
            .gte("paid_at", start).lt("paid_at", end)
            .limit(20000).execute().data or [])
    agg = _zero()
    by_type: dict[str, dict] = {}
    for r in rows:
        amt = int(r.get("amount") or 0)
        ptype = r.get("payment_type") or "(none)"
        if (r.get("status") or "") == "paid":
            bt = by_type.setdefault(ptype, {"count": 0, "amount": 0})
            bt["count"] += 1
            bt["amount"] += amt
        if _is_real_revenue(r):
            agg["paid_count"] += 1
            agg["amount"] += amt
            agg["supply"] += int(r.get("supply_amount") or 0)
            agg["tax"] += int(r.get("tax_amount") or 0)
        elif (r.get("status") or "") == "paid":
            agg["excluded_count"] += 1
            agg["excluded_amount"] += amt
        refund = int(r.get("refund_amount") or 0)
        if refund > 0 or (r.get("refund_status") or "") in ("refunded", "partial"):
            agg["refund_count"] += 1
            agg["refund_amount"] += refund
    agg["by_type"] = by_type
    return agg


_NUMERIC_KEYS = ("paid_count", "amount", "supply", "tax",
                 "refund_count", "refund_amount", "excluded_count", "excluded_amount")


def _merge_aggs(a: dict, b: dict) -> dict:
    """두 집계 합산 — 숫자 필드는 더하고 by_type(dict)은 유형별 병합."""
    out = {k: (a.get(k, 0) or 0) + (b.get(k, 0) or 0) for k in _NUMERIC_KEYS}
    bt: dict[str, dict] = {}
    for src in (a.get("by_type") or {}, b.get("by_type") or {}):
        for t, v in src.items():
            slot = bt.setdefault(t, {"count": 0, "amount": 0})
            slot["count"] += v.get("count", 0)
            slot["amount"] += v.get("amount", 0)
    out["by_type"] = bt
    return out


def _collect_insight(start: str, end: str) -> dict:
    """인사이트 payments + agency_payments 집계. 실패 시 {'error': ...}."""
    url = get_secret("maesil_insight_supabase_url") or ""
    key = get_secret("m_insight_service_role") or ""
    if not url or not key:
        return {"error": "maesil_insight_supabase_url / m_insight_service_role 미설정"}
    try:
        sb = create_client(url, key)
        core = _aggregate_payments(sb, "payments", start, end)
        try:  # 대행사 결제 — 테이블 없거나 실패해도 본 집계는 유지
            agency = _aggregate_payments(sb, "agency_payments", start, end)
        except Exception as e:
            logger.warning("[finance] insight agency_payments 실패: %s", e)
            agency = _zero()
        return _merge_aggs(core, agency)
    except Exception as e:
        logger.error("[finance] insight 매출 집계 실패: %s", e)
        return {"error": f"조회 실패: {str(e)[:180]}"}


def _collect_studio(start: str, end: str) -> dict:
    """스튜디오 payments 집계. 실패 시 {'error': ...}."""
    url = get_secret("maesil_studio_supabase_url") or ""
    key = get_secret("maesil_studio_service_role") or ""
    if not url or not key:
        return {"error": "maesil_studio_supabase_url / maesil_studio_service_role 미설정 (/settings에서 등록)"}
    try:
        sb = create_client(url, key)
        return _aggregate_payments(sb, "payments", start, end)
    except Exception as e:
        logger.error("[finance] studio 매출 집계 실패: %s", e)
        return {"error": f"조회 실패: {str(e)[:180]}"}


def fetch_system_sales(year: int, quarter: int) -> dict:
    """분기 시스템 매출 — 인사이트(일반+대행사) + 스튜디오. 시스템별 오류는 완전 격리
    (한쪽 시크릿이 잘못돼도 500 없이 error 필드로 반환)."""
    start, end = _bounds_kst(year, quarter)
    insight = _collect_insight(start, end)
    studio = _collect_studio(start, end)

    total = _zero()
    for agg in (insight, studio):
        if "error" not in agg:
            for k in total:
                total[k] += agg.get(k, 0)

    return {
        "period": {"start": start[:10], "end_exclusive": end[:10]},
        "insight": insight,
        "studio": studio,
        "total": total,
    }
