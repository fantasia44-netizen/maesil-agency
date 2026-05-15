"""OutreachAgent — GrowthAgent thin wrapper (하위 호환용).

영업 타겟 발굴·제안서 생성은 모두 GrowthAgent가 처리합니다.
직접 인스턴스화하는 외부 코드가 있을 경우를 위해 유지.
"""
from __future__ import annotations

from typing import Any

from app.agents.growth import GrowthAgent


class OutreachAgent(GrowthAgent):
    """GrowthAgent의 alias — agent_type만 'outreach'로 유지."""

    agent_type = "outreach"

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
        result["agent_type"] = self.agent_type
        return result
