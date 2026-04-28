"""
채팅 / 오케스트레이터 엔드포인트.
- /api/chat                일반 대화 (오케스트레이터 라우팅)
- /api/chat/briefing       아침 현황 보고 (전 에이전트 실행)
- /api/chat/conversations  대화 목록
- /api/chat/conversations/{id}  특정 대화 메시지
"""
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.services import conversations as conv_svc

router = APIRouter(prefix="/api/chat", tags=["chat"])

AGENT_DISPLAY = {
    "sales":        "세일즈 에이전트",
    "finance":      "파이낸스 에이전트",
    "warehouse":    "웨어하우스 에이전트",
    "cs":           "CS 에이전트",
    "tester":       "테스터 에이전트",
    "developer":    "개발 에이전트",
    "orchestrator": "오케스트레이터",
}

DEV_KEYWORDS = {
    "에러", "error", "버그", "bug", "수정", "fix", "코드", "code",
    "배포", "deploy", "로그", "log", "traceback", "exception",
    "pr", "커밋", "commit", "github", "깃", "고쳐", "분석",
}


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


def _save_results(
    conversation_id: str,
    user_message: str,
    results: list[dict],
    user_id: str | None = None,
) -> None:
    """대화 내용을 DB에 저장 (오류 시 무시)."""
    try:
        conv_svc.ensure_conversation(conversation_id, user_message, user_id=user_id)
        conv_svc.save_user_message(conversation_id, user_message)
        for r in results:
            if r.get("message"):
                conv_svc.save_agent_message(
                    conversation_id=conversation_id,
                    agent_type=r["agent_type"],
                    agent_display=AGENT_DISPLAY.get(r["agent_type"], r["agent_type"]),
                    content=r["message"],
                    cost_usd=r.get("cost_usd", 0.0),
                    run_id=r.get("run_id"),
                )
    except Exception:
        pass  # 저장 실패가 응답을 깨지 않도록


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest, user: UserContext = Depends(get_current_user)) -> ChatResponse:
    from app.services import dev_chat_agent

    conversation_id = req.conversation_id or str(uuid.uuid4())
    msg_lower = req.message.lower()

    # ── customer는 개발 에이전트 사용 불가 ──
    is_dev = user.is_super_admin and any(k in msg_lower for k in DEV_KEYWORDS)
    is_approve = user.is_super_admin and dev_chat_agent.is_approve(req.message)
    is_cancel = user.is_super_admin and dev_chat_agent.is_cancel(req.message)

    if is_approve and conversation_id in dev_chat_agent._pending:
        response_text = dev_chat_agent.execute_pending(conversation_id)
        agent_type = "developer"
    elif is_cancel:
        response_text = dev_chat_agent.cancel_pending(conversation_id)
        agent_type = "developer"
    elif is_dev:
        try:
            ctx = conv_svc.get_messages(conversation_id)
        except Exception:
            ctx = []
        response_text = dev_chat_agent.analyze_and_propose(req.message, conversation_id, ctx)
        agent_type = "developer"
    else:
        # 오케스트레이터 흐름 — operator_id는 JWT에서
        from app.agents.orchestrator import route, run_agents
        operator_id = user.operator_id  # customer: insight_operator_id, super_admin: secrets에서
        agent_types = route(req.message)
        results = run_agents(req.message, conversation_id, agent_types, operator_id=operator_id)
        _save_results(conversation_id, req.message, results, user_id=user.id)
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
        return ChatResponse(conversation_id=conversation_id, agents=agents, routed_to=agent_types)

    # 개발 에이전트 결과 저장
    run_id = str(uuid.uuid4())
    _save_results(conversation_id, req.message, [{
        "run_id": run_id,
        "agent_type": agent_type,
        "message": response_text,
        "status": "success",
        "cost_usd": 0.0,
    }], user_id=user.id)

    return ChatResponse(
        conversation_id=conversation_id,
        agents=[AgentResult(
            run_id=run_id,
            agent_type=agent_type,
            agent_display=AGENT_DISPLAY["developer"],
            message=response_text,
            status="success",
        )],
        routed_to=[agent_type],
    )


@router.post("/briefing", response_model=ChatResponse)
def morning_briefing(
    req: ChatRequest | None = None,
    user: UserContext = Depends(get_current_user),
) -> ChatResponse:
    from app.agents.orchestrator import run_morning_briefing

    conversation_id = (req.conversation_id if req else None) or str(uuid.uuid4())
    user_message = "☀️ 아침 현황 보고"
    results = run_morning_briefing(conversation_id, operator_id=user.operator_id)

    _save_results(conversation_id, user_message, results, user_id=user.id)

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


@router.get("/conversations")
def list_conversations(user: UserContext = Depends(get_current_user)) -> list[dict]:
    return conv_svc.list_conversations(user_id=user.id)


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    messages = conv_svc.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}
