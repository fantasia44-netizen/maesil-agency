"""
channel_analyzer.py — Claude Sonnet 심층 채널 분석 + 맞춤 이메일 초안 생성.

POST /api/outreach/leads/{id}/analyze 백그라운드 스레드에서 호출.
A/S/B급 리드에 대해:
  1. Sonnet으로 채널 심층 분석 (channel_type, approach_strategy, content_summary)
  2. 채널 유형별 맞춤 이메일 초안 생성 (email_subject, email_draft)
  3. DB 업데이트 (status=draft_ready)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── 채널 유형 정의 ────────────────────────────────────────────────────
CHANNEL_TYPES = {
    "educator":        "교육 콘텐츠 전문 (강의·튜토리얼 중심, 실무 노하우 제공)",
    "reviewer":        "상품 리뷰·비교 중심 (체험 후기, 실사용 평가)",
    "case_sharer":     "사례·경험 공유 (본인 셀러 경험 → 팔로워에게 공유)",
    "tool_expert":     "툴·자동화 전문 (엑셀, SaaS, API 활용 콘텐츠)",
    "community_admin": "카페·커뮤니티 운영자 (멤버십, 단체 관리 경험)",
    "influencer":      "영향력 채널 (팔로워 많고 신뢰도 높으나 셀러 특화 아님)",
}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _get_anthropic_key(tenant_id: str | None = None) -> str:
    from app.services.secrets import get_tenant_secret
    return get_tenant_secret(tenant_id, "anthropic_api_key") or ""


def _get_latest_relevant_video(lead: dict) -> dict | None:
    """YouTube API로 채널의 최신 영상 중 스마트스토어·쿠팡 관련 영상을 반환.

    없으면 단순 최신 영상 반환. API 키 없으면 None. (테넌트별 키)
    """
    from app.services.secrets import get_tenant_secret
    api_key = get_tenant_secret(lead.get("tenant_id"), "youtube_api_key")
    if not api_key:
        return None

    channel_id = lead.get("platform_id") or lead.get("best_content_id", "")
    # platform_id가 채널 ID여야 함 (UCxxx 형식)
    if not channel_id or not channel_id.startswith("UC"):
        return None

    try:
        from app.services.scanners.youtube_scanner import YouTubeScanner
        scanner = YouTubeScanner(api_key)
        videos = scanner.fetch_recent_videos(channel_id, max_results=10)
    except Exception as e:
        logger.warning("최신 영상 조회 실패 [%s]: %s", channel_id, e)
        return None

    if not videos:
        return None

    # 스마트스토어·쿠팡·이커머스 관련 영상 우선
    _KEYWORDS = ["스마트스토어", "쿠팡", "위탁", "온라인판매", "셀러", "광고", "마진", "수익", "부업"]
    for v in videos:
        title_lower = (v.get("title") or "").lower()
        if any(k in title_lower for k in _KEYWORDS):
            return v
    # 없으면 가장 최신 영상
    return videos[0]


def _sonnet_analyze(lead: dict, latest_video: dict | None = None) -> dict:
    """Claude Haiku로 채널 심층 분석 수행."""
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key(lead.get("tenant_id")))

    platform = lead.get("platform", "")
    handle = lead.get("handle_name", "")
    url = lead.get("platform_url", "")
    subs = lead.get("subscriber_count") or 0
    score = lead.get("score", 0)
    grade = lead.get("grade", "")
    content_title = lead.get("best_content_title", "")
    content_summary = lead.get("content_summary", "")
    has_paid_course = lead.get("has_paid_course", False)
    has_paid_membership = lead.get("has_paid_membership", False)
    has_ebook = lead.get("has_ebook_sale", False)
    has_consulting = lead.get("has_consulting", False)
    has_tool_rec = lead.get("has_tool_recommendation", False)
    sells_own = lead.get("sells_own_program", False)
    contact_email = lead.get("contact_email", "")
    platforms_json = lead.get("platforms_json") or []
    community_size = lead.get("community_size") or 0

    channel_types_str = "\n".join(f"- {k}: {v}" for k, v in CHANNEL_TYPES.items())

    # 영상 참조 정보 구성
    if latest_video:
        video_ref_block = (
            f"- 최신 영상 제목: {latest_video['title']}\n"
            f"- 최신 영상 게시일: {latest_video.get('published_at', '')}\n"
            f"- 최신 영상 URL: {latest_video.get('url', '')}\n"
            f"- 최신 영상 설명: {latest_video.get('description', '')[:150]}"
        )
        video_instruction = (
            f"**반드시 '최신 영상 제목: {latest_video['title']}'을 greeting에서 직접 언급하세요.**\n"
            f"게시일 {latest_video.get('published_at', '')}의 최신 영상입니다 — '최근에 올리신' 표현 사용."
        )
    else:
        video_ref_block = f"- 대표 콘텐츠 제목: {content_title}\n- 콘텐츠 요약: {content_summary}"
        video_instruction = (
            "대표 콘텐츠를 참조하되, 연도가 포함된 제목(예: '2025년 최신...')은 "
            "연도를 언급하지 말고 내용만 자연스럽게 참조하세요."
        )

    prompt = f"""당신은 매실인사이트 파트너십 담당자입니다.
아래 채널 정보를 분석해 파트너십 접근 전략과 맞춤 이메일 초안을 작성하세요.

## 채널 정보
- 플랫폼: {platform}
- 채널명: {handle}
- URL: {url}
- 구독자/이웃: {subs:,}명
- 커뮤니티 규모: {community_size:,}명
- 파트너 점수: {score}점 ({grade}급)
{video_ref_block}
- 플랫폼 운영 현황: {json.dumps(platforms_json, ensure_ascii=False)}
- 신호 정보:
  * 유료 강의 판매: {has_paid_course}
  * 멤버십 운영: {has_paid_membership}
  * 전자책 판매: {has_ebook}
  * 컨설팅 제공: {has_consulting}
  * 툴 추천 콘텐츠: {has_tool_rec}
  * 자체 프로그램 판매: {sells_own}
- 이메일 주소: {"있음" if contact_email else "없음"}

## 채널 유형 분류 기준
{channel_types_str}

## 분석 지시사항
1. 채널을 위 유형 중 하나로 분류하세요
2. 이 채널이 매실인사이트를 추천할 가능성과 이유를 분석하세요
3. 가장 효과적인 접근 전략을 제시하세요 (구체적, 1-2문장)

4. **이메일 제목** (email_subject):
   - 친구에게 DM 보내는 느낌 — 가볍고 친근하게
   - 영상/채널 내용을 구체적으로 1가지 언급
   - 40자 이내, 이모지 1개 허용
   - 좋은 예: "{handle}님 위탁판매 영상 보고 연락드려요 😊"
   - 좋은 예: "안녕하세요 {handle}님, 영상 보다가 꼭 소개드리고 싶어서요!"
   - 나쁜 예: "위탁판매 셀러들의 상품 선정을 돕는 도구가 있다면?" (물음표 마케팅 금지)
   - 나쁜 예: "[매실인사이트] 파트너십 제안드립니다" (브랜드 태그·격식체 금지)

5. **맞춤 인사 문단** (email_intro):
   {video_instruction}
   - "안녕하세요, {handle}님!" 으로 시작
   - 영상 제목을 따옴표로 직접 인용 (예: '위탁판매 준비과정' 영상)
   - 영상에서 다룬 구체적 내용 1가지 언급 (본인이 봤다는 느낌)
   - 왜 구독자들에게 매실인사이트가 도움이 될지 자연스럽게 연결 (1문장)
   - sells_own_program=True이면 "광고비 절감"보다 "구독자 광고 효율 개선" 각도
   - 전체 3-4문장, 이 문단만 작성 (케이스스터디·CTA는 별도 삽입됨)

아래 JSON 형식으로만 답하세요:
{{
  "channel_type": "educator|reviewer|case_sharer|tool_expert|community_admin|influencer",
  "approach_strategy": "접근 전략 1-2문장",
  "partnership_fit_reason": "파트너십 적합 이유 2-3문장",
  "email_subject": "이메일 제목",
  "email_intro": "맞춤 인사 문단"
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",  # 비용 절감 - Haiku로도 초안은 충분
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        # JSON 블록 추출
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error("Sonnet 분석 실패 [%s]: %s", handle, e)
        return {}


def _build_default_draft(lead: dict, channel_type: str) -> tuple[str, str]:
    """AI 실패 시 채널 유형별 기본 이메일 초안."""
    handle = lead.get("handle_name") or "채널"
    subs = lead.get("subscriber_count") or 0

    if channel_type == "educator":
        subject = f"{handle}님 채널 보고 연락드립니다 🌿"
        body = (
            f"안녕하세요, {handle} 운영자님!\n\n"
            f"셀러 교육 콘텐츠를 꼼꼼히 살펴보다 연락드렸습니다. "
            f"구독자 분들이 광고비를 더 효율적으로 쓸 수 있도록 도와드리고 싶어서요.\n\n"
            f"매실인사이트는 쿠팡·스마트스토어 광고 데이터를 AI로 자동 분석해 "
            f"키워드별 ROAS와 예산 낭비를 즉시 파악해 드리는 서비스입니다.\n\n"
            f"파트너로 함께하시면 수익 쉐어(10~20%) + 3개월 무료 체험 + 전용 통계 대시보드를 제공해드립니다. "
            f"관심 있으시면 부담 없이 회신해 주세요!"
        )
    elif channel_type == "community_admin":
        subject = f"{handle} 커뮤니티 보고 연락드립니다 🌿"
        body = (
            f"안녕하세요, {handle} 운영자님!\n\n"
            f"커뮤니티를 통해 셀러분들과 활발히 소통하시는 걸 보고 연락드렸습니다.\n\n"
            f"매실인사이트는 광고비 낭비를 즉시 잡아주는 AI 분석 도구입니다. "
            f"멤버분들의 실제 성과 개선에 도움이 될 거라 생각해요.\n\n"
            f"파트너 링크로 멤버분들이 가입하시면 매출의 10~20%를 쉐어해드리고, "
            f"운영자님은 3개월 무료로 직접 써보실 수 있습니다. 관심 있으시면 회신 주세요!"
        )
    else:
        subject = f"{handle}님, 파트너 제안 드려도 될까요? 🌿"
        body = (
            f"안녕하세요, {handle} 운영자님!\n\n"
            f"콘텐츠를 보고 파트너십 제안을 드리고 싶어 연락드렸습니다.\n\n"
            f"매실인사이트는 쿠팡·스마트스토어 광고 데이터를 AI로 분석해 "
            f"ROAS와 비용 최적화를 도와드리는 서비스입니다. "
            f"구독자분들의 광고비 절감에 도움이 될 수 있어요.\n\n"
            f"파트너가 되시면 수익 쉐어(10~20%) + 3개월 무료 체험을 제공해드립니다. "
            f"관심 있으시면 언제든지 회신해 주세요!"
        )

    return subject, body


def analyze_lead(tenant_id: str, lead_id: str) -> dict:
    """
    리드 심층 분석 엔트리포인트(테넌트 스코프).
    outreach.py 라우터에서 백그라운드 스레드로 호출.
    ad_agency 플랫폼은 agency_analyzer로 위임.
    """
    # 리드 조회
    resp = _db().table("outreach_leads").select("*").eq("tenant_id", tenant_id).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        logger.error("[analyze_lead] 리드 없음: %s", lead_id)
        return {"ok": False, "error": "lead not found"}

    lead = rows[0]
    handle = lead.get("handle_name", lead_id)

    # 광고대행사 → agency_analyzer 위임
    if lead.get("platform") == "ad_agency" or lead.get("channel_type") in ("ad_agency", "coupang_official", "naver_official"):
        from app.services.outreach_agency_analyzer import analyze_agency_lead
        return analyze_agency_lead(tenant_id, lead_id)

    # YouTube 최신 영상 조회 (이메일 인사에 최신 영상 반영)
    latest_video: dict | None = None
    if lead.get("platform") == "youtube":
        try:
            latest_video = _get_latest_relevant_video(lead)
            if latest_video:
                logger.info("[analyze_lead] 최신 영상 조회 성공: %s → %s",
                            handle, latest_video.get("title", ""))
            else:
                logger.info("[analyze_lead] 최신 영상 없음 (API 키 없거나 결과 없음): %s", handle)
        except Exception as e:
            logger.warning("[analyze_lead] 최신 영상 조회 실패 (계속 진행): %s", e)

    # Haiku 분석
    logger.info("[analyze_lead] 분석 시작: %s (%s)", handle, lead_id)
    ai = _sonnet_analyze(lead, latest_video=latest_video)

    channel_type = ai.get("channel_type", "influencer")
    approach_strategy = ai.get("approach_strategy", "")
    partnership_fit = ai.get("partnership_fit_reason", "")
    email_subject = ai.get("email_subject", "")
    email_intro = ai.get("email_intro", "") or ai.get("email_draft", "")  # 하위 호환

    # AI 실패 시 기본 인사말
    if not email_intro:
        email_subject, email_intro = _build_default_draft(lead, channel_type)

    # DB 업데이트 — email_draft에 intro 저장, email_final은 건드리지 않음
    now = datetime.now(timezone.utc).isoformat()
    # emailed/no_reply/replied/negotiating/deal 상태는 재분석해도 상태 유지
    _preserve_status = {"emailed", "no_reply", "replied", "negotiating", "deal", "rejected", "archived"}
    lead_resp = _db().table("outreach_leads").select("status").eq("tenant_id", tenant_id).eq("id", lead_id).limit(1).execute()
    current_status = ((lead_resp.data or [{}])[0].get("status") or "")
    # 분석 완료 후 자동 approved (D급 제외) — 수동 승인 불필요
    grade = lead.get("grade", "D")
    if current_status in _preserve_status:
        next_status = current_status
    else:
        next_status = "approved"  # 전 등급 자동 승인

    update_payload = {
        "channel_type": channel_type,
        "approach_strategy": approach_strategy[:300] if approach_strategy else None,
        "partnership_fit_reason": partnership_fit[:500] if partnership_fit else None,
        "email_subject": email_subject[:120] if email_subject else None,
        "email_draft": email_intro,  # 맞춤 인사 문단만 저장
        "status": next_status,
        "updated_at": now,
    }

    try:
        _db().table("outreach_leads").update(update_payload).eq("tenant_id", tenant_id).eq("id", lead_id).execute()
        logger.info("[analyze_lead] 완료: %s → channel_type=%s, draft_ready", handle, channel_type)
    except Exception as e:
        logger.error("[analyze_lead] DB 업데이트 실패 [%s]: %s", lead_id, e)
        return {"ok": False, "error": str(e)}

    return {
        "ok": True,
        "lead_id": lead_id,
        "channel_type": channel_type,
        "has_draft": bool(email_intro),
    }
