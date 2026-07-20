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


def _client(url_secret: str, key_secret: str):
    url = get_secret(url_secret) or ""
    key = get_secret(key_secret) or ""
    if not url or not key:
        return None
    return create_client(url, key)


def _zero() -> dict:
    return {"paid_count": 0, "amount": 0, "supply": 0, "tax": 0,
            "refund_count": 0, "refund_amount": 0}


def _aggregate_payments(sb, table: str, start: str, end: str) -> dict:
    """paid_at 기준 분기 내 결제 집계. status=paid만 매출로, 환불은 별도 표기."""
    rows = (sb.table(table)
            .select("amount, supply_amount, tax_amount, status, "
                    "refund_status, refund_amount, paid_at")
            .gte("paid_at", start).lt("paid_at", end)
            .limit(20000).execute().data or [])
    agg = _zero()
    for r in rows:
        amt = int(r.get("amount") or 0)
        if r.get("status") == "paid":
            agg["paid_count"] += 1
            agg["amount"] += amt
            agg["supply"] += int(r.get("supply_amount") or 0)
            agg["tax"] += int(r.get("tax_amount") or 0)
        refund = int(r.get("refund_amount") or 0)
        if refund > 0 or (r.get("refund_status") or "") in ("refunded", "partial"):
            agg["refund_count"] += 1
            agg["refund_amount"] += refund
    return agg


def fetch_system_sales(year: int, quarter: int) -> dict:
    """분기 시스템 매출 — 인사이트(일반+대행사) + 스튜디오. 시스템별 오류는 격리."""
    start, end = _bounds_kst(year, quarter)
    result: dict = {"period": {"start": start[:10], "end_exclusive": end[:10]}}
    total = _zero()

    # ── 매실인사이트 ──
    insight = _client("maesil_insight_supabase_url", "m_insight_service_role")
    if insight is None:
        result["insight"] = {"error": "maesil_insight_supabase_url / m_insight_service_role 미설정"}
    else:
        try:
            core = _aggregate_payments(insight, "payments", start, end)
            try:  # 대행사 결제 — 테이블 없거나 실패해도 본 집계는 유지
                agency = _aggregate_payments(insight, "agency_payments", start, end)
            except Exception as e:
                logger.warning("[finance] insight agency_payments 집계 실패: %s", e)
                agency = _zero()
            merged = {k: core[k] + agency[k] for k in core}
            result["insight"] = {**merged, "breakdown": {"payments": core, "agency_payments": agency}}
            for k in total:
                total[k] += merged[k]
        except Exception as e:
            logger.error("[finance] insight 매출 집계 실패: %s", e)
            result["insight"] = {"error": f"조회 실패: {str(e)[:150]}"}

    # ── 매실스튜디오 ──
    studio = _client("maesil_studio_supabase_url", "maesil_studio_service_role")
    if studio is None:
        result["studio"] = {"error": "maesil_studio_supabase_url / maesil_studio_service_role 미설정 (/settings에서 등록)"}
    else:
        try:
            agg = _aggregate_payments(studio, "payments", start, end)
            result["studio"] = agg
            for k in total:
                total[k] += agg[k]
        except Exception as e:
            logger.error("[finance] studio 매출 집계 실패: %s", e)
            result["studio"] = {"error": f"조회 실패: {str(e)[:150]}"}

    result["total"] = total
    return result
