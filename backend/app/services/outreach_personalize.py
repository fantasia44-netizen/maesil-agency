"""
outreach_personalize.py — 영업 메일 개인화 오프너 생성.

상대 채널의 '인기(최대 조회) 영상' + '최신 영상'을 구체적으로 칭찬하는 1~2문장을 만들어
"광고가 아니라 내 채널을 실제로 보는 사람의 제안"처럼 읽히게 한다.

데이터:
  - 인기 영상  = lead.best_content_title (스캔 시 저장된 고조회 영상)
  - 최신 영상  = youtube_scanner.fetch_recent_videos(channel_id)[0]
생성: Claude Haiku (실패/키없음 시 템플릿 폴백). 유튜브 리드에만 적용.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def get_latest_video_title(channel_id: str | None) -> str | None:
    if not channel_id:
        return None
    try:
        from app.services.secrets import get_secret
        key = get_secret("youtube_api_key")
        if not key:
            return None
        from app.services.scanners.youtube_scanner import YouTubeScanner
        vids = YouTubeScanner(key).fetch_recent_videos(channel_id, max_results=1)
        return (vids[0].get("title") or None) if vids else None
    except Exception as e:
        logger.warning("get_latest_video_title 실패 [%s]: %s", channel_id, e)
        return None


def _fallback_praise(handle: str, top_title: str | None, latest_title: str | None) -> str:
    if top_title and latest_title:
        return f'최근 올리신 "{latest_title}" 잘 봤습니다. 특히 "{top_title}" 영상은 정말 인상 깊었어요.'
    if latest_title:
        return f'최근 올리신 "{latest_title}" 영상 잘 봤습니다.'
    if top_title:
        return f'"{top_title}" 영상 정말 잘 봤습니다.'
    return f"{handle} 채널 잘 보고 있습니다."


def generate_video_praise(handle: str, top_title: str | None, latest_title: str | None) -> str:
    """상대 영상 2개를 자연스럽게 칭찬하는 1~2문장 (Haiku). 과장·영업 톤 금지."""
    if not top_title and not latest_title:
        return _fallback_praise(handle, top_title, latest_title)
    try:
        from app.services.secrets import get_secret
        key = get_secret("anthropic_api_key")
        if not key:
            return _fallback_praise(handle, top_title, latest_title)
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        prompt = (
            f"유튜브 채널 '{handle}'에 콜드 영업 메일을 보냅니다. 첫 문장으로 쓸 "
            f"'진짜 구독자가 쓴 듯한 자연스러운 칭찬' 1~2문장을 한국어로 써주세요.\n"
            f"- 인기 영상: {top_title or '(없음)'}\n"
            f"- 최신 영상: {latest_title or '(없음)'}\n"
            f"규칙: 두 영상을 구체적으로 언급, 과장·아부 금지, 영업 표현 금지, "
            f"이모지 금지, 따옴표로 영상 제목 감싸기, 칭찬 문장만 출력(다른 말 X)."
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (resp.content[0].text or "").strip().strip('"')
        return text or _fallback_praise(handle, top_title, latest_title)
    except Exception as e:
        logger.warning("generate_video_praise 실패 [%s]: %s", handle, e)
        return _fallback_praise(handle, top_title, latest_title)


def build_personal_intro(lead: dict) -> str | None:
    """유튜브 리드의 개인화 오프너 생성. 유튜브 아님/데이터 없으면 None."""
    if lead.get("platform") != "youtube":
        return None
    top_title = lead.get("best_content_title")
    latest_title = get_latest_video_title(lead.get("platform_id"))
    if not top_title and not latest_title:
        return None
    return generate_video_praise(lead.get("handle_name") or "", top_title, latest_title)


def shorten_title_for_subject(title: str | None, handle: str = "") -> str:
    """영상 제목을 이메일 제목용으로 축약 (Haiku). 실패 시 채널명 폴백.

    목표: 앞 태그([…], (…), 숫자편 등) 제거 후 핵심 키워드 15자 이내.
    폴백 우선순위:
      1. Haiku 정상 응답
      2. 제목 앞 태그 제거 후 앞 15자 단순 자르기
      3. 채널명만 사용
    """
    if not title:
        return handle or ""

    # 폴백: 태그 제거 후 단순 자르기
    import re
    cleaned = re.sub(r"^[\[\(【「『][^\]\)】」』]*[\]\)】」』]\s*", "", title).strip()
    cleaned = re.sub(r"^\d+[편화회부]\s*[\|ㅣ:·\-]\s*", "", cleaned).strip()
    simple_fallback = (cleaned[:15] + "…") if len(cleaned) > 15 else cleaned
    if not simple_fallback:
        simple_fallback = (title[:15] + "…") if len(title) > 15 else title

    try:
        from app.services.secrets import get_secret
        key = get_secret("anthropic_api_key")
        if not key:
            return simple_fallback
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        prompt = (
            f"유튜브 영상 제목을 이메일 제목에 쓸 수 있도록 핵심만 15자 이내로 줄여주세요.\n"
            f"규칙: [태그], (태그), 회차번호, 특수기호 제거. 핵심 키워드만. 줄인 텍스트만 출력(따옴표 없이).\n"
            f"원본: {title}"
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=30,
            messages=[{"role": "user", "content": prompt}],
        )
        result = (resp.content[0].text or "").strip().strip('"').strip("'")
        # 결과 검증: 비어있거나 너무 길면 폴백
        if not result or len(result) > 20:
            return simple_fallback
        return result
    except Exception as e:
        logger.warning("shorten_title_for_subject 실패 [%s]: %s", title, e)
        return simple_fallback
