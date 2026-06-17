"""
outreach_scorer — 파트너 리드 점수 계산.

점수 = 영향력(reach) + 전환력(conversion_power) - 경쟁리스크(competitive_risk)
최대 100점 (cap), 최소 0점
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta


def calculate_score(item: dict) -> tuple[int, str, dict]:
    """
    item: outreach_leads 업서트 예정 dict (AI 분석 결과 포함)
    Returns: (total_score, grade, breakdown_dict)
    """
    reach = _reach_score(item)
    conversion = item.get("conversion_power_score", 0)
    risk = item.get("competitive_risk_score", 0)

    # 플랫폼 복수 운영 보너스 (platforms_json)
    platforms = item.get("platforms_json") or []
    if len(platforms) >= 3:
        reach += 5
    elif len(platforms) == 2:
        reach += 3

    total = max(0, min(reach + conversion - risk, 100))

    grade = (
        "S" if total >= 85 else
        "A" if total >= 70 else
        "B" if total >= 50 else
        "C" if total >= 30 else
        "D"
    )

    breakdown = {
        "reach": reach,
        "conversion_power": conversion,
        "risk_deduction": risk,
        "multichannel_bonus": 5 if len(platforms) >= 3 else (3 if len(platforms) == 2 else 0),
        "total": total,
    }

    return total, grade, breakdown


def _reach_score(item: dict) -> int:
    score = 0
    platform = item.get("platform", "")

    # 연락처
    if item.get("contact_email"):
        score += 15
    if item.get("contact_kakao"):
        score += 10
    if item.get("contact_naver_cafe"):
        score += 20
    if item.get("community_size") and item["community_size"] >= 5000:
        score += 5

    # 활성도
    if item.get("activity_level") == "active":
        score += 5

    # 구독자/이웃 규모
    subs = item.get("subscriber_count") or 0
    if 1000 <= subs <= 50_000:
        score += 10
    elif 500 <= subs < 1000:
        score += 5

    # 네이버 블로그: subscriber_count API 미제공 → 기본 콘텐츠 존재 보너스
    # 셀러 관련 포스트가 있다는 것 자체가 영향력 신호
    if platform == "naver_blog" and subs == 0:
        score += 8  # subscriber_count 미제공 플랫폼 기본 보정

    return score


def compute_conversion_signals(ai_result: dict) -> dict:
    """
    Claude Haiku 분석 결과에서 conversion_power_score 계산.
    강의 판매(has_paid_course)는 중립 — 강의팔이도 파트너 가능하므로 점수 미반영.
    """
    signals = ai_result.get("conversion_signals", {})
    score = 0

    # has_paid_course 제외 — 강의 판매 자체는 중립 (리스크도 보너스도 아님)
    if signals.get("has_paid_membership"):
        score += 12
    if signals.get("has_consulting"):
        score += 10
    if signals.get("has_ebook_sale"):
        score += 8
    if signals.get("has_tool_recommendation_content"):
        score += 8
    if signals.get("has_affiliate_experience"):
        score += 5

    return {
        "conversion_power_score": min(score, 40),
        "has_paid_course": bool(signals.get("has_paid_course")),
        "has_paid_membership": bool(signals.get("has_paid_membership")),
        "has_ebook_sale": bool(signals.get("has_ebook_sale")),
        "has_consulting": bool(signals.get("has_consulting")),
        "has_affiliate_exp": bool(signals.get("has_affiliate_experience")),
        "has_tool_recommendation": bool(signals.get("has_tool_recommendation_content")),
    }


def compute_risk_signals(ai_result: dict) -> dict:
    """
    경쟁 리스크 3가지만 차감:
    1. promotes_other_program  — 타 프로그램/앱/웹 홍보 (경쟁사 파트너)
    2. sells_own_program       — 자체 개발 프로그램/앱/웹 판매
    3. is_program_company      — 프로그램/소프트웨어 업체 자체
    (어플=프로그램=웹 동일 취급)
    """
    signals = ai_result.get("risk_signals", {})
    score = 0

    if signals.get("promotes_other_program"):   # 타 프로그램 홍보
        score += 35
    if signals.get("sells_own_program"):         # 자체 개발 프로그램/앱/웹
        score += 30
    if signals.get("is_program_company"):        # 프로그램 업체 자체
        score += 40

    return {
        "competitive_risk_score": min(score, 40),
        "promotes_other_program": bool(signals.get("promotes_other_program")),
        "sells_own_program": bool(signals.get("sells_own_program")),
        "is_program_company": bool(signals.get("is_program_company")),
    }


def is_gate_pass(ai_result: dict, platform: str = "") -> bool:
    """GATE: 셀러 콘텐츠 필수. 블로그는 is_educational 불필요 (유튜브보다 다양한 형식)."""
    if not ai_result.get("is_seller_content"):
        return False
    if platform == "naver_blog":
        return True
    return bool(ai_result.get("is_educational"))


def get_activity_level(published_at) -> str:
    if not published_at:
        return "unknown"
    now = datetime.now(timezone.utc)
    if hasattr(published_at, "tzinfo") and published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    delta = now - published_at
    if delta <= timedelta(days=90):
        return "active"
    if delta <= timedelta(days=180):
        return "semi_active"
    return "inactive"
