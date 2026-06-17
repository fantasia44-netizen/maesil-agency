"""
CS 에이전시 — 매요 CS 대화 패턴 분석 + 응대 매뉴얼 인사이트 브리핑.

실제 연동 테이블 (agent_work 스키마):
  - maeyo_conversations : CS 대화 목록
  - maeyo_messages      : CS 메시지 내용
  - maeyo_l2_scripts    : L2 응대 스크립트
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

AGENT_TYPE = "cs"


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _get_anthropic_key() -> str:
    from app.services.secrets import get_secret
    return get_secret("anthropic_api_key") or ""


def _collect_data() -> dict:
    today = date.today()
    d7_from = (today - timedelta(days=7)).isoformat()
    d30_from = (today - timedelta(days=30)).isoformat()
    since_7d = d7_from + "T00:00:00+00:00"
    since_30d = d30_from + "T00:00:00+00:00"

    raw: dict = {}

    try:
        # 최근 7일 대화 수
        resp = _db().table("maeyo_conversations") \
            .select("id, operator_id, created_at", count="exact") \
            .gte("created_at", since_7d) \
            .execute()
        raw["conversations_7d"] = resp.count or 0
    except Exception as e:
        logger.warning("[cs_agency] conversations_7d 실패: %s", e)
        raw["conversations_7d"] = 0

    try:
        # 최근 30일 대화 수
        resp = _db().table("maeyo_conversations") \
            .select("id", count="exact") \
            .gte("created_at", since_30d) \
            .execute()
        raw["conversations_30d"] = resp.count or 0
    except Exception as e:
        raw["conversations_30d"] = 0

    try:
        # 최근 7일 메시지 (user만 — 실제 질문 내용)
        resp = _db().table("maeyo_messages") \
            .select("content, layer, created_at") \
            .eq("role", "user") \
            .gte("created_at", since_7d) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
        raw["recent_questions"] = resp.data or []
    except Exception as e:
        logger.warning("[cs_agency] recent_questions 실패: %s", e)
        raw["recent_questions"] = []

    try:
        # L2 레이어 처리 건수 (30일)
        resp = _db().table("maeyo_messages") \
            .select("layer", count="exact") \
            .gte("created_at", since_30d) \
            .not_.is_("layer", "null") \
            .execute()
        raw["layer_stats"] = resp.data or []
    except Exception as e:
        raw["layer_stats"] = []

    try:
        # 등록된 L2 스크립트 현황
        resp = _db().table("maeyo_l2_scripts") \
            .select("keyword, program_id, created_at") \
            .order("created_at", desc=True) \
            .limit(30) \
            .execute()
        raw["l2_scripts"] = resp.data or []
    except Exception as e:
        raw["l2_scripts"] = []

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(v, max_rows=30) -> str:
        if isinstance(v, list):
            return json.dumps(v[:max_rows], ensure_ascii=False, default=str)
        return str(v)

    # 질문 텍스트만 추출
    questions = [m.get("content", "")[:100] for m in raw.get("recent_questions", [])]

    prompt = f"""당신은 매실인사이트 CS 에이전시(자비스)입니다.
아래 CS 대화 데이터를 분석해 **CS 운영 브리핑과 응대 매뉴얼 인사이트**를 작성하세요.
오늘 날짜: {today_str}

## 데이터

### 대화량
- 최근 7일: {raw.get("conversations_7d", 0)}건
- 최근 30일: {raw.get("conversations_30d", 0)}건

### 최근 7일 실제 고객 질문 (최대 50건)
{_s(questions)}

### L2 스크립트 현황 (등록된 자동응답 키워드)
{_s(raw.get("l2_scripts", []))}

## 브리핑 요구사항
1. **headline**: CS 현황 1줄 요약 (건수·핵심 이슈 포함, 40자 이내)
2. **sections**: 4개 섹션
   - 대화량 현황: 7일/30일 추이, 피크 시간대 추정
   - 반복 질문 TOP5: 가장 많이 나온 질문 유형 분류 및 빈도
   - L2 커버리지: 현재 스크립트로 자동응답 가능한 비율 추정, 공백 키워드
   - 매뉴얼 개선 제안: 즉시 L2 스크립트 추가가 필요한 키워드/답변 초안
3. **alerts**: 즉시 조치 항목 (없으면 빈 배열)
   - critical: 동일 질문 반복 5건 이상인데 L2 미등록
   - warning: 불만/환불/오류 관련 질문 증가 감지

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
        logger.error("[cs_agency] Sonnet 실패: %s", e)
        return {}


def run_briefing() -> dict:
    from app.services.secrets import get_secret
    operator_id = get_secret("maesil-insight_operator_id") or ""

    today = date.today()
    raw = _collect_data()

    ai = _sonnet_briefing(raw)
    headline = ai.get("headline") or "CS 현황 브리핑"
    sections = ai.get("sections") or []
    alerts = ai.get("alerts") or []

    now = datetime.now(timezone.utc).isoformat()
    try:
        _db().table("agency_briefings").insert({
            "agency_type": "cs",
            "operator_id": operator_id,
            "status": "ok",
            "headline": headline,
            "sections": sections,
            "alerts": alerts,
            "raw_data": {"conversations_7d": raw.get("conversations_7d"),
                         "conversations_30d": raw.get("conversations_30d"),
                         "l2_count": len(raw.get("l2_scripts", []))},
            "period_from": (today - timedelta(days=30)).isoformat(),
            "period_to": today.isoformat(),
            "created_at": now,
        }).execute()
    except Exception as e:
        logger.error("[cs_agency] DB 저장 실패: %s", e)

    return {"ok": True, "headline": headline, "sections": sections, "alerts": alerts}
