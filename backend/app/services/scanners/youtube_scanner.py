"""
scanners/youtube_scanner.py — YouTube 스캐너 (v4 리팩토링).

변경사항 (v1 → v4):
- BaseScanner 상속
- is_educational GATE 추가 (자동발송 제거)
- conversion_power + competitive_risk 신호 분석
- ContentItem 표준 형식으로 반환
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone, timedelta

from .base import BaseScanner, ContentItem, extract_contact

logger = logging.getLogger(__name__)

KEYWORDS = [
    # 스마트스토어 (짧고 넓게)
    "스마트스토어 강의",
    "스마트스토어 운영",
    "스마트스토어 상위노출",
    "스마트스토어 키워드",
    "스마트스토어 광고",
    "스마트스토어 수익",
    "스마트스토어 시작",
    "네이버쇼핑 셀러",
    # 쿠팡
    "쿠팡 셀러",
    "쿠팡 광고",
    "쿠팡 로켓그로스",
    "쿠팡 아이템위너",
    "쿠팡 수익",
    "쿠팡 판매",
    # 온라인 셀러/쇼핑몰
    "온라인 셀러",
    "온라인 쇼핑몰 강의",
    "온라인 판매",
    "이커머스 강의",
    "쇼핑몰 창업",
    "셀러 강의",
    # 구매대행/소싱
    "구매대행",
    "중국 소싱",
    "알리바바 소싱",
    "사입 방법",
    "위탁판매",
    "해외직구 판매",
    # 부업/재테크
    "부업 쇼핑몰",
    "직장인 부업 셀러",
    "재택 부업",
    "1인 쇼핑몰",
    "부업 월수익",
    # 마케팅/광고
    "네이버 광고",
    "쇼핑 광고",
    "퍼포먼스 마케팅",
    "SNS 마케팅",
    "콘텐츠 마케팅",
    # AI/자동화
    "AI 쇼핑몰",
    "챗GPT 셀러",
    "자동화 부업",
]

MIN_VIEWS = 500


def _parse_duration(duration: str) -> int:
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or "")
    if not m:
        return 0
    h, mi, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + s


def _fetch_transcript(video_id: str) -> str:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        segs = YouTubeTranscriptApi.get_transcript(video_id, languages=["ko", "en"])
        return " ".join(s["text"] for s in segs)[:2500]
    except Exception:
        return ""


class YouTubeScanner(BaseScanner):
    platform = "youtube"
    keywords = KEYWORDS

    def __init__(self, api_keys: list[str], keywords: list[str] | None = None):
        """api_keys: 최대 3개, 429 시 순서대로 전환. keywords: 테넌트별(없으면 기본)."""
        from googleapiclient.discovery import build
        if keywords:
            self.keywords = keywords   # 인스턴스 속성이 클래스 기본 KEYWORDS를 덮음
        self._keys = [k for k in api_keys if k]
        self._key_idx = 0
        self._clients = [
            build("youtube", "v3", developerKey=k, cache_discovery=False)
            for k in self._keys
        ]

    @property
    def _yt(self):
        return self._clients[self._key_idx]

    def _next_key(self) -> bool:
        """다음 키로 전환. 더 이상 없으면 False."""
        if self._key_idx + 1 < len(self._clients):
            self._key_idx += 1
            logger.info("YouTube API 키 전환: #%d → #%d", self._key_idx, self._key_idx + 1)
            return True
        return False

    def search(self, keyword: str) -> list[str]:
        for attempt in range(len(self._clients)):
            try:
                resp = self._yt.search().list(
                    q=keyword, part="id", type="video",
                    videoDuration="medium",
                    relevanceLanguage="ko", regionCode="KR",
                    maxResults=50, fields="items(id/videoId)",
                ).execute()
                return [item["id"]["videoId"] for item in resp.get("items", [])]
            except Exception as e:
                if "429" in str(e) or "quotaExceeded" in str(e) or "rateLimitExceeded" in str(e):
                    logger.warning("YouTube 할당량 초과 (키 #%d), 다음 키 시도", self._key_idx + 1)
                    if not self._next_key():
                        logger.error("YouTube API 키 모두 소진 [%s]", keyword)
                        return []
                else:
                    logger.warning("YouTube search 실패 [%s]: %s", keyword, e)
                    return []
        return []

    def fetch_content_details(self, content_ids: list[str]) -> list[ContentItem]:
        items: list[ContentItem] = []
        now_utc = datetime.now(timezone.utc)

        for i in range(0, len(content_ids), 50):
            batch = content_ids[i:i+50]
            try:
                resp = self._yt.videos().list(
                    id=",".join(batch), part="snippet,statistics,contentDetails",
                    fields=(
                        "items(id,"
                        "snippet(title,description,channelId,channelTitle,publishedAt),"
                        "statistics(viewCount,commentCount),"
                        "contentDetails(duration))"
                    ),
                ).execute()
            except Exception as e:
                logger.warning("videos.list 실패: %s", e)
                continue

            for item in resp.get("items", []):
                views = int(item.get("statistics", {}).get("viewCount", 0) or 0)
                duration_s = _parse_duration(item.get("contentDetails", {}).get("duration", "PT0S"))
                if views < MIN_VIEWS or duration_s <= 60:
                    continue

                snippet = item.get("snippet", {})
                published_str = snippet.get("publishedAt", "")
                try:
                    published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                except Exception:
                    published_at = None

                description = snippet.get("description", "")[:3000]
                transcript = _fetch_transcript(item["id"])

                contact_text = description + " " + transcript
                contact = extract_contact(contact_text)

                items.append(ContentItem(
                    platform="youtube",
                    platform_id=snippet.get("channelId", ""),
                    platform_url=f"https://www.youtube.com/channel/{snippet.get('channelId','')}",
                    content_id=item["id"],
                    handle_name=snippet.get("channelTitle", ""),
                    content_title=snippet.get("title", ""),
                    content_body=description,
                    content_transcript=transcript,
                    views=views,
                    comments=int(item.get("statistics", {}).get("commentCount", 0) or 0),
                    published_at=published_at,
                    raw_contact_text=contact_text,
                ))

        # 채널 상세 조회 (구독자 수, 커스텀 URL)
        channel_ids = list({it.platform_id for it in items})
        channel_info = self._fetch_channel_info(channel_ids)
        for it in items:
            info = channel_info.get(it.platform_id, {})
            it.subscriber_count = info.get("subscriber_count")
            if info.get("channel_url"):
                it.platform_url = info["channel_url"]
            # 채널 설명도 연락처 원문에 추가
            it.raw_contact_text += " " + info.get("description", "")

        return items

    def fetch_recent_videos(self, channel_id: str, max_results: int = 5) -> list[dict]:
        """채널의 최신 영상 목록 반환 (최신순).
        search.list(쿼터 100) 대신 playlistItems.list(쿼터 1) 사용.
        Returns list of {video_id, title, published_at, description, url}
        """
        try:
            # 1) 채널의 업로드 플레이리스트 ID 조회 (1유닛)
            ch_resp = self._yt.channels().list(
                id=channel_id,
                part="contentDetails",
                fields="items(contentDetails/relatedPlaylists/uploads)",
            ).execute()
            items = ch_resp.get("items", [])
            if not items:
                return []
            uploads_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

            # 2) 플레이리스트 최신 영상 조회 (1유닛)
            pl_resp = self._yt.playlistItems().list(
                playlistId=uploads_id,
                part="snippet",
                maxResults=max_results,
                fields="items(snippet(resourceId/videoId,title,publishedAt,description))",
            ).execute()
        except Exception as e:
            logger.warning("fetch_recent_videos 실패 [%s]: %s", channel_id, e)
            return []

        results = []
        for item in pl_resp.get("items", []):
            sn = item.get("snippet", {})
            vid = sn.get("resourceId", {}).get("videoId", "")
            results.append({
                "video_id":    vid,
                "title":       sn.get("title", ""),
                "published_at": sn.get("publishedAt", "")[:10],
                "description": (sn.get("description") or "")[:300],
                "url":         f"https://youtu.be/{vid}" if vid else "",
            })
        return results

    def _fetch_channel_info(self, channel_ids: list[str]) -> dict[str, dict]:
        result: dict[str, dict] = {}
        unique = list(set(channel_ids))
        for i in range(0, len(unique), 50):
            batch = unique[i:i+50]
            try:
                resp = self._yt.channels().list(
                    id=",".join(batch), part="snippet,statistics",
                    fields="items(id,snippet(description,customUrl),statistics(subscriberCount))",
                ).execute()
            except Exception as e:
                logger.warning("channels.list 실패: %s", e)
                continue
            for item in resp.get("items", []):
                cid = item["id"]
                sn = item.get("snippet", {})
                cu = sn.get("customUrl", "")
                result[cid] = {
                    "subscriber_count": int(item.get("statistics", {}).get("subscriberCount", 0) or 0),
                    "channel_url": f"https://www.youtube.com/{cu}" if cu else f"https://www.youtube.com/channel/{cid}",
                    "description": sn.get("description", "")[:2000],
                }
        return result


# ── Claude Haiku 콘텐츠 분류 ─────────────────────────────────────────

_SYSTEM = (
    "당신은 유튜브 채널 콘텐츠 분류 전문가입니다. "
    "영상 정보를 분석해 셀러 교육/정보 채널 여부와 전환력·리스크 신호를 판단하세요. "
    "반드시 JSON만 응답하세요."
)

_PROMPT = """\
유튜브 채널 분석:
채널명: {handle}
영상 제목: {title}
영상 설명: {description}
자막 일부: {transcript}

아래 JSON으로만 응답하세요:
{{
  "is_seller_content": true/false,
  "is_educational": true/false,
  "content_summary": "채널 한줄 요약 (30자 이내, 한국어)",
  "confidence": "low/medium/high",
  "conversion_signals": {{
    "has_paid_course": true/false,
    "has_paid_membership": true/false,
    "has_ebook_sale": true/false,
    "has_consulting": true/false,
    "has_affiliate_experience": true/false,
    "has_tool_recommendation_content": true/false
  }},
  "risk_signals": {{
    "promotes_other_program": true/false,
    "sells_own_program": true/false,
    "is_program_company": true/false
  }}
}}

판단 기준:
- is_educational: 타인(셀러/예비셀러)에게 교육·정보를 제공하는 채널이면 true
  (단순 수익 인증 브이로그, 본인 쇼핑몰 운영 기록만 있으면 false)
- promotes_other_program: 특정 경쟁 프로그램/앱/웹서비스를 파트너로 적극 홍보하면 true (어플=프로그램=웹 동일)
- sells_own_program: 자체 개발한 프로그램/앱/웹서비스/자동화툴을 판매하면 true (어플=프로그램=웹 동일, 강의 판매는 해당 없음)
- is_program_company: 채널 운영 주체가 소프트웨어/프로그램/SaaS 업체 자체이면 true"""


def analyze_items_haiku(items: list[ContentItem], api_key: str) -> list[dict]:
    """
    Claude Haiku로 각 ContentItem 분류.
    Returns: list of ai_result dicts (ContentItem 순서 대응)
    """
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    results = []

    for item in items:
        try:
            user_msg = _PROMPT.format(
                handle=item.handle_name[:100],
                title=item.content_title[:200],
                description=item.content_body[:1500],
                transcript=item.content_transcript[:800],
            )
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                system=_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = resp.content[0].text.strip()
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            results.append(json.loads(m.group()) if m else {})
        except Exception as e:
            logger.warning("Haiku 분석 실패 [%s]: %s", item.content_id, e)
            results.append({})

    return results
