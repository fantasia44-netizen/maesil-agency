"""
채팅 / 오케스트레이터 엔드포인트.
- /api/chat                일반 대화 (오케스트레이터 라우팅)
- /api/chat/briefing       아침 현황 보고 (전 에이전트 실행)
- /api/chat/conversations  대화 목록
- /api/chat/conversations/{id}  특정 대화 메시지
"""
import logging
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.services import conversations as conv_svc

logger = logging.getLogger(__name__)

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

# 개발 에이전트 키워드 (super_admin 전용)
DEV_KEYWORDS = {
    # 에러/버그
    "에러", "error", "버그", "bug", "exception", "traceback",
    # 코드/수정
    "수정", "fix", "코드", "code", "고쳐", "고치",
    # 배포/운영
    "배포", "deploy", "로그", "log",
    # 버전관리
    "pr", "커밋", "commit", "github", "깃",
    # 레포지토리
    "레포", "repo", "레포지토리", "repository", "저장소",
    # 분석/파악
    "분석", "파악", "원인", "디버그", "debug",
    # 개발 에이전트 직접 호출
    "개발팀", "개발자", "개발에이전트", "개발 에이전트",
    "개발ai", "개발 ai", "개발에이", "개발봇",
    "dev", "devai",
    # 이메일 알림 자동 연결
    "[에러 알림",
}

# 인삿말/잡담 → 오케스트레이터 직접 처리 (에이전트 낭비 방지)
SMALL_TALK = {
    "안녕", "안녕하세요", "hello", "hi", "ㅎㅇ", "반가워", "테스트", "test",
    "뭐해", "있어", "누구야", "누구", "잘있어",
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
    """대화 내용을 DB에 저장. 오류는 로그만 남기고 응답은 계속."""
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
    except Exception as e:
        logger.warning("대화 저장 실패 [conv=%s]: %s", conversation_id, e)


def _orchestrator_reply(message: str) -> str:
    """인삿말/단순 질문 → 오케스트레이터 직접 응답 (에이전트 미실행)."""
    return (
        "안녕하세요! 👋 매실 AI 어시스턴트입니다.\n\n"
        "**매출·재무·재고·CS** 관련 질문을 입력해주세요.\n"
        "예) '이번달 매출 현황', '재고 부족 상품', '광고비 ROAS 분석'"
    )


def _is_dev_intent(message: str) -> bool:
    """LLM으로 개발/기술 관련 의도인지 판단 (super_admin 전용, 키워드 매칭 실패 시 폴백)."""
    try:
        from app.services.secrets import get_secret
        import anthropic
        api_key = get_secret("anthropic_api_key")
        if not api_key:
            return False
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            system=(
                "다음 메시지가 소프트웨어 개발/디버깅/코드수정/에러분석/배포에 관한 질문인지 판단하세요. "
                "오직 'yes' 또는 'no'만 답하세요."
            ),
            messages=[{"role": "user", "content": message}],
        )
        answer = resp.content[0].text.strip().lower()
        return answer.startswith("yes")
    except Exception:
        return False


def _last_agent_in_conversation(conversation_id: str) -> str | None:
    """대화의 마지막 에이전트 타입 반환. DB 오류 시 None."""
    try:
        msgs = conv_svc.get_messages(conversation_id)
        for m in reversed(msgs):
            if m.get("role") == "assistant" and m.get("agent_type"):
                return m["agent_type"]
    except Exception:
        pass
    return None


def _has_recent_dev_message(conversation_id: str, last_n: int = 5) -> bool:
    """최근 N턴 내에 developer 에이전트 메시지가 있으면 True (sticky 라우팅용).
    last_agent가 다른 에이전트로 잠시 빠져도 dev 컨텍스트 유지."""
    try:
        msgs = conv_svc.get_messages(conversation_id)
        for m in list(reversed(msgs))[:last_n * 2]:  # user/assistant 합쳐서 N*2
            if m.get("agent_type") == "developer":
                return True
    except Exception:
        pass
    return False


# 한 번 dev 모드 들어간 대화 — 명시적 해제 전까진 무조건 dev로
# DB 조회 실패해도 견고하게 유지됨 (in-memory)
_dev_mode_conversations: set[str] = set()

# 명시적으로 다른 에이전트로 빠지는 키워드 — 이게 있으면 dev sticky 해제
EXPLICIT_OTHER_AGENT_KEYWORDS = {
    "@매출", "@재고", "@재무", "@cs", "@고객",
    "매출 에이전트", "재고 에이전트", "재무 에이전트", "cs 에이전트",
    "dev 끄기", "개발 끄기", "개발모드 종료", "개발 종료",
}


def _user_explicitly_invokes_other_agent(msg_lower: str) -> bool:
    return any(k.lower() in msg_lower for k in EXPLICIT_OTHER_AGENT_KEYWORDS)


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest, user: UserContext = Depends(get_current_user)) -> ChatResponse:
    from app.services import dev_chat_agent

    conversation_id = req.conversation_id or str(uuid.uuid4())
    msg_lower = req.message.lower().strip()

    # ── 1. 개발 에이전트 라우팅 (super_admin 전용) ──────────────────
    # 우선순위:
    #   (a) 진행 중인 pending 액션 있음 → 무조건 dev (가장 강한 신호)
    #   (b) 직전 에이전트가 developer → 대화 맥락 유지
    #   (c) 메시지에 dev 키워드 또는 LLM 판단 yes
    has_pending_dev_action = (
        user.is_super_admin and conversation_id in dev_chat_agent._pending
    )
    # 알림에서 시작된 대화(alert-{alert_id})는 항상 dev 컨텍스트
    is_alert_conversation = (
        user.is_super_admin and conversation_id.startswith("alert-")
    )
    is_dev_context = (
        user.is_super_admin and
        _last_agent_in_conversation(conversation_id) == "developer"
    )
    # sticky: 최근 5턴 내 dev 메시지 있으면 일시적으로 다른 에이전트 끼어들어도 dev 유지
    is_dev_sticky = (
        user.is_super_admin and
        _has_recent_dev_message(conversation_id, last_n=5)
    )
    # in-memory dev 모드 플래그 (DB 실패해도 견고)
    is_dev_mode_locked = (
        user.is_super_admin and conversation_id in _dev_mode_conversations
    )
    # 명시적으로 다른 에이전트 호출 키워드 → dev 해제 (단, 키워드 매칭 시점에만)
    explicit_other = _user_explicitly_invokes_other_agent(msg_lower)
    if explicit_other:
        _dev_mode_conversations.discard(conversation_id)

    is_dev = (
        not explicit_other and
        user.is_super_admin and
        (
            has_pending_dev_action or
            is_alert_conversation or
            is_dev_context or
            is_dev_sticky or
            is_dev_mode_locked or
            any(k in msg_lower for k in DEV_KEYWORDS) or
            _is_dev_intent(req.message)
        )
    )

    # dev로 라우팅이 결정되면 메모리 플래그 등록 → 이후 모든 메시지는 자동으로 dev
    if is_dev:
        _dev_mode_conversations.add(conversation_id)
    is_approve  = user.is_super_admin and dev_chat_agent.is_approve(req.message)
    is_preview  = user.is_super_admin and dev_chat_agent.is_preview(req.message)
    is_cancel   = user.is_super_admin and dev_chat_agent.is_cancel(req.message)

    if is_preview and conversation_id in dev_chat_agent._pending:
        response_text = dev_chat_agent.preview_pending(conversation_id)
        agent_type = "developer"

    elif is_approve and conversation_id in dev_chat_agent._pending:
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

    # ── 2. 인삿말/잡담 → 오케스트레이터 직접 응답 ────────────────────
    elif msg_lower in SMALL_TALK or len(msg_lower) <= 3:
        run_id = str(uuid.uuid4())
        response_text = _orchestrator_reply(req.message)
        result = {
            "run_id": run_id, "agent_type": "orchestrator",
            "message": response_text, "status": "success", "cost_usd": 0.0,
        }
        _save_results(conversation_id, req.message, [result], user_id=user.id)
        return ChatResponse(
            conversation_id=conversation_id,
            agents=[AgentResult(
                run_id=run_id, agent_type="orchestrator",
                agent_display=AGENT_DISPLAY["orchestrator"],
                message=response_text, status="success",
            )],
            routed_to=["orchestrator"],
        )

    # ── 3. 비즈니스 에이전트 오케스트레이션 ─────────────────────────
    else:
        from app.agents.orchestrator import route, run_agents
        operator_id = user.operator_id
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

    # 개발 에이전트 결과 저장 + 반환
    run_id = str(uuid.uuid4())
    _save_results(conversation_id, req.message, [{
        "run_id": run_id, "agent_type": agent_type,
        "message": response_text, "status": "success", "cost_usd": 0.0,
    }], user_id=user.id)

    return ChatResponse(
        conversation_id=conversation_id,
        agents=[AgentResult(
            run_id=run_id, agent_type=agent_type,
            agent_display=AGENT_DISPLAY["developer"],
            message=response_text, status="success",
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


@router.post("/from-alert/{alert_id}", response_model=ChatResponse)
def chat_from_alert(
    alert_id: str,
    req: ChatRequest | None = None,
    user: UserContext = Depends(get_current_user),
) -> ChatResponse:
    """이메일 알림 링크 → 대화 자동 시작.
    alert_id로 알림 조회 → 에러 컨텍스트 자동 전송 → 개발 에이전트 분석.
    conversation_id를 alert_id 기반으로 고정해서 같은 알림은 같은 대화로 이어짐.
    """
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services import dev_chat_agent

    # alert 조회
    try:
        resp = get_maesil_total_client().schema("agent_work").table("alert_events") \
            .select("*").eq("id", alert_id).limit(1).execute()
        rows = resp.data or []
        event = rows[0] if rows else None
    except Exception:
        event = None

    conversation_id = f"alert-{alert_id}"  # 알림 ID 기반 고정 conversation

    if not event:
        msg = "⚠️ 알림을 찾을 수 없습니다."
        _save_results(conversation_id, f"[알림 {alert_id}]", [{
            "run_id": str(uuid.uuid4()), "agent_type": "orchestrator",
            "message": msg, "status": "failed", "cost_usd": 0.0,
        }], user_id=user.id)
        return ChatResponse(
            conversation_id=conversation_id,
            agents=[AgentResult(
                run_id=str(uuid.uuid4()), agent_type="orchestrator",
                agent_display="시스템", message=msg, status="failed",
            )],
            routed_to=[],
        )

    sev  = (event.get("severity") or "error").upper()
    prog = event.get("program_name") or "(프로그램 미특정)"
    title = event.get("title") or ""
    body  = event.get("message") or ""

    auto_msg = (
        f"[에러 알림 자동 연결]\n"
        f"프로그램: {prog}\n심각도: {sev}\n제목: {title}\n\n{body}\n\n"
        f"이 에러를 분석하고 수정 방향을 알려주세요."
    )

    try:
        ctx = conv_svc.get_messages(conversation_id)
    except Exception:
        ctx = []

    response_text = dev_chat_agent.analyze_and_propose(auto_msg, conversation_id, ctx)
    run_id = str(uuid.uuid4())

    _save_results(conversation_id, auto_msg, [{
        "run_id": run_id, "agent_type": "developer",
        "message": response_text, "status": "success", "cost_usd": 0.0,
    }], user_id=user.id)

    return ChatResponse(
        conversation_id=conversation_id,
        agents=[AgentResult(
            run_id=run_id, agent_type="developer",
            agent_display=AGENT_DISPLAY["developer"],
            message=response_text, status="success",
        )],
        routed_to=["developer"],
    )


@router.get("/conversations")
def list_conversations(user: UserContext = Depends(get_current_user)) -> list[dict]:
    # super_admin은 전체, customer는 본인 것만
    uid = None if user.is_super_admin else user.id
    return conv_svc.list_conversations(user_id=uid)


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    messages = conv_svc.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}
