"""
채팅 / 오케스트레이터 엔드포인트.

Phase 1: 규칙 기반 라우팅 stub.
  - 키워드로 에이전트 타입 결정
  - agent_work.runs 에 기록
  - 실제 에이전트 실행은 Phase 2에서 구현

Phase 2: Claude Agent SDK 호출로 교체.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.autotool_client import get_autotool_client
from app.auth import require_bearer

router = APIRouter(prefix="/api/chat", tags=["chat"], dependencies=[Depends(require_bearer)])

# 규칙 기반 라우팅 테이블 (Phase 1)
ROUTING_RULES: list[tuple[list[str], str]] = [
    (["매출", "판매", "주문", "채널", "revenue", "sales"], "sales"),
    (["재무", "비용", "수익", "이익", "finance", "cost"], "finance"),
    (["재고", "발주", "입고", "출고", "warehouse", "inventory"], "warehouse"),
    (["cs", "고객", "상담", "클레임", "반품", "문의"], "cs"),
]

def route_agent(message: str) -> str:
    """키워드 매칭으로 에이전트 결정. 매칭 없으면 orchestrator가 직접 응답."""
    m = message.lower()
    for keywords, agent_type in ROUTING_RULES:
        if any(k in m for k in keywords):
            return agent_type
    return "orchestrator"

AGENT_DISPLAY = {
    "sales": "세일즈 에이전트",
    "finance": "파이낸스 에이전트",
    "warehouse": "웨어하우스 에이전트",
    "cs": "CS 에이전트",
    "orchestrator": "오케스트레이터",
}

PHASE_MAP = {
    "orchestrator": 1,
    "sales": 2,
    "finance": 2,
    "warehouse": 3,
    "cs": 3,
}


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    run_id: str
    agent_type: str
    agent_display: str
    message: str
    status: str


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    client = get_autotool_client()

    conversation_id = req.conversation_id or str(uuid.uuid4())
    run_id = str(uuid.uuid4())
    agent_type = route_agent(req.message)
    phase = PHASE_MAP.get(agent_type, 1)

    # agent_work.runs 에 기록
    now = datetime.now(timezone.utc).isoformat()
    client.schema("agent_work").table("runs").insert({
        "id": run_id,
        "conversation_id": conversation_id,
        "agent_type": agent_type,
        "status": "success",
        "started_at": now,
        "ended_at": now,
        "meta": {"source": "chat", "phase": phase},
    }).execute()

    # Phase 1 stub 응답
    if agent_type == "orchestrator":
        reply = (
            f"안녕하세요. 질문을 분석했지만 특정 에이전트 도메인으로 분류하지 못했습니다.\n"
            f"매출·판매, 재무·비용, 재고·발주, CS·고객 관련 질문을 해주세요.\n"
            f"(Phase 2에서 LLM 라우팅이 추가됩니다)"
        )
    else:
        reply = (
            f"[{AGENT_DISPLAY[agent_type]}] 요청을 수신했습니다.\n"
            f"Phase {phase} 에이전트입니다 — 실제 분석 기능은 Phase {phase} 구현 시 활성화됩니다.\n"
            f"현재는 라우팅 기록만 저장합니다. (run_id: {run_id[:8]}…)"
        )

    return ChatResponse(
        conversation_id=conversation_id,
        run_id=run_id,
        agent_type=agent_type,
        agent_display=AGENT_DISPLAY[agent_type],
        message=reply,
        status="success",
    )
