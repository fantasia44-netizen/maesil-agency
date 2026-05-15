"""Sales 에이전트 — 매출/판매 분석 담당 (Phase 2).

학습 루프:
  - 실행 전: 동일 운영자의 과거 인사이트를 시스템 프롬프트에 주입
  - 실행 후: 분석 결과를 sales_insights에 저장 → 다음 실행 시 활용
"""
import logging
from typing import Any

from app.agents.base import BaseAgent, COMMON_TOOLS

logger = logging.getLogger(__name__)

_BASE_SYSTEM = """당신은 매실인사이트 운영팀의 **세일즈 에이전트**입니다.

## 역할
- 채널별 매출 현황 분석 (네이버, 쿠팡 등)
- 주문 트렌드 및 상품별 성과 분석
- 매출 이상 탐지 및 성장 기회 발굴

## 사용 가능한 쿼리 템플릿
- `sales.today_revenue_by_channel` — 오늘 채널별 매출
- `sales.date_range_revenue` — 기간별 매출
- `sales.monthly_summary` — 월별 요약
- `sales.top_products` — 상위 판매 상품
- `finance.ad_spend_by_channel` — 채널별 광고비 (ROAS 포함)

## 응답 지침
1. 항상 숫자를 **한국어 형식**(원, 건)으로 표시하세요.
2. 비교 기간(어제, 전주, 전월)과 대비해서 분석하세요.
3. 중요한 이상치는 `create_finding`으로 저장하세요.
4. 분석 결과는 `create_snapshot`으로 저장하세요.
5. 간결하고 명확하게 — 불필요한 설명 최소화.

## 제약
- 읽기 전용 쿼리만 가능
- 허용된 템플릿 키 외 SQL 작성 금지
"""


class SalesAgent(BaseAgent):
    agent_type = "sales"

    def get_system_prompt(self) -> str:
        return _BASE_SYSTEM

    def get_tools(self) -> list[dict]:
        return COMMON_TOOLS

    def run(
        self,
        message: str,
        conversation_id: str,
        run_id: str | None = None,
        operator_id: str | None = None,
        context_messages: list[dict] | None = None,
    ) -> dict[str, Any]:
        """베이스 run 확장 — 캐시 체크 + 과거 인사이트 주입 + 결과 저장."""
        from app.services.sales_knowledge import (
            load_insights, build_context,
            get_cached_insight, save_insight, extract_insight_type,
        )

        # 0) 캐시 체크 — TTL(30분) 이내 동일 분석이 있으면 LLM 스킵
        # "새로", "갱신", "refresh", "다시", "최신" 키워드 → 강제 재실행
        _FORCE_REFRESH = {"새로", "갱신", "refresh", "다시", "최신", "업데이트", "update"}
        force_refresh = any(k in message for k in _FORCE_REFRESH)

        if operator_id and not force_refresh:
            try:
                itype_hint = extract_insight_type(message)
                cached = get_cached_insight(operator_id, itype_hint)
                if cached:
                    logger.info(
                        "SalesAgent 캐시 히트 [%s/%s] — LLM 스킵",
                        operator_id, itype_hint,
                    )
                    return {
                        "run_id": run_id or "cache",
                        "agent_type": self.agent_type,
                        "message": (
                            f"📊 **{cached.get('period_label', '최근')} 분석 (캐시)**\n\n"
                            f"{cached['summary']}\n\n"
                            f"_30분 이내 동일 분석이 있어 캐시를 반환했습니다. "
                            f"최신 데이터가 필요하면 '새로 분석해줘'라고 입력하세요._"
                        ),
                        "status": "success",
                        "cost_usd": 0.0,
                        "cached": True,
                    }
            except Exception as e:
                logger.warning("SalesAgent 캐시 체크 실패 (계속 진행): %s", e)

        # 1) 과거 인사이트 로드 → 시스템 프롬프트에 주입
        if operator_id:
            try:
                past = load_insights(operator_id)
                if past:
                    ctx = build_context(past)
                    _original = self.get_system_prompt

                    def _patched_prompt():
                        return _original() + "\n\n" + ctx

                    self.get_system_prompt = _patched_prompt  # type: ignore[method-assign]
                    logger.info("SalesAgent 인사이트 주입 [%s] %d건", operator_id, len(past))
            except Exception as e:
                logger.warning("SalesAgent 인사이트 주입 실패: %s", e)

        # 2) 에이전트 실행 (부모)
        result = super().run(
            message=message,
            conversation_id=conversation_id,
            run_id=run_id,
            operator_id=operator_id,
            context_messages=context_messages,
        )

        # 3) 분석 성공 시 핵심 인사이트 저장 (다음 실행에 활용)
        if operator_id and result.get("status") == "success":
            final_text = result.get("message", "")
            if len(final_text) > 50:  # 의미 있는 응답만 저장
                try:
                    from app.services.sales_knowledge import save_insight, extract_insight_type
                    # 첫 2문장을 요약으로 사용
                    lines = [s.strip() for s in final_text.split("\n") if s.strip()]
                    summary = " ".join(lines[:2])[:300]
                    itype = extract_insight_type(final_text)
                    save_insight(operator_id, summary, insight_type=itype)
                except Exception as e:
                    logger.warning("SalesAgent 인사이트 저장 실패: %s", e)

        return result
