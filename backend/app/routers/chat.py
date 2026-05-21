"""
채팅 / 오케스트레이터 엔드포인트.
- /api/chat                일반 대화 (오케스트레이터 라우팅)
- /api/chat/briefing       아침 현황 보고 (전 에이전트 실행)
- /api/chat/conversations  대화 목록
- /api/chat/conversations/{id}  특정 대화 메시지
"""
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.services import conversations as conv_svc
from app.services import job_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

AGENT_DISPLAY = {
    "growth":       "그로스 인텔리전스",   # 매출+영업+CS분석+소비자의도+개선 통합
    "sales":        "세일즈 에이전트",      # (legacy, growth로 통합됨)
    "finance":      "파이낸스 에이전트",
    "warehouse":    "웨어하우스 에이전트",
    "cs":           "CS 에이전트",
    "tester":       "테스터 에이전트",
    "developer":    "개발 에이전트",
    "outreach":     "영업 에이전트",        # (legacy, growth로 통합됨)
    "orchestrator": "오케스트레이터",
}

# force_agent 허용 목록 (오케스트레이터 bypass 가능한 에이전트)
DIRECT_AGENTS = {"growth", "sales", "finance", "warehouse", "cs", "outreach", "developer"}

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
    message: str = ""
    conversation_id: str | None = None
    force_agent: str | None = None  # 오케스트레이터 bypass — 특정 에이전트 직접 호출


class AgentResult(BaseModel):
    run_id: str
    agent_type: str
    agent_display: str
    message: str
    status: str
    cost_usd: float = 0.0


class ChatResponse(BaseModel):
    conversation_id: str
    agents: list[AgentResult] = []
    routed_to: list[str] = []
    status: str = "done"   # "done" | "pending"
    run_id: str | None = None  # pending 시 폴링용


def _save_results(
    conversation_id: str,
    user_message: str,
    results: list[dict],
    user_id: str | None = None,
    title: str | None = None,
) -> None:
    """대화 내용을 DB에 저장. 오류는 로그만 남기고 응답은 계속.
    title이 있으면 사이드바 표시용 제목으로 사용, user_message는 전체 내용으로 저장."""
    try:
        conv_svc.ensure_conversation(conversation_id, title or user_message, user_id=user_id)
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


def _trigger_partition(conversation_id: str) -> None:
    """대화 파티션(요약) 트리거 — BackgroundTasks에서 호출.
    active 메시지 수가 임계치 이상이면 Haiku 요약 후 파티션 저장."""
    try:
        from app.services.conv_summarizer import maybe_summarize
        maybe_summarize(conversation_id)
    except Exception as e:
        logger.warning("파티션 트리거 실패 [conv=%s]: %s", conversation_id, e)


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

# 1:1 에이전트 고정 대화 — conversation_id → agent_type
# force_agent가 한 번이라도 사용된 대화는 이후 메시지에도 자동 적용
_locked_agent_conversations: dict[str, str] = {}


def _detect_locked_agent(conversation_id: str) -> str | None:
    """대화 히스토리에서 1:1 에이전트 고정 여부를 판단.

    이미 in-memory에 등록된 경우 즉시 반환.
    없으면 DB 조회: 모든 에이전트 응답이 같은 타입이면 해당 타입 반환 (orchestrator 제외).
    """
    if conversation_id in _locked_agent_conversations:
        return _locked_agent_conversations[conversation_id]
    try:
        msgs = conv_svc.get_messages(conversation_id)
        agent_msgs = [m for m in msgs if m.get("role") == "agent"]
        if not agent_msgs:
            return None
        types = {m.get("agent_type") for m in agent_msgs if m.get("agent_type")}
        if len(types) == 1:
            atype = next(iter(types))
            if atype in DIRECT_AGENTS:
                _locked_agent_conversations[conversation_id] = atype
                return atype
    except Exception:
        pass
    return None

# 명시적으로 다른 에이전트로 빠지는 키워드 — 이게 있으면 dev sticky 해제
EXPLICIT_OTHER_AGENT_KEYWORDS = {
    "@매출", "@재고", "@재무", "@cs", "@고객",
    "매출 에이전트", "재고 에이전트", "재무 에이전트", "cs 에이전트",
    "dev 끄기", "개발 끄기", "개발모드 종료", "개발 종료",
}


def _user_explicitly_invokes_other_agent(msg_lower: str) -> bool:
    return any(k.lower() in msg_lower for k in EXPLICIT_OTHER_AGENT_KEYWORDS)


# 항상 백그라운드로 처리할 에이전트 (느리거나 타임아웃 위험)
_BG_AGENTS: set[str] = {"outreach"}


def _bg_run_agents(
    job_run_id: str,
    message: str,
    conversation_id: str,
    agent_types: list[str],
    operator_id: str | None,
    ctx_msgs: list[dict],
    user_id: str | None,
    title: str,
) -> None:
    """BackgroundTasks에서 실행 — 완료 후 job_store에 결과 저장."""
    try:
        from app.agents.orchestrator import run_agents
        results = run_agents(message, conversation_id, agent_types,
                             operator_id=operator_id, context_messages=ctx_msgs)
        _save_results(conversation_id, message, results, user_id=user_id, title=title)
        _trigger_partition(conversation_id)   # 파티션 트리거 (이미 백그라운드)
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
        job_store.complete(job_run_id, {
            "conversation_id": conversation_id,
            "agents": [a.model_dump() for a in agents],
            "routed_to": agent_types,
            "status": "done",
        })
    except Exception as e:
        job_store.fail(job_run_id, str(e))


def _bg_briefing(
    job_run_id: str,
    conversation_id: str,
    user_message: str,
    operator_id: str | None,
    user_id: str | None,
) -> None:
    """브리핑 백그라운드 실행."""
    try:
        from app.agents.orchestrator import run_morning_briefing
        results = run_morning_briefing(conversation_id, operator_id=operator_id)
        _save_results(conversation_id, user_message, results, user_id=user_id)
        _trigger_partition(conversation_id)   # 파티션 트리거 (이미 백그라운드)
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
        job_store.complete(job_run_id, {
            "conversation_id": conversation_id,
            "agents": [a.model_dump() for a in agents],
            "routed_to": ["sales", "finance", "warehouse", "cs"],
            "status": "done",
        })
    except Exception as e:
        job_store.fail(job_run_id, str(e))


@router.get("/runs/{run_id}")
def poll_run(run_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    """백그라운드 잡 상태 폴링. pending이면 계속 폴링, done이면 결과 반환."""
    job_store.evict_expired()
    job = job_store.get(run_id)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    if job["status"] == "pending":
        return {"status": "pending", "run_id": run_id}
    if job["status"] == "error":
        return {"status": "error", "run_id": run_id, "error": job["result"].get("error", "오류")}
    return job["result"]  # done → ChatResponse 호환 dict


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest, bg: BackgroundTasks, user: UserContext = Depends(get_current_user)) -> ChatResponse:
    from app.services import dev_chat_agent

    conversation_id = req.conversation_id or str(uuid.uuid4())
    msg_lower = req.message.lower().strip()

    # ── 0. force_agent: 오케스트레이터 완전 bypass ──────────────────
    # 대시보드 에이전트 카드 클릭 → 해당 에이전트와 1:1 채팅 시작
    # req.force_agent가 없어도, 대화 히스토리에서 고정 에이전트를 자동 감지해 적용
    fa = req.force_agent or (
        _detect_locked_agent(conversation_id) if req.conversation_id else None
    )
    if fa and fa in DIRECT_AGENTS:
        from app.services import dev_chat_agent

        # 이 대화를 해당 에이전트로 고정 (이후 메시지에서 force_agent 없어도 자동 유지)
        _locked_agent_conversations[conversation_id] = fa

        display_name = AGENT_DISPLAY.get(fa, fa)
        title = f"[{display_name}] {req.message[:30]}"

        # developer는 dev_chat_agent 서비스 직접 사용 (AGENT_MAP에 없음)
        if fa == "developer":
            _dev_mode_conversations.add(conversation_id)
            try:
                ctx = conv_svc.get_messages(conversation_id)
            except Exception:
                ctx = []
            response_text = dev_chat_agent.analyze_and_propose(req.message, conversation_id, ctx)
            run_id = str(uuid.uuid4())
            _save_results(
                conversation_id, req.message,
                [{"run_id": run_id, "agent_type": "developer",
                  "message": response_text, "status": "success", "cost_usd": 0.0}],
                user_id=user.id, title=title,
            )
            return ChatResponse(
                conversation_id=conversation_id,
                agents=[AgentResult(
                    run_id=run_id, agent_type="developer",
                    agent_display=display_name,
                    message=response_text, status="success",
                )],
                routed_to=["developer"],
            )

        # 비즈니스 에이전트 (sales / finance / warehouse / cs / outreach)
        try:
            ctx_msgs = conv_svc.get_messages(conversation_id)
        except Exception:
            ctx_msgs = []

        # 느린 에이전트 → 백그라운드 처리
        if fa in _BG_AGENTS:
            job_run_id = str(uuid.uuid4())
            job_store.create(job_run_id)
            bg.add_task(_bg_run_agents, job_run_id, req.message, conversation_id,
                        [fa], user.operator_id, ctx_msgs, user.id, title)
            return ChatResponse(
                conversation_id=conversation_id,
                status="pending",
                run_id=job_run_id,
                routed_to=[fa],
            )

        from app.agents.orchestrator import run_agents
        results = run_agents(
            req.message, conversation_id, [fa],
            operator_id=user.operator_id,
            context_messages=ctx_msgs,
        )
        _save_results(
            conversation_id, req.message, results, user_id=user.id, title=title,
        )
        bg.add_task(_trigger_partition, conversation_id)
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
            routed_to=[fa],
        )

    # ── 1. 개발 에이전트 라우팅 (super_admin 전용) ──────────────────
    # 우선순위:
    #   (a) 진행 중인 pending 액션 있음 → 무조건 dev (가장 강한 신호)
    #   (b) 직전 에이전트가 developer → 대화 맥락 유지
    #   (c) 메시지에 dev 키워드 또는 LLM 판단 yes
    has_pending_dev_action = (
        user.is_super_admin and dev_chat_agent._get_pending(conversation_id) is not None
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
    # 액션 결정 — LLM 의도 분류 우선, 실패 시 키워드 fallback.
    has_pending = dev_chat_agent._get_pending(conversation_id) is not None
    has_recent_pr = dev_chat_agent._get_recent_pr(conversation_id) is not None

    intent = None
    if user.is_super_admin and is_dev:
        intent = dev_chat_agent.classify_action(
            req.message, has_pending=has_pending, has_recent_pr=has_recent_pr
        )

    # 키워드 빠른 패스 (LLM 응답 늦거나 실패할 때 fallback)
    is_approve_kw  = user.is_super_admin and dev_chat_agent.is_approve(req.message)
    is_preview_kw  = user.is_super_admin and dev_chat_agent.is_preview(req.message)
    is_cancel_kw   = user.is_super_admin and dev_chat_agent.is_cancel(req.message)
    is_merge_kw    = user.is_super_admin and dev_chat_agent.is_merge(req.message)

    # 액션 우선순위: 승인/취소 키워드 최우선 → LLM → 나머지 키워드
    # 승인·취소는 키워드가 명확하므로 LLM 분류보다 먼저 처리 (LLM 오분류 방지)
    action = None
    if is_approve_kw:
        action = "approve"
    elif is_cancel_kw:
        action = "cancel"
    elif is_preview_kw and has_pending:
        action = "preview"
    elif is_merge_kw:
        action = "merge"
    elif intent and intent["confidence"] in ("high", "medium"):
        action = intent["action"]

    if action == "preview" and has_pending:
        response_text = dev_chat_agent.preview_pending(conversation_id)
        agent_type = "developer"

    elif action == "approve":
        # has_pending 여부와 무관하게 execute_pending 호출 — 없으면 내부에서 안내
        response_text = dev_chat_agent.execute_pending(conversation_id)
        agent_type = "developer"

    elif action == "merge":
        try:
            ctx_for_merge = conv_svc.get_messages(conversation_id)
        except Exception:
            ctx_for_merge = []
        # LLM이 PR 번호 직접 추출했으면 메시지에 prepend (기존 추출 로직 활용)
        msg_for_merge = req.message
        if intent and intent.get("pr_number"):
            msg_for_merge = f"PR #{intent['pr_number']} {req.message}"
        response_text = dev_chat_agent.merge_pending_pr(
            conversation_id,
            user_message=msg_for_merge,
            context_messages=ctx_for_merge,
        )
        agent_type = "developer"

    elif action == "cancel":
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
        try:
            ctx_msgs = conv_svc.get_messages(conversation_id)
        except Exception:
            ctx_msgs = []
        results = run_agents(
            req.message, conversation_id, agent_types,
            operator_id=operator_id,
            context_messages=ctx_msgs,
        )
        _save_results(conversation_id, req.message, results, user_id=user.id)
        bg.add_task(_trigger_partition, conversation_id)
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
    bg: BackgroundTasks,
    req: ChatRequest | None = None,
    user: UserContext = Depends(get_current_user),
) -> ChatResponse:
    conversation_id = (req.conversation_id if req else None) or str(uuid.uuid4())
    user_message = "☀️ 아침 현황 보고"

    job_run_id = str(uuid.uuid4())
    job_store.create(job_run_id)
    bg.add_task(_bg_briefing, job_run_id, conversation_id, user_message, user.operator_id, user.id)

    return ChatResponse(
        conversation_id=conversation_id,
        status="pending",
        run_id=job_run_id,
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

    # alert_id 기반 결정론적 UUID — Supabase UUID 타입 제약 통과 + 같은 알림은 같은 대화
    import uuid as _uuid_mod
    conversation_id = str(_uuid_mod.uuid5(_uuid_mod.NAMESPACE_URL, f"alert:{alert_id}"))

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

    # ── 이메일 발송 피드백 루프 알림 즉시 처리 ──────────────────────────
    # "이메일 발송 성공" 로그가 알림을 다시 트리거한 노이즈 — 파싱 없이 직접 처리
    import re as _re
    if _re.search(r"이메일\s*발송\s*(성공|완료)", (body or "") + " " + (title or "")):
        _resp = (
            "## ℹ️ 이메일 피드백 루프 알림 — 자동 확인 처리\n\n"
            "이 알림은 **이메일 발송 성공 로그가 다시 알림을 트리거한 피드백 루프**입니다.\n"
            "실제 서비스 에러가 아닙니다.\n\n"
            "- `render_logs.py` EXCLUDE_PATTERNS에 이미 추가 → **신규 알림은 생성되지 않습니다**\n"
            "- 이 알림은 패턴 추가 이전에 발생한 것입니다\n\n"
            "**자동으로 확인 처리합니다.**"
        )
        _run_id = str(uuid.uuid4())
        try:
            from datetime import datetime, timezone
            get_maesil_total_client().schema("agent_work").table("alert_events").update({
                "acknowledged_at": datetime.now(timezone.utc).isoformat(),
                "acknowledged_note": "이메일 발송 피드백 루프 — 자동 확인",
            }).eq("id", alert_id).execute()
            logger.info("이메일 피드백 루프 알림 자동 ack: alert_id=%s", alert_id)
        except Exception as _e:
            logger.warning("이메일 루프 알림 ack 실패: %s", _e)
        _alert_title = f"[알림] {prog} · {sev} — {title[:40]}"
        _save_results(conversation_id, _alert_title, [{
            "run_id": _run_id, "agent_type": "developer",
            "message": _resp, "status": "success", "cost_usd": 0.0,
        }], user_id=user.id)
        return ChatResponse(
            conversation_id=conversation_id,
            agents=[AgentResult(
                run_id=_run_id, agent_type="developer",
                agent_display=AGENT_DISPLAY["developer"],
                message=_resp, status="success",
            )],
            routed_to=["developer"],
        )

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

    _alert_title = f"[알림] {prog} · {sev} — {title[:40]}"
    _save_results(conversation_id, auto_msg, [{
        "run_id": run_id, "agent_type": "developer",
        "message": response_text, "status": "success", "cost_usd": 0.0,
    }], user_id=user.id, title=_alert_title)

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
    history: bool = False,   # True = archived 포함 전체 히스토리 (UI 상세 뷰)
    user: UserContext = Depends(get_current_user),
) -> dict:
    """대화 메시지 조회.

    history=False (기본): 에이전트 컨텍스트와 동일 — 최신 summary + active 메시지만.
    history=True: archived 포함 전체 히스토리 (히스토리 뷰 / 감사 로그용).
    """
    if not user.is_super_admin:
        owner = conv_svc.get_conversation_owner(conversation_id)
        if owner is None or str(owner) != str(user.id):
            raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다.")
    messages = conv_svc.get_messages(conversation_id, include_archived=history)
    return {
        "conversation_id": conversation_id,
        "messages": messages,
        "has_archived": any(m.get("is_archived") for m in messages) if not history else None,
    }
