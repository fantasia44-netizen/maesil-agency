"""
영업 에이전시 — maesil-insight 매출·광고·손익 데이터 수집 + AI 브리핑.

run_briefing() → {ok, headline, sections, alerts, raw_data}
  1. operator_id 조회 (secrets)
  2. 쿼리 템플릿으로 데이터 수집 (LLM 없이 직접 pull)
     - 오늘 채널별 매출
     - 최근 30일 매출 추이
     - 이번달 월간 요약
     - 채널별 광고비/ROAS
     - 상위 판매 상품
     - 일별 손익 스냅샷
  3. Claude Sonnet → 종합 브리핑 생성
  4. agent_work.agency_briefings 저장
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

AGENT_TYPE = "sales"


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
        logger.warning("[sales_agency] 쿼리 실패 [%s]: %s", template_key, e)
        return []


def _fmt_won(amount) -> str:
    if amount is None:
        return "-"
    try:
        n = int(float(amount))
    except (TypeError, ValueError):
        return str(amount)
    if n >= 100_000_000:
        return f"{n / 100_000_000:.1f}억"
    if n >= 10_000:
        return f"{n / 10_000:.0f}만"
    return f"{n:,}"


def _collect_data(operator_id: str) -> dict:
    today = date.today()
    today_str = today.isoformat()
    d30_from = (today - timedelta(days=30)).isoformat()
    month_from = today.replace(day=1).isoformat()
    ym_from = today.strftime("%Y-%m")

    raw: dict = {}

    # 오늘 채널별 매출
    raw["today"] = _query("sales.today_revenue_by_channel", {
        "operator_id": operator_id,
        "target_date": today_str,
    })

    # 최근 30일 일별×채널 매출
    raw["revenue_30d"] = _query("sales.date_range_revenue", {
        "operator_id": operator_id,
        "date_from": d30_from,
        "date_to": today_str,
    })

    # 월별 요약 (최근 3개월)
    raw["monthly"] = _query("sales.monthly_summary", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=90)).isoformat(),
    })

    # 상위 상품 (30일)
    raw["top_products"] = _query("sales.top_products", {
        "operator_id": operator_id,
        "date_from": d30_from,
        "date_to": today_str,
    })[:10]

    # 채널별 광고비/ROAS (30일)
    raw["ad_spend"] = _query("finance.ad_spend_by_channel", {
        "operator_id": operator_id,
        "date_from": d30_from,
        "date_to": today_str,
    })

    # 일별 손익 (최근 14일)
    raw["profit"] = _query("finance.daily_profit_snapshot", {
        "operator_id": operator_id,
        "date_from": (today - timedelta(days=14)).isoformat(),
        "date_to": today_str,
    })

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    """Claude Sonnet → 영업 브리핑 JSON 생성."""
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(rows, max_rows=20) -> str:
        return json.dumps(rows[:max_rows], ensure_ascii=False, default=str)

    prompt = f"""당신은 매실인사이트의 영업 에이전시입니다.
아래 실제 매출·광고·손익 데이터를 보고 **정밀 브리핑**을 작성하세요.
오늘 날짜: {today_str}

## 데이터

### 오늘 채널별 매출
{_s(raw.get("today", []))}

### 최근 30일 일별×채널 매출
{_s(raw.get("revenue_30d", []), 60)}

### 월별 요약 (최근 3개월)
{_s(raw.get("monthly", []))}

### 상위 판매 상품 TOP10 (30일)
{_s(raw.get("top_products", []))}

### 채널별 광고비/ROAS (30일)
{_s(raw.get("ad_spend", []))}

### 일별 손익 스냅샷 (최근 14일)
{_s(raw.get("profit", []), 30)}

## 브리핑 요구사항
1. **headline**: 오늘 영업 상황 1줄 요약 (숫자 포함, 40자 이내)
2. **sections**: 4개 섹션
   - 오늘 매출 현황 (채널별 실적, 전일/전월 대비 이상 포착)
   - 30일 트렌드 분석 (성장/하락 채널, MoM 변화)
   - 광고 효율 (채널별 ROAS, 비효율 채널 지목)
   - 손익 요약 (순이익, 마진율, 광고비 비중)
3. **alerts**: 즉시 조치 필요 항목 (level: warning/critical, message: 구체적 수치 포함)

데이터가 없는 항목은 "데이터 없음"으로 표기하고 계속 진행하세요.

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
        logger.error("[sales_agency] Sonnet 실패: %s", e)
        return {}


def run_briefing() -> dict:
    """영업 에이전시 브리핑 실행 + DB 저장."""
    operator_id = _get_operator_id()
    if not operator_id:
        return {"ok": False, "error": "maesil-insight_operator_id 시크릿 미설정"}

    today = date.today()
    raw = _collect_data(operator_id)

    # 전체 데이터 없음 체크
    all_empty = all(not v for v in raw.values())
    if all_empty:
        _save(agency_type="sales", status="no_data", operator_id=operator_id,
              headline="데이터 없음", sections=[], alerts=[], raw_data=raw,
              period_from=today, period_to=today)
        return {"ok": True, "status": "no_data", "message": "수집된 데이터가 없습니다"}

    ai = _sonnet_briefing(raw)
    headline = ai.get("headline") or "영업 현황 브리핑"
    sections = ai.get("sections") or []
    alerts = ai.get("alerts") or []

    _save(agency_type="sales", status="ok", operator_id=operator_id,
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
        logger.error("[sales_agency] DB 저장 실패: %s", e)
