"""
agency_client — maesil-agency GrowthAgent API 호출 클라이언트.

인사이트/스튜디오가 operator 데이터를 구성해서 에이전시에 밀어넣는 방향.
notify_client와 동일한 패턴 (maesil_insight_url + harness_api_token 대신
agency_url + growth_token 사용).

필요한 시크릿:
  - maesil_agency_url    (예: https://maesil-agency.onrender.com)
  - agency_growth_token  (에이전시 GROWTH_INTERNAL_TOKEN과 동일한 값)
"""
from __future__ import annotations

import logging

import httpx

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)


class AgencyClientError(RuntimeError):
    pass


def _get_config() -> tuple[str, str]:
    """에이전시 URL + Growth 토큰 반환. 미설정 시 빈 문자열."""
    url   = (get_secret("maesil_agency_url") or "").rstrip("/")
    token = get_secret("agency_growth_token") or ""
    return url, token


def post_growth_chat(
    operator_id: str,
    message: str,
    operator_context: dict | None = None,
    conversation_id: str | None = None,
    program: str = "maesil-insight",
    timeout: float = 30.0,
) -> dict:
    """
    maesil-agency GrowthAgent에 분석 요청 전송.

    Args:
        operator_id:      인사이트 operator UUID
        message:          사용자 질문 / 분석 요청
        operator_context: operator 상태 딕셔너리
          {
            "plan_type":           "pro",
            "company_name":        "OO쇼핑",
            "user_role":           "seller",   # seller | partner | agency
            "connected_channels":  ["스마트스토어", "쿠팡"],
            "has_coupang_ad":      True,
            "has_naver_ad":        False,
            "monthly_revenue":     12000000,   # 선택
          }
        conversation_id:  이어서 대화할 경우 기존 conversation_id
        program:          호출 출처 프로그램 식별자
        timeout:          요청 타임아웃(초)

    Returns:
        {
          "ok":             bool,
          "conversation_id": str | None,
          "message":        str | None,   # GrowthAgent 분석 결과
          "status":         str,
          "cost_usd":       float,
          "error":          str | None,
        }
    """
    base_url, token = _get_config()

    if not base_url:
        return {"ok": False, "error": "maesil_agency_url 미설정 (/settings에서 등록)", "message": None, "conversation_id": None, "status": "error", "cost_usd": 0.0}
    if not token:
        return {"ok": False, "error": "agency_growth_token 미설정 (/settings에서 등록)", "message": None, "conversation_id": None, "status": "error", "cost_usd": 0.0}

    url = f"{base_url}/api/growth/chat"
    headers = {
        "X-Growth-Token": token,
        "Content-Type": "application/json",
    }
    payload: dict = {
        "operator_id":      operator_id,
        "message":          message,
        "operator_context": operator_context or {},
        "program":          program,
    }
    if conversation_id:
        payload["conversation_id"] = conversation_id

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
    except Exception as e:
        logger.exception("agency_client: 요청 실패 [op=%s]", operator_id)
        return {"ok": False, "error": f"request failed: {e}", "message": None, "conversation_id": None, "status": "error", "cost_usd": 0.0}

    if resp.status_code == 200:
        try:
            body = resp.json()
            return {
                "ok":              True,
                "conversation_id": body.get("conversation_id"),
                "message":         body.get("message"),
                "status":          body.get("status", "done"),
                "cost_usd":        body.get("cost_usd", 0.0),
                "error":           None,
            }
        except Exception:
            return {"ok": True, "conversation_id": None, "message": resp.text[:500], "status": "done", "cost_usd": 0.0, "error": None}

    err = resp.text[:300]
    logger.warning("agency_client: %s — %s [op=%s]", resp.status_code, err, operator_id)
    return {"ok": False, "error": f"HTTP {resp.status_code}: {err}", "message": None, "conversation_id": None, "status": "error", "cost_usd": 0.0}


def build_operator_context(
    plan_type: str = "free",
    company_name: str = "",
    user_role: str | None = None,
    connected_channels: list[str] | None = None,
    has_coupang_ad: bool = False,
    has_naver_ad: bool = False,
    monthly_revenue: int | None = None,
) -> dict:
    """
    인사이트에서 operator_context를 쉽게 구성하는 헬퍼.

    사용 예:
        ctx = build_operator_context(
            plan_type="pro",
            company_name="OO쇼핑",
            user_role="seller",
            connected_channels=["스마트스토어", "쿠팡"],
            has_coupang_ad=True,
        )
        result = post_growth_chat(operator_id, "이번 달 매출 분석해줘", ctx)
    """
    ctx: dict = {
        "plan_type":          plan_type,
        "company_name":       company_name,
        "connected_channels": connected_channels or [],
        "has_coupang_ad":     has_coupang_ad,
        "has_naver_ad":       has_naver_ad,
    }
    if user_role:
        ctx["user_role"] = user_role
    if monthly_revenue is not None:
        ctx["monthly_revenue"] = monthly_revenue
    return ctx
