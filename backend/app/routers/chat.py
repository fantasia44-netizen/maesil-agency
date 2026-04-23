"""
채팅 / 오케스트레이터 엔드포인트.

Phase 1 → Phase 2: 실제 Claude 에이전트 호출.
- /api/chat           일반 대화 (오케스트레이터 라우팅)
- /api/chat/briefing  아침 현황 보고 (전 에이전트 실행)
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_bearer

router = APIRouter(prefix="/api/chat", tags=["chat"], dependencies=[Depends(require_bearer)])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class AgentResult(BaseModel):
    run_id: str
    agent_type: str
    agent_display: str
    message: str
    status: str
    cost_usd: float = 0.0


class ChatResponse(BaseModel):
    conversation_id: str
    agents: list[AgentResult]
    routed_to: list[str]


AGENT_DISPLAY = {
    "sales": "세일즈 에이전트",
    "finance": "파이낸스 에이전트",
    "warehouse": "웨어하우스 에이전트",
    "cs": "CS 에이전트",
    "orchestrator": "오케스트레이터",
}


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    from app.agents.orchestrator import route, run_agents

    conversation_id = req.conversation_id or str(uuid.uuid4())
    agent_types = route(req.message)

    results = run_agents(req.message, conversation_id, agent_types)
    agents = [
        AgentResult(
            run_id=r["run_id"],
            agent_type=r["agent_type"],
            agent_display=AGENT_DISPLAY.get(r["agent_type"], r["agent_type"]),
            message=r["message"],
            status=r.get("status", "unknown"),
            cost_usd=r.get("cost_usd", 0.0),
        )
        for r in results
    ]

    return ChatResponse(
        conversation_id=conversation_id,
        agents=agents,
        routed_to=agent_types,
    )


@router.post("/briefing", response_model=ChatResponse)
def morning_briefing(req: ChatRequest | None = None) -> ChatResponse:
    """아침 현황 보고 — 전 에이전트 일괄 실행."""
    from app.agents.orchestrator import run_morning_briefing

    conversation_id = (req.conversation_id if req else None) or str(uuid.uuid4())
    results = run_morning_briefing(conversation_id)

    agents = [
        AgentResult(
            run_id=r["run_id"],
            agent_type=r["agent_type"],
            agent_display=AGENT_DISPLAY.get(r["agent_type"], r["agent_type"]),
            message=r["message"],
            status=r.get("status", "unknown"),
            cost_usd=r.get("cost_usd", 0.0),
        )
        for r in results
    ]

    return ChatResponse(
        conversation_id=conversation_id,
        agents=agents,
        routed_to=["sales", "finance", "warehouse", "cs"],
    )
