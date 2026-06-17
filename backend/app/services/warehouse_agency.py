"""
창고 에이전시 — maesil-insight 재고·생산·출고 데이터 수집 + AI 진단 브리핑.

run_briefing() → {ok, headline, sections, alerts, raw_data}
  1. operator_id 조회
  2. 쿼리 템플릿으로 데이터 수집
     - 안전재고 이하 품목 (위험 재고)
     - 전체 재고 현황
     - 발주 계획 (이번달/다음달)
     - 생산 실적 (30일, 계획 vs 실제)
     - 진행 중 생산
     - 출고 현황 (30일, 채널별)
     - 출고 대기 / 반품
     - 재고 이동 순변동
  3. Claude Sonnet → 재고·생산·출고 통합 브리핑
  4. agency_briefings 저장
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


def _get_operator_id() -> str:
    from app.services.secrets import get_secret
    return get_secret("maesil-insight_operator_id") or ""


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


def _collect_data(operator_id: str) -> dict:
    today = date.today()
    ym_now = today.strftime("%Y-%m")
    # 이번달 + 다음달 발주 계획
    ym_from = (today.replace(day=1) - timedelta(days=1)).replace(day=1).strftime("%Y-%m")

    raw: dict = {}

    # 안전재고 이하 (위험 재고) — 즉시 발주 필요
    raw["low_stock"] = _query("warehouse.low_stock_items", {
        "operator_id": operator_id,
    })

    # 전체 재고 현황
    raw["inventory"] = _query("warehouse.inventory_status", {
        "operator_id": operator_id,
    })

    # 발주 계획 (최근 2개월)
    raw["purchase_plans"] = _query("warehouse.purchase_plans", {
        "operator_id": operator_id,
        "year_month_from": ym_from,
    })

    # 판매 추이 참조 (재고 소진 예측용 — 30일)
    raw["sales_30d"] = _query("sales.top_products", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
        "date_to": today.isoformat(),
    })[:15]

    # ── 생산 실적 (30일) ──
    raw["production_30d"] = _query("production.daily_output", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
        "date_to": today.isoformat(),
    })

    # 진행 중 / 예정 생산
    raw["production_in_progress"] = _query("production.in_progress", {
        "operator_id": operator_id,
    })

    # 월별 생산 요약 (최근 2개월)
    raw["production_monthly"] = _query("production.monthly_summary", {
        "operator_id": operator_id,
        "date_from": (today.replace(day=1) - timedelta(days=1)).replace(day=1).isoformat(),
    })

    # ── 출고 현황 (30일, 채널별) ──
    raw["shipments_30d"] = _query("shipment.daily_by_channel", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
        "date_to": today.isoformat(),
    })

    # 상품별 출고량 집계
    raw["shipment_products"] = _query("shipment.product_summary", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
        "date_to": today.isoformat(),
    })[:20]

    # 출고 대기
    raw["shipment_pending"] = _query("shipment.pending", {
        "operator_id": operator_id,
    })

    # 반품
    raw["returns_30d"] = _query("shipment.returns", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
    })

    # 재고 이동 순변동 (생산 입고 - 출고)
    raw["inventory_movement"] = _query("inventory.movement_summary", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=30)).isoformat(),
        "date_to": today.isoformat(),
    })

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    """Claude Sonnet → 창고/재고/생산/출고 통합 브리핑 JSON 생성."""
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(rows, max_rows=30) -> str:
        return json.dumps(rows[:max_rows], ensure_ascii=False, default=str)

    prompt = f"""당신은 매실인사이트의 창고·생산·출고 통합 에이전시입니다.
아래 실제 재고·생산·출고 데이터를 분석해 **정밀 운영 브리핑**을 작성하세요.
오늘 날짜: {today_str}

## 데이터

### 안전재고 이하 위험 품목
{_s(raw.get("low_stock", []))}

### 전체 재고 현황
{_s(raw.get("inventory", []))}

### 발주 계획 (최근 2개월)
{_s(raw.get("purchase_plans", []))}

### 최근 30일 판매 상위 상품
{_s(raw.get("sales_30d", []))}

### 최근 30일 생산 실적 (일별, 계획 vs 실제)
{_s(raw.get("production_30d", []))}

### 현재 진행 중/예정 생산
{_s(raw.get("production_in_progress", []))}

### 월별 생산 요약
{_s(raw.get("production_monthly", []))}

### 최근 30일 채널별 출고 현황
{_s(raw.get("shipments_30d", []))}

### 최근 30일 상품별 출고량
{_s(raw.get("shipment_products", []))}

### 출고 대기 건
{_s(raw.get("shipment_pending", []))}

### 최근 30일 반품
{_s(raw.get("returns_30d", []))}

### 재고 이동 순변동 (생산입고 - 출고)
{_s(raw.get("inventory_movement", []))}

## 브리핑 요구사항
1. **headline**: 창고·생산·출고 종합 상황 1줄 요약 (40자 이내)
2. **sections**: 6개 섹션
   - 위험 재고 현황 (stock_gap, lead_time 기준 발주 긴급도 등급화)
   - 전체 재고 건전성 (과잉/적정/부족 분류, 주요 품목)
   - 생산 실적 (계획 달성률, 진행 중 품목, 지연 리스크)
   - 출고 현황 (채널별 30일 출고량, 대기건 수, 반품율)
   - 재고 순변동 분석 (생산↔출고 흐름, net_change 위험 품목)
   - 발주·생산 액션 플랜 (이번달 필요 발주/생산 우선순위)
3. **alerts**: 즉시 조치 항목 (level: warning/critical)
   - critical: 재고 소진 임박(lead_time 내), 생산 달성률 70% 미만, 출고 장기 적체
   - warning: 발주 계획 미수립, 반품율 이상, net_change 음수 지속 품목

데이터 없는 섹션은 "연동 필요"라고 명시하세요.

JSON으로만 답하세요:
{{
  "headline": "...",
  "sections": [
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
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
    """창고 에이전시 브리핑 실행 + DB 저장."""
    operator_id = _get_operator_id()
    if not operator_id:
        return {"ok": False, "error": "maesil-insight_operator_id 시크릿 미설정"}

    today = date.today()
    raw = _collect_data(operator_id)

    all_empty = all(not v for v in raw.values())
    if all_empty:
        _save(agency_type="warehouse", status="no_data", operator_id=operator_id,
              headline="데이터 없음", sections=[], alerts=[], raw_data=raw,
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
