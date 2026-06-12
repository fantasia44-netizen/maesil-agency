"""
youtube_scanner — YouTube 쿠팡/스마트스토어 셀러 유튜버 스캔 파이프라인.

매일 1회 스케줄러에서 호출:
  1. 키워드 검색 (search.list, 100 units/call)
  2. 이미 스캔한 video_id 제외 (outreach_scanned_videos)
  3. 영상 상세 조회 (videos.list, 1 unit/50개)
     → 조회수 < 500 or 재생시간 ≤ 60s(Shorts) 제외
  4. 자막 수집 (youtube-transcript-api, 0 units)
  5. Claude Haiku 콘텐츠 분석
  6. 채널 상세 조회 (channels.list, 1 unit/50개)
  7. 점수 계산 → outreach_leads 업서트

일일 API 유닛 예산: ~2,000 / 10,000 (20%)
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ── 검색 키워드 ──────────────────────────────────────────────────────
SEARCH_KEYWORDS = [
    "스마트스토어 운영 노하우",
    "쿠팡파트너스 수익 후기",
    "온라인 셀러 강의",
    "구매대행 방법 알려드림",
    "위탁판매 시작하기",
    "스마트스토어 상위노출 방법",
    "쿠팡 광고 최적화",
    "온라인 쇼핑몰 운영",
    "네이버 스마트스토어 강의",
    "셀러마켓 수익 공개",
]

MIN_VIEWS = 500
SCORE_AUTO_SEND = 55   # 이 점수 이상이면 자동 이메일 발송 대상


# ── 유틸 ─────────────────────────────────────────────────────────────

def _get_api_key() -> str | None:
    from app.services.secrets import get_secret
    return get_secret("youtube_api_key")


def _build_youtube(api_key: str):
    from googleapiclient.discovery import build
    return build("youtube", "v3", developerKey=api_key, cache_discovery=False)


def _parse_iso8601_duration(duration: str) -> int:
    """ISO 8601 duration (PT1M30S) → 초."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or "")
    if not m:
        return 0
    h, mi, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + s


def _extract_contact(text: str) -> dict:
    """설명란에서 이메일·카페·블로그·인스타 추출."""
    result: dict[str, str | None] = {
        "email": None, "naver_cafe": None, "blog": None, "instagram": None
    }

    email_m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    if email_m:
        result["email"] = email_m.group(0)

    cafe_m = re.search(r"https?://cafe\.naver\.com/[^\s\"'<>]+", text)
    if cafe_m:
        result["naver_cafe"] = cafe_m.group(0).rstrip("/.,)")

    blog_m = re.search(r"https?://(?:blog\.naver\.com|[\w\-]+\.tistory\.com)/[^\s\"'<>]*", text)
    if blog_m:
        result["blog"] = blog_m.group(0).rstrip("/.,)")

    ig_m = re.search(r"https?://(?:www\.)?instagram\.com/[^\s\"'<>]+", text)
    if ig_m:
        result["instagram"] = ig_m.group(0).rstrip("/.,)")

    return result


# ── Step 1: 키워드 검색 ──────────────────────────────────────────────

def _search_videos(youtube, keyword: str, max_results: int = 50) -> list[str]:
    """keyword로 유튜브 영상 검색 → video_id 목록 반환 (100 units)."""
    try:
        resp = youtube.search().list(
            q=keyword,
            part="id",
            type="video",
            videoDuration="medium",   # 4~20분 (Shorts 자동 제외)
            relevanceLanguage="ko",
            regionCode="KR",
            maxResults=max_results,
            fields="items(id/videoId)",
        ).execute()
        return [item["id"]["videoId"] for item in resp.get("items", [])]
    except Exception as e:
        logger.warning("youtube_scanner: search 실패 [%s]: %s", keyword, e)
        return []


# ── Step 2: DB 중복 확인 ─────────────────────────────────────────────

def _filter_already_scanned(video_ids: list[str]) -> list[str]:
    """outreach_scanned_videos에 없는 video_id만 반환."""
    if not video_ids:
        return []
    from app.db.maesil_total_client import get_maesil_total_client
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_scanned_videos")
            .select("video_id")
            .in_("video_id", video_ids)
            .execute()
        )
        already = {row["video_id"] for row in (resp.data or [])}
        return [vid for vid in video_ids if vid not in already]
    except Exception as e:
        logger.warning("youtube_scanner: scanned_videos 조회 실패: %s", e)
        return video_ids


def _mark_scanned(video_ids: list[str], channel_map: dict[str, str]) -> None:
    """video_id 목록을 outreach_scanned_videos에 기록."""
    if not video_ids:
        return
    from app.db.maesil_total_client import get_maesil_total_client
    rows = [
        {"video_id": vid, "channel_id": channel_map.get(vid, "")}
        for vid in video_ids
    ]
    try:
        get_maesil_total_client().schema("agent_work").table("outreach_scanned_videos").upsert(
            rows, on_conflict="video_id"
        ).execute()
    except Exception as e:
        logger.warning("youtube_scanner: mark_scanned 실패: %s", e)


# ── Step 3: 영상 상세 조회 + 필터 ────────────────────────────────────

def _batch_video_details(youtube, video_ids: list[str]) -> list[dict]:
    """videos.list 배치 조회 (50개씩, 1 unit/50개).

    반환: 조회수>=500 AND 재생시간>60s 인 영상만.
    """
    results = []
    now_utc = datetime.now(timezone.utc)

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        try:
            resp = youtube.videos().list(
                id=",".join(batch),
                part="snippet,statistics,contentDetails",
                fields=(
                    "items(id,snippet(title,description,channelId,channelTitle,publishedAt),"
                    "statistics(viewCount),contentDetails(duration))"
                ),
            ).execute()
        except Exception as e:
            logger.warning("youtube_scanner: videos.list 실패: %s", e)
            continue

        for item in resp.get("items", []):
            view_count = int(item.get("statistics", {}).get("viewCount", 0) or 0)
            duration_s = _parse_iso8601_duration(
                item.get("contentDetails", {}).get("duration", "PT0S")
            )
            if view_count < MIN_VIEWS or duration_s <= 60:
                continue

            snippet = item.get("snippet", {})
            published_str = snippet.get("publishedAt", "")
            try:
                published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            except Exception:
                published_at = None

            results.append({
                "video_id": item["id"],
                "title": snippet.get("title", ""),
                "description": snippet.get("description", "")[:3000],
                "channel_id": snippet.get("channelId", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "view_count": view_count,
                "published_at": published_at,
                "duration_s": duration_s,
                "recent": published_at and (now_utc - published_at) < timedelta(days=90),
            })

    return results


# ── Step 4: 자막 수집 ────────────────────────────────────────────────

def _fetch_transcript(video_id: str) -> str:
    """youtube-transcript-api로 자막 수집 (0 API units). 실패시 빈 문자열."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
        segments = YouTubeTranscriptApi.get_transcript(video_id, languages=["ko", "en"])
        return " ".join(seg["text"] for seg in segments)[:2500]
    except Exception:
        return ""


# ── Step 5: Claude Haiku 콘텐츠 분석 ─────────────────────────────────

_ANALYSIS_SYSTEM = (
    "당신은 유튜브 채널 콘텐츠 분류 전문가입니다. "
    "영상 정보를 보고 쿠팡/스마트스토어 셀러 관련 교육/후기 채널인지 판단하세요. "
    "반드시 JSON만 응답하세요."
)

_ANALYSIS_TMPL = """\
유튜브 영상 정보:
제목: {title}
설명: {description}
자막(일부): {transcript}

아래 JSON으로만 응답하세요:
{{
  "is_seller_content": true/false,
  "content_summary": "채널 콘텐츠 한줄 요약 (한국어, 30자 이내)",
  "confidence": "low/medium/high"
}}"""


def _analyze_content_batch(videos: list[dict]) -> list[dict]:
    """Claude Haiku로 각 영상 콘텐츠 분석 (배치 처리)."""
    from app.services.secrets import get_secret
    api_key = get_secret("anthropic_api_key")
    if not api_key:
        for v in videos:
            v["is_seller_content"] = False
            v["content_summary"] = ""
            v["ai_confidence"] = "low"
        return videos

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
    except Exception as e:
        logger.warning("youtube_scanner: anthropic 클라이언트 초기화 실패: %s", e)
        for v in videos:
            v["is_seller_content"] = False
            v["content_summary"] = ""
            v["ai_confidence"] = "low"
        return videos

    for video in videos:
        transcript = _fetch_transcript(video["video_id"])
        try:
            user_msg = _ANALYSIS_TMPL.format(
                title=video.get("title", "")[:200],
                description=video.get("description", "")[:1500],
                transcript=transcript[:1000],
            )
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                system=_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = resp.content[0].text.strip()
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(m.group()) if m else {}
            video["is_seller_content"] = bool(data.get("is_seller_content", False))
            video["content_summary"] = data.get("content_summary", "")[:200]
            video["ai_confidence"] = data.get("confidence", "low")
        except Exception as e:
            logger.warning("youtube_scanner: AI 분석 실패 [%s]: %s", video.get("video_id"), e)
            video["is_seller_content"] = False
            video["content_summary"] = ""
            video["ai_confidence"] = "low"

    return videos


# ── Step 6: 채널 상세 조회 ────────────────────────────────────────────

def _batch_channel_details(youtube, channel_ids: list[str]) -> dict[str, dict]:
    """channels.list 배치 조회 (50개씩). channel_id → 구독자수/설명 매핑 반환."""
    result: dict[str, dict] = {}
    unique = list(set(channel_ids))

    for i in range(0, len(unique), 50):
        batch = unique[i:i+50]
        try:
            resp = youtube.channels().list(
                id=",".join(batch),
                part="snippet,statistics",
                fields="items(id,snippet(description,customUrl),statistics(subscriberCount))",
            ).execute()
        except Exception as e:
            logger.warning("youtube_scanner: channels.list 실패: %s", e)
            continue

        for item in resp.get("items", []):
            cid = item["id"]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            sub_count = int(stats.get("subscriberCount", 0) or 0)
            custom_url = snippet.get("customUrl", "")
            channel_url = (
                f"https://www.youtube.com/{custom_url}"
                if custom_url else f"https://www.youtube.com/channel/{cid}"
            )
            result[cid] = {
                "subscriber_count": sub_count,
                "channel_url": channel_url,
                "description": snippet.get("description", "")[:2000],
            }

    return result


# ── Step 7: 점수 계산 + DB 업서트 ────────────────────────────────────

def _score_lead(video: dict, contact: dict, channel_info: dict) -> int:
    """리드 점수 계산 (0~100)."""
    score = 0
    if contact.get("email"):
        score += 30
    if contact.get("naver_cafe"):
        score += 25
    if video.get("is_seller_content"):
        score += 25
    if video.get("recent"):
        score += 15
    sub = channel_info.get("subscriber_count", 0)
    if 500 <= sub <= 500_000:
        score += 10
    if contact.get("blog") or contact.get("instagram"):
        score += 5
    return min(score, 100)


def _upsert_lead(video: dict, contact: dict, channel_info: dict, score: int) -> None:
    from app.db.maesil_total_client import get_maesil_total_client
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "channel_id": video["channel_id"],
        "channel_title": video.get("channel_title", ""),
        "channel_url": channel_info.get("channel_url", ""),
        "subscriber_count": channel_info.get("subscriber_count"),
        "contact_email": contact.get("email"),
        "naver_cafe_url": contact.get("naver_cafe"),
        "blog_url": contact.get("blog"),
        "instagram_url": contact.get("instagram"),
        "best_video_id": video["video_id"],
        "best_video_title": video.get("title", ""),
        "best_video_views": video.get("view_count"),
        "best_video_published_at": video["published_at"].isoformat() if video.get("published_at") else None,
        "content_summary": video.get("content_summary", ""),
        "score": score,
        "updated_at": now,
    }
    try:
        (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_leads")
            .upsert(payload, on_conflict="channel_id")
            .execute()
        )
    except Exception as e:
        logger.warning("youtube_scanner: lead upsert 실패 [%s]: %s", video["channel_id"], e)


# ── 메인 파이프라인 ──────────────────────────────────────────────────

def run_daily_scan() -> dict:
    """
    매일 1회 실행. scheduler에서 호출.

    Returns: { new_leads, total_scanned, emailed, errors }
    """
    api_key = _get_api_key()
    if not api_key:
        logger.warning("youtube_scanner: youtube_api_key 미설정 — 스캔 스킵")
        return {"ok": False, "error": "youtube_api_key 미설정 (/settings에서 등록)"}

    youtube = _build_youtube(api_key)
    stats = {"total_searched": 0, "new_videos": 0, "leads_upserted": 0, "emailed": 0, "errors": []}

    # 1. 키워드 검색
    all_video_ids: list[str] = []
    seen_ids: set[str] = set()
    for kw in SEARCH_KEYWORDS:
        ids = _search_videos(youtube, kw)
        for vid in ids:
            if vid not in seen_ids:
                seen_ids.add(vid)
                all_video_ids.append(vid)
    stats["total_searched"] = len(all_video_ids)
    logger.info("youtube_scanner: 검색 결과 %d개 (중복 제거 후)", len(all_video_ids))

    # 2. DB 중복 제거
    new_ids = _filter_already_scanned(all_video_ids)
    stats["new_videos"] = len(new_ids)
    logger.info("youtube_scanner: 신규 video_id %d개", len(new_ids))

    if not new_ids:
        return {**stats, "ok": True, "message": "신규 영상 없음 (모두 이미 스캔됨)"}

    # 3. 영상 상세 조회 + 필터
    videos = _batch_video_details(youtube, new_ids)
    logger.info("youtube_scanner: 필터 통과 영상 %d개 (조회수≥500, 길이>60s)", len(videos))

    # 4+5. 자막 수집 + Claude 분석
    videos = _analyze_content_batch(videos)
    seller_videos = [v for v in videos if v.get("is_seller_content")]
    logger.info("youtube_scanner: 셀러 콘텐츠 확인 %d개", len(seller_videos))

    # 6. 채널 상세 조회
    channel_ids = list({v["channel_id"] for v in videos})
    channel_info_map = _batch_channel_details(youtube, channel_ids)

    # 7. 점수 계산 + 업서트
    channel_map: dict[str, str] = {v["video_id"]: v["channel_id"] for v in videos}
    processed_channels: set[str] = set()

    for video in videos:
        cid = video["channel_id"]
        if cid in processed_channels:
            continue

        channel_info = channel_info_map.get(cid, {})
        desc = video.get("description", "") + " " + channel_info.get("description", "")
        contact = _extract_contact(desc)

        score = _score_lead(video, contact, channel_info)
        _upsert_lead(video, contact, channel_info, score)
        processed_channels.add(cid)
        stats["leads_upserted"] += 1

    # 스캔 기록
    _mark_scanned(new_ids, channel_map)

    # 자동 이메일 발송 (score >= SCORE_AUTO_SEND, email 있음, status=new)
    try:
        from app.services.outreach_mailer import send_pending_batch
        result = send_pending_batch()
        stats["emailed"] = result.get("sent", 0)
    except Exception as e:
        logger.warning("youtube_scanner: 자동 이메일 발송 실패: %s", e)
        stats["errors"].append(f"mailer: {e}")

    logger.info(
        "youtube_scanner: 스캔 완료 — 검색=%d 신규=%d 리드=%d 발송=%d",
        stats["total_searched"], stats["new_videos"],
        stats["leads_upserted"], stats["emailed"],
    )
    return {**stats, "ok": True}
