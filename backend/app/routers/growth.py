"""
Growth Intelligence — 외부 프로그램 연동 엔드포인트

인사이트/스튜디오가 operator 데이터를 구성해서 밀어넣으면
GrowthAgent가 분석·인사이트를 반환하는 M2M API.

외부 프로그램용:
  POST /api/growth/chat   — GrowthAgent 동기 호출 (X-Growth-Token 인증)

관리자용 (JWT):
  GET  /api/growth/conversations          — Growth 대화 목록
  GET  /api/growth/conversations/{id}     — 특정 대화 메시지
"""
from __future__ import annotations

import hmac
import logging
import os
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.auth import UserContext, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/growth", tags=["growth"])

_GROWTH_TOKEN = os.environ.get("GROWTH_INTERNAL_TOKEN", "").strip()
_ALLOW_UNAUTH = os.environ.get("GROWTH_ALLOW_UNAUTH", "").lower() in ("1", "true", "yes")


# ─────────────────────────────────────────────────────────────────
# M2M 토큰 인증
# ─────────────────────────────────────────────────────────────────
def _verify_growth_token(
    x_growth_token: str | None = Header(default=None, alias="X-Growth-Token"),
) -> None:
    if not _GROWTH_TOKEN:
        if _ALLOW_UNAUTH:
            return
        raise HTTPException(
            status_code=503,
            detail="GROWTH_INTERNAL_TOKEN 미설정. 운영 환경에서는 반드시 설정 필요.",
        )
    token = (x_growth_token or "").strip()
    if not token or not hmac.compare_digest(token, _GROWTH_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid Growth token")


# ─────────────────────────────────────────────────────────────────
# 요청 / 응답 모델
# ─────────────────────────────────────────────────────────────────
class GrowthChatRequest(BaseModel):
    message: str
    operator_id: str
    operator_context: dict = {}
    """
    인사이트/스튜디오가 구성해서 전달하는 operator 상태.
    예:
      {
        "plan_type": "pro",
        "company_name": "OO쇼핑",
        "user_role": "seller",          # seller | partner | agency
        "connected_channels": ["스마트스토어", "쿠팡"],
        "has_coupang_ad": true,
        "has_naver_ad": false,
        "monthly_revenue": 12000000,    # 선택
      }
    """
    conversation_id: str | None = None
    program: str = "maesil-insight"     # 호출 출처 프로그램


class GrowthChatResponse(BaseModel):
    conversation_id: str
    message: str
    agent_type: str = "growth"
    status: str = "done"
    cost_usd: float = 0.0


# ─────────────────────────────────────────────────────────────────
# POST /api/growth/chat — M2M (인사이트 → 에이전시)
# ─────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=GrowthChatResponse,
             dependencies=[Depends(_verify_growth_token)])
def growth_chat(req: GrowthChatRequest) -> GrowthChatResponse:
    """
    인사이트/스튜디오가 operator 데이터를 구성해서 호출.
    GrowthAgent를 동기 실행하고 분석 결과를 반환.
    """
    from app.agents.orchestrator import run_agents
    from app.services import conversations as conv_svc

    conversation_id = req.conversation_id or str(uuid.uuid4())

    # operator_context를 메시지에 주입해서 GrowthAgent에 전달
    enriched_message = _build_enriched_message(req.message, req.operator_context, req.program)

    try:
        results = run_agents(
            enriched_message,
            conversation_id,
            ["growth"],
            operator_id=req.operator_id,
        )
    except Exception:
        logger.exception("GrowthAgent 실행 오류 [op=%s]", req.operator_id)
        raise HTTPException(status_code=500, detail="GrowthAgent 처리 중 오류가 발생했습니다.")

    result = results[0] if results else {}
    reply = result.get("message", "분석 결과를 가져올 수 없습니다.")

    # 대화 저장
    try:
        title = req.message[:40]
        conv_svc.ensure_conversation(conversation_id, title)
        conv_svc.save_user_message(conversation_id, req.message)
        if reply:
            conv_svc.save_agent_message(
                conversation_id=conversation_id,
                agent_type="growth",
                agent_display="그로스 인텔리전스",
                content=reply,
                cost_usd=result.get("cost_usd", 0.0),
                run_id=result.get("run_id"),
            )
    except Exception as e:
        logger.warning("Growth 대화 저장 실패 [conv=%s]: %s", conversation_id, e)

    return GrowthChatResponse(
        conversation_id=conversation_id,
        message=reply,
        status=result.get("status", "done"),
        cost_usd=result.get("cost_usd", 0.0),
    )


def _build_enriched_message(message: str, ctx: dict, program: str) -> str:
    """operator_context를 시스템 힌트 블록으로 메시지 앞에 주입."""
    if not ctx:
        return message

    lines = [f"[{program} operator 컨텍스트]"]

    if ctx.get("company_name"):
        lines.append(f"업체명: {ctx['company_name']}")
    if ctx.get("plan_type"):
        lines.append(f"요금제: {ctx['plan_type']}")
    if ctx.get("user_role"):
        role_label = {"seller": "셀러", "partner": "파트너", "agency": "광고대행주"}.get(
            ctx["user_role"], ctx["user_role"]
        )
        lines.append(f"사용자 유형: {role_label}")
    if ctx.get("connected_channels"):
        lines.append(f"연동 채널: {', '.join(ctx['connected_channels'])}")
    if ctx.get("monthly_revenue") is not None:
        lines.append(f"월 매출: {ctx['monthly_revenue']:,}원")
    if ctx.get("has_coupang_ad"):
        lines.append("쿠팡 광고: 데이터 있음")
    if ctx.get("has_naver_ad"):
        lines.append("네이버 광고: API 연동됨")

    header = "\n".join(lines)
    return f"{header}\n\n{message}"


# ─────────────────────────────────────────────────────────────────
# 관리자용 — Growth 대화 조회 (JWT 인증)
# ─────────────────────────────────────────────────────────────────
def _guard_growth_read(user: UserContext) -> None:
    """Growth 대화는 operator 매출 등 민감 데이터 → 기본 super_admin 전용.
    GROWTH_ADMIN_ONLY=0 으로 완화 가능(권장 안 함)."""
    from app.config import settings
    if settings.growth_admin_only and not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")


@router.get("/conversations")
def list_growth_conversations(
    limit: int = 30,
    program: str | None = None,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    _guard_growth_read(user)
    from app.services import conversations as conv_svc
    return conv_svc.list_conversations(limit=limit)


@router.get("/conversations/{conversation_id}")
def get_growth_conversation(
    conversation_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    _guard_growth_read(user)
    from app.services import conversations as conv_svc
    messages = conv_svc.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}
