"""SalesAgent — GrowthAgent thin wrapper (하위 호환용).

매출·판매 분석 요청은 모두 GrowthAgent가 처리합니다.
직접 인스턴스화하는 외부 코드가 있을 경우를 위해 유지.
"""
from __future__ import annotations

from typing import Any

from app.agents.growth import GrowthAgent


class SalesAgent(GrowthAgent):
    """GrowthAgent의 alias — agent_type만 'sales'로 유지."""

    agent_type = "sales"

    def run(
        self,
        message: str,
        conversation_id: str,
        run_id: str | None = None,
        operator_id: str | None = None,
        context_messages: list[dict] | None = None,
    ) -> dict[str, Any]:
        result = super().run(
            message=message,
            conversation_id=conversation_id,
            run_id=run_id,
            operator_id=operator_id,
            context_messages=context_messages,
        )
        # agent_type을 호출자 기대값으로 덮어씀
        result["agent_type"] = self.agent_type
        return result
