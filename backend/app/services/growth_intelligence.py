"""
growth_intelligence — Growth Intelligence 에이전트 분석 서비스

CS 대화 데이터를 분석해 소비자 의도, 불만 포인트, 개선 기회를 도출.
매출 데이터와 결합해 종합적인 비즈니스 인텔리전스 제공.

분석 유형:
  cs_patterns      — CS 대화 패턴 (자주 묻는 질문, 감정 분포, L3 갭)
  consumer_intent  — 소비자 의도 분류 (구매의향/불만/기능요청/이탈 신호)
  negative_signals — 부정 피드백 + 수정 패턴
  improvement_plan — 위 분석 결과 기반 개선 우선순위
  sales_summary    — 매출 인사이트 요약
"""
from __future__ import annotations

import logging
import re
from collections import Counter
from datetime import date, datetime, timezone, timedelta

from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)

# CS 분석 캐시 TTL — 동일 operator + type 분석을 이 시간 내 재실행하지 않음
_ANALYSIS_CACHE_TTL_SECONDS = 3600  # 1시간


# ─────────────────────────────────────────────────────────────────
# CS 패턴 분석
# ─────────────────────────────────────────────────────────────────

def analyze_cs_patterns(
    program: str = "maesil-insight",
    days: int = 30,
    limit: int = 500,
) -> dict:
    """CS 대화 패턴 분석.

    반환:
      total_conversations — 총 대화 수
      total_messages      — 총 메시지 수
      top_keywords        — 유저 질문 상위 키워드
      emotion_dist        — 감정 분포 (doubt/satisfaction/thinking/tired)
      layer_dist          — 레이어 분포 (l2/l2_5/l3)
      l3_rate             — L3 비율 (L2 미매칭 비율)
      l3_sample_questions — L3 처리된 질문 샘플
      avg_turns_per_conv  — 대화당 평균 턴 수
    """
    try:
        client = get_maesil_total_client()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        # 대화 목록
        conv_resp = (
            client.schema("agent_work").table("maeyo_conversations")
            .select("id")
            .eq("program", program)
            .gte("created_at", cutoff)
            .limit(limit)
            .execute()
        )
        conv_ids = [r["id"] for r in (conv_resp.data or [])]

        if not conv_ids:
            return {"error": "분석 기간 내 대화 없음", "total_conversations": 0}

        # 메시지 조회 (대화 ID 기준)
        msg_resp = (
            client.schema("agent_work").table("maeyo_messages")
            .select("role, content, emotion, layer, feedback, created_at")
            .in_("conversation_id", conv_ids[:200])  # 최대 200개 대화
            .execute()
        )
        messages = msg_resp.data or []

        user_msgs   = [m for m in messages if m.get("role") == "user"]
        assist_msgs = [m for m in messages if m.get("role") == "assistant"]

        # 키워드 빈도
        words: list[str] = []
        _STOPWORDS = {"어떻게", "무엇", "왜요", "있나요", "이유", "방법", "좀", "좀요",
                      "해요", "하나요", "하면", "되나요", "인지", "알려", "주세요"}
        for m in user_msgs:
            tokens = re.findall(r"[가-힣a-zA-Z]{2,}", m.get("content", ""))
            words.extend(t for t in tokens if t not in _STOPWORDS)
        top_keywords = [
            {"word": w, "count": c}
            for w, c in Counter(words).most_common(20)
        ]

        # 감정 분포
        emotion_dist = dict(Counter(
            m.get("emotion") for m in assist_msgs if m.get("emotion")
        ))

        # 레이어 분포
        layer_dist = dict(Counter(
            m.get("layer") for m in assist_msgs if m.get("layer")
        ))
        l3_count  = layer_dist.get("l3", 0)
        l2_count  = layer_dist.get("l2", 0) + layer_dist.get("l2_5", 0)
        total_resp = sum(layer_dist.values()) or 1
        l3_rate = round(l3_count / total_resp * 100, 1)

        # L3 처리된 질문 샘플 (L2가 답 못한 질문들)
        l3_conv_ids = {
            m.get("conversation_id") for m in assist_msgs if m.get("layer") == "l3"
        }
        l3_questions = [
            m.get("content", "")[:100]
            for m in user_msgs
            if m.get("conversation_id") in l3_conv_ids
        ][:15]

        # 평균 턴 수
        turns_per_conv = Counter(m.get("conversation_id") for m in messages)
        avg_turns = round(sum(turns_per_conv.values()) / max(len(turns_per_conv), 1), 1)

        return {
            "total_conversations": len(conv_ids),
            "total_messages": len(messages),
            "total_user_messages": len(user_msgs),
            "top_keywords": top_keywords,
            "emotion_dist": emotion_dist,
            "layer_dist": layer_dist,
            "l3_rate_pct": l3_rate,
            "l3_sample_questions": l3_questions,
            "avg_turns_per_conversation": avg_turns,
            "period_days": days,
        }
    except Exception as e:
        logger.warning("analyze_cs_patterns 실패: %s", e)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────
# 소비자 의도 분석
# ─────────────────────────────────────────────────────────────────

# 의도 키워드 사전
_INTENT_PATTERNS: dict[str, list[str]] = {
    "구매_문의": ["얼마", "가격", "요금", "구독", "결제", "무료", "체험", "가입", "플랜", "월"],
    "기능_요청": ["기능", "추가", "지원", "연동", "가능", "될까요", "있나요", "언제"],
    "오류_불만": ["안돼", "안되", "에러", "오류", "버그", "이상", "왜", "안나와", "실패", "문제"],
    "사용법_문의": ["어떻게", "방법", "사용", "설정", "연결", "등록", "입력", "하는"],
    "이탈_신호": ["취소", "해지", "탈퇴", "환불", "불편", "쓸모없", "별로", "실망"],
    "성과_확인": ["매출", "분석", "성과", "현황", "데이터", "통계", "결과", "리포트"],
}


def analyze_consumer_intent(
    program: str = "maesil-insight",
    days: int = 30,
) -> dict:
    """소비자 의도 분류 분석.

    CS 유저 메시지를 의도별로 분류해
    '어떤 니즈가 가장 많은지', '이탈 위험 신호가 얼마나 있는지' 파악.
    """
    try:
        client = get_maesil_total_client()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        conv_resp = (
            client.schema("agent_work").table("maeyo_conversations")
            .select("id")
            .eq("program", program)
            .gte("created_at", cutoff)
            .limit(300)
            .execute()
        )
        conv_ids = [r["id"] for r in (conv_resp.data or [])]
        if not conv_ids:
            return {"error": "분석 데이터 없음"}

        msg_resp = (
            client.schema("agent_work").table("maeyo_messages")
            .select("content, conversation_id")
            .eq("role", "user")
            .in_("conversation_id", conv_ids[:200])
            .execute()
        )
        user_msgs = msg_resp.data or []

        intent_counts: dict[str, int] = {k: 0 for k in _INTENT_PATTERNS}
        intent_samples: dict[str, list[str]] = {k: [] for k in _INTENT_PATTERNS}

        for m in user_msgs:
            content = m.get("content", "").lower()
            matched: list[str] = []
            for intent, keywords in _INTENT_PATTERNS.items():
                if any(kw in content for kw in keywords):
                    matched.append(intent)
                    intent_counts[intent] += 1
                    if len(intent_samples[intent]) < 5:
                        intent_samples[intent].append(m["content"][:80])

        total = len(user_msgs) or 1
        intent_pct = {
            k: {"count": v, "pct": round(v / total * 100, 1)}
            for k, v in sorted(intent_counts.items(), key=lambda x: -x[1])
        }

        # 이탈 위험 비율
        churn_rate = round(intent_counts.get("이탈_신호", 0) / total * 100, 1)
        # 기능 요청 비율 (제품 로드맵 힌트)
        feature_rate = round(intent_counts.get("기능_요청", 0) / total * 100, 1)

        return {
            "total_user_messages": len(user_msgs),
            "intent_distribution": intent_pct,
            "intent_samples": {k: v for k, v in intent_samples.items() if v},
            "churn_risk_pct": churn_rate,
            "feature_request_pct": feature_rate,
            "period_days": days,
        }
    except Exception as e:
        logger.warning("analyze_consumer_intent 실패: %s", e)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────
# 부정 신호 분석
# ─────────────────────────────────────────────────────────────────

def analyze_negative_signals(
    program: str = "maesil-insight",
    days: int = 30,
) -> dict:
    """부정 피드백 + 수정 패턴 분석.

    어떤 답변이 틀렸고, 어떤 영역에서 수정이 많은지 → L2 강화 우선순위 도출.
    """
    try:
        client = get_maesil_total_client()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        # 부정 피드백
        bad_resp = (
            client.schema("agent_work").table("maeyo_messages")
            .select("content, feedback, correction, corrected_at, layer")
            .eq("feedback", "bad")
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        bad_msgs = bad_resp.data or []

        # 수정된 메시지 (correction IS NOT NULL)
        corrected_resp = (
            client.schema("agent_work").table("maeyo_messages")
            .select("content, correction, layer")
            .not_.is_("correction", "null")
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        corrected_msgs = corrected_resp.data or []

        # 수정된 레이어 분포 (l2/l3 중 어디서 오류가 많은지)
        correction_layer_dist = dict(Counter(
            m.get("layer") for m in corrected_msgs if m.get("layer")
        ))

        # 수정 원본 샘플 (AI가 뭘 틀렸는지)
        wrong_answers = [
            {
                "wrong": m.get("content", "")[:100],
                "corrected_to": (m.get("correction") or "")[:100],
                "layer": m.get("layer"),
            }
            for m in corrected_msgs[:10]
        ]

        return {
            "negative_feedback_count": len(bad_msgs),
            "correction_count": len(corrected_msgs),
            "correction_by_layer": correction_layer_dist,
            "wrong_answer_samples": wrong_answers,
            "period_days": days,
        }
    except Exception as e:
        logger.warning("analyze_negative_signals 실패: %s", e)
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────
# 분석 결과 저장 / 조회
# ─────────────────────────────────────────────────────────────────

def save_growth_analysis(
    operator_id: str,
    program: str,
    analysis_type: str,
    summary: str,
    insights: list[dict] | None = None,
    improvement_items: list[dict] | None = None,
    data_snapshot: dict | None = None,
    period_days: int = 30,
) -> None:
    """분석 결과를 growth_analysis_results에 UPSERT."""
    if not operator_id or not summary:
        return
    try:
        get_maesil_total_client().schema("agent_work").table("growth_analysis_results").upsert(
            {
                "operator_id": operator_id,
                "program": program,
                "analysis_type": analysis_type,
                "summary": summary[:800],
                "insights": insights or [],
                "improvement_items": improvement_items or [],
                "data_snapshot": data_snapshot or {},
                "period_days": period_days,
                "updated_at": "now()",
            },
            on_conflict="operator_id,program,analysis_type",
        ).execute()
        logger.info("growth_analysis 저장 [%s/%s/%s]", operator_id, program, analysis_type)
    except Exception as e:
        logger.warning("growth_analysis 저장 실패: %s", e)


def load_recent_analyses(operator_id: str, program: str, limit: int = 5) -> list[dict]:
    """최근 분석 결과 조회 — 다음 실행 시 컨텍스트로 주입."""
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work").table("growth_analysis_results")
            .select("analysis_type, summary, period_days, updated_at")
            .eq("operator_id", operator_id)
            .eq("program", program)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning("growth_analysis 조회 실패: %s", e)
        return []


def build_analysis_context(analyses: list[dict]) -> str:
    """이전 분석 결과를 시스템 프롬프트 주입용 텍스트로 변환."""
    if not analyses:
        return ""
    lines = ["## 📊 이전 분석 결과 (동일 운영자)"]
    for a in analyses:
        atype = a.get("analysis_type", "")
        summary = a.get("summary", "")
        updated = (a.get("updated_at") or "")[:10]
        days = a.get("period_days", 30)
        lines.append(f"- [{atype}/{days}일] {summary[:200]} ({updated})")
    lines.append(
        "\n**활용**: 이전 분석과 비교해 변화 포인트를 강조하세요. "
        "이미 파악된 내용은 반복하지 말고 새로운 인사이트에 집중하세요."
    )
    return "\n".join(lines)


__all__ = [
    "analyze_cs_patterns",
    "analyze_consumer_intent",
    "analyze_negative_signals",
    "save_growth_analysis",
    "load_recent_analyses",
    "build_analysis_context",
]
