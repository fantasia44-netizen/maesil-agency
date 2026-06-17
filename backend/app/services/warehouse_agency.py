"""
창고 에이전시 — maesil-insight 재고·출고 데이터 수집 + AI 진단 브리핑.

실제 연동 테이블:
  - inventory          : 재고 현황 (current_stock, safety_stock)
  - outbound_logs      : 출고 기록
  - api_orders         : 판매 추이 (재고 소진 예측용)
  - purchase_orders    : 발주 현황
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

AGENT_TYPE = "warehouse"


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _get_anthropic_key() -> str:
    from app.services.secrets import get_secret
    return get_secret("anthropic_api_key") or ""


def _query(template_key: str, params: dict) -> list[dict]:
    from app.tools.db_tools import run_readonly_sql
    try:
        return run_readonly_sql(template_key, params, agent_type=AGENT_TYPE)
    except Exception as e:
        logger.warning("[warehouse_agency] 쿼리 실패 [%s]: %s", template_key, e)
        return []


def _collect_data() -> dict:
    today = date.today()
    d30_from = (today - timedelta(days=30)).isoformat()
    today_str = today.isoformat()

    raw: dict = {}

    # 안전재고 이하 위험 품목
    raw["low_stock"] = _query("warehouse.low_stock_items", {})

    # 전체 재고 현황
    raw["inventory"] = _query("warehouse.inventory_status", {})

    # 발주 현황
    raw["purchase_orders"] = _query("warehouse.purchase_plans", {
        "since": (today - timedelta(days=90)).isoformat() + "T00:00:00+00:00",
    })

    # 최근 30일 판매 상위 상품 (재고 소진 예측용)
    raw["sales_30d"] = _query("sales.top_products", {
        "date_from": d30_from,
        "date_to": today_str,
    })[:15]

    # 최근 30일 출고 현황
    raw["outbound_30d"] = _query("outbound.daily_by_channel", {
        "date_from": d30_from,
        "date_to": today_str,
    })

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(rows, max_rows=30) -> str:
        return json.dumps(rows[:max_rows], ensure_ascii=False, default=str)

    prompt = f"""당신은 매실인사이트의 창고·재고 관리 에이전시(자비스)입니다.
아래 실제 재고·출고·판매 데이터를 분석해 **정밀 운영 브리핑**을 작성하세요.
오늘 날짜: {today_str}

## 데이터

### 안전재고 이하 위험 품목 (즉시 발주 필요)
{_s(raw.get("low_stock", []))}

### 전체 재고 현황 (inventory)
{_s(raw.get("inventory", []))}

### 발주 현황 (purchase_orders, 최근 90일)
{_s(raw.get("purchase_orders", []))}

### 최근 30일 판매 상위 상품 (재고 소진 속도 참조)
{_s(raw.get("sales_30d", []))}

### 최근 30일 출고 현황 (outbound_logs)
{_s(raw.get("outbound_30d", []))}

## 브리핑 요구사항
1. **headline**: 재고 상황 1줄 요약 (위험 품목 수·재고 수치 포함, 40자 이내)
2. **sections**: 4개 섹션 (수치 중심)
   - 재고 현황: 총 SKU 수, 위험재고 품목, 재고 많은/적은 상품 TOP3
   - 소진 예측: 판매 속도 기준 재고 소진 예상 품목 (일수 계산)
   - 출고 현황: 30일 출고 상위 상품, 이상 감지
   - 발주 액션: 즉시 발주 필요 품목·수량, 우선순위
3. **alerts**: 즉시 조치 항목 (없으면 빈 배열)
   - critical: 재고 0 임박, 안전재고 50% 미만
   - warning: 발주 계획 미수립, 유통기한 임박(expiry_date 기준)

데이터 없는 섹션은 "연동 필요"로 표기하세요.

JSON으로만 답하세요:
{{
  "headline": "...",
  "sections": [
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}}
  ],
  "alerts": [
    {{"level": "warning|critical", "message": "..."}}
  ]
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error("[warehouse_agency] Sonnet 실패: %s", e)
        return {}


def run_briefing() -> dict:
    from app.services.secrets import get_secret
    operator_id = get_secret("maesil-insight_operator_id") or ""

    today = date.today()
    raw = _collect_data()

    all_empty = all(not v for v in raw.values())
    if all_empty:
        _save(agency_type="warehouse", status="no_data", operator_id=operator_id,
              headline="재고 데이터 없음", sections=[], alerts=[], raw_data=raw,
              period_from=today, period_to=today)
        return {"ok": True, "status": "no_data", "message": "재고 데이터가 없습니다"}

    ai = _sonnet_briefing(raw)
    headline = ai.get("headline") or "창고·재고 현황 브리핑"
    sections = ai.get("sections") or []
    alerts = ai.get("alerts") or []

    _save(agency_type="warehouse", status="ok", operator_id=operator_id,
          headline=headline, sections=sections, alerts=alerts, raw_data=raw,
          period_from=today - timedelta(days=30), period_to=today)

    return {"ok": True, "headline": headline, "sections": sections, "alerts": alerts}


def _save(*, agency_type: str, status: str, operator_id: str,
          headline: str, sections: list, alerts: list, raw_data: dict,
          period_from, period_to, error_msg: str | None = None):
    now = datetime.now(timezone.utc).isoformat()
    try:
        _db().table("agency_briefings").insert({
            "agency_type": agency_type,
            "operator_id": operator_id,
            "status": status,
            "headline": headline,
            "sections": sections,
            "alerts": alerts,
            "raw_data": raw_data,
            "error_msg": error_msg,
            "period_from": period_from.isoformat() if period_from else None,
            "period_to": period_to.isoformat() if period_to else None,
            "created_at": now,
        }).execute()
    except Exception as e:
        logger.error("[warehouse_agency] DB 저장 실패: %s", e)
