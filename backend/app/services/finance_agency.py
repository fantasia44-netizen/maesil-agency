"""
재무 에이전시 — 정산·지출·수익성 분석 브리핑.

실제 연동 테이블 (maesil-insight):
  - api_settlements : 채널별 정산
  - expenses        : 지출 내역
  - channel_costs   : 채널별 수수료 구조
  - daily_revenue   : 일별 매출
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

AGENT_TYPE = "finance"


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
        logger.warning("[finance_agency] 쿼리 실패 [%s]: %s", template_key, e)
        return []


def _collect_data() -> dict:
    today = date.today()
    d30_from = (today - timedelta(days=30)).isoformat()
    d14_from = (today - timedelta(days=14)).isoformat()
    d90_from = (today - timedelta(days=90)).isoformat()
    today_str = today.isoformat()

    raw: dict = {}

    # 채널별 정산 (최근 30일)
    raw["settlements_30d"] = _query("finance.settlement_summary", {
        "date_from": d30_from,
        "date_to": today_str,
    })

    # 채널별 정산 (최근 90일 — 월별 비교용)
    raw["settlements_90d"] = _query("finance.settlement_summary", {
        "date_from": d90_from,
        "date_to": today_str,
    })

    # 지출 내역 (최근 30일)
    raw["expenses_30d"] = _query("finance.expenses_by_category", {
        "date_from": d30_from,
        "date_to": today_str,
    })

    # 일별 매출 (최근 14일)
    raw["revenue_14d"] = _query("finance.daily_revenue", {
        "date_from": d14_from,
        "date_to": today_str,
    })

    # 채널별 수수료 구조
    raw["channel_costs"] = _query("finance.ad_spend_by_channel", {})

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(rows, max_rows=30) -> str:
        if isinstance(rows, list):
            return json.dumps(rows[:max_rows], ensure_ascii=False, default=str)
        return str(rows)

    prompt = f"""당신은 매실인사이트의 재무 에이전시(자비스)입니다.
아래 정산·지출·매출 데이터를 분석해 **재무 브리핑**을 작성하세요.
오늘 날짜: {today_str}

## 데이터

### 채널별 정산 현황 (최근 30일, api_settlements)
{_s(raw.get("settlements_30d", []))}

### 채널별 정산 현황 (최근 90일 — 월별 추이)
{_s(raw.get("settlements_90d", []), 60)}

### 지출 내역 카테고리별 (최근 30일, expenses)
{_s(raw.get("expenses_30d", []))}

### 일별 매출 (최근 14일, daily_revenue)
{_s(raw.get("revenue_14d", []))}

### 채널별 수수료·비용 구조 (channel_costs)
{_s(raw.get("channel_costs", []))}

## 브리핑 요구사항
1. **headline**: 재무 상황 1줄 요약 (순정산액·지출 수치 포함, 40자 이내)
2. **sections**: 4개 섹션 (수치 중심)
   - 정산 현황: 채널별 gross_sales vs net_settlement, 수수료 공제율
   - 월별 추이: 최근 3개월 정산 증감, 성장/하락 채널
   - 지출 분석: 카테고리별 지출 비중, 이상 항목, 고정비 추정
   - 수익성 추정: 매출 대비 정산·지출 기준 예상 마진
3. **alerts**: 즉시 조치 항목 (없으면 빈 배열)
   - critical: 정산액 전월 대비 -30% 이상, 지출 급증
   - warning: 수수료율 이상, 미정산 채널

데이터 없는 항목은 "데이터 없음"으로 표기하세요.

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
        logger.error("[finance_agency] Sonnet 실패: %s", e)
        return {}


def run_briefing() -> dict:
    from app.services.secrets import get_secret
    operator_id = get_secret("maesil-insight_operator_id") or ""

    today = date.today()
    raw = _collect_data()

    all_empty = all(not v for v in raw.values())
    if all_empty:
        _save(status="no_data", operator_id=operator_id,
              headline="재무 데이터 없음", sections=[], alerts=[], raw_data=raw,
              period_from=today, period_to=today)
        return {"ok": True, "status": "no_data"}

    ai = _sonnet_briefing(raw)
    headline = ai.get("headline") or "재무 현황 브리핑"
    sections = ai.get("sections") or []
    alerts = ai.get("alerts") or []

    _save(status="ok", operator_id=operator_id,
          headline=headline, sections=sections, alerts=alerts, raw_data=raw,
          period_from=today - timedelta(days=30), period_to=today)

    return {"ok": True, "headline": headline, "sections": sections, "alerts": alerts}


def _save(*, status: str, operator_id: str, headline: str,
          sections: list, alerts: list, raw_data: dict,
          period_from, period_to, error_msg: str | None = None):
    now = datetime.now(timezone.utc).isoformat()
    try:
        _db().table("agency_briefings").insert({
            "agency_type": "finance",
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
        logger.error("[finance_agency] DB 저장 실패: %s", e)
