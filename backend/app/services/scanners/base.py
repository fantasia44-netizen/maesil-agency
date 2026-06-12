"""
scanners/base.py — 플랫폼 무관 표준 인터페이스.

모든 플랫폼 스캐너(YouTube, 네이버블로그, 티스토리 등)는
BaseScanner를 상속하고 ContentItem 형식으로 데이터를 반환한다.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# ── 표준 데이터 모델 ──────────────────────────────────────────────────

@dataclass
class ContactInfo:
    email: str | None = None
    kakao: str | None = None          # 카카오채널 or 오픈채팅 링크
    naver_cafe: str | None = None
    blog: str | None = None
    instagram: str | None = None
    youtube: str | None = None        # 블로거가 유튜브도 운영 시


@dataclass
class ContentItem:
    """플랫폼 무관 표준 콘텐츠 형식."""

    # 플랫폼
    platform: str                     # youtube | naver_blog | tistory | instagram
    platform_id: str                  # channel_id / blog_url
    platform_url: str

    # 콘텐츠
    content_id: str                   # video_id / post_url / post_id
    handle_name: str                  # 채널명 / 블로그 제목
    content_title: str
    content_body: str                 # 영상 설명 / 포스트 본문 (분석용, 최대 3000자)
    content_transcript: str = ""      # 자막 / 전문 (0 API units)

    # 지표
    views: int = 0
    comments: int = 0
    published_at: datetime | None = None

    # 채널/블로그 통계
    subscriber_count: int | None = None
    content_count: int | None = None
    avg_comments: int | None = None
    community_size: int | None = None  # 카페 회원수 / 오픈채팅 인원

    # 원문 (연락처 추출용)
    raw_contact_text: str = ""         # 설명 + 채널 설명 통합


# ── 연락처 추출 (공통) ────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_CAFE_RE = re.compile(r"https?://cafe\.naver\.com/[^\s\"'<>]+")
_KAKAO_CHANNEL_RE = re.compile(r"https?://(?:pf|ch)\.kakao\.com/[^\s\"'<>]+")
_KAKAO_OPENCHAT_RE = re.compile(r"https?://open\.kakao\.com/[^\s\"'<>]+")
_BLOG_RE = re.compile(r"https?://(?:blog\.naver\.com|[\w\-]+\.tistory\.com)/[^\s\"'<>]*")
_INSTA_RE = re.compile(r"https?://(?:www\.)?instagram\.com/[^\s\"'<>]+")
_YOUTUBE_RE = re.compile(r"https?://(?:www\.)?youtube\.com/(?:@[\w\-]+|channel/[\w\-]+|c/[\w\-]+)")


def extract_contact(text: str) -> ContactInfo:
    """텍스트에서 연락처 정보 정규식 추출."""
    info = ContactInfo()

    m = _EMAIL_RE.search(text)
    if m:
        info.email = m.group(0)

    m = _CAFE_RE.search(text)
    if m:
        info.naver_cafe = m.group(0).rstrip("/.,)")

    m = _KAKAO_CHANNEL_RE.search(text) or _KAKAO_OPENCHAT_RE.search(text)
    if m:
        info.kakao = m.group(0).rstrip("/.,)")

    m = _BLOG_RE.search(text)
    if m:
        info.blog = m.group(0).rstrip("/.,)")

    m = _INSTA_RE.search(text)
    if m:
        info.instagram = m.group(0).rstrip("/.,)")

    m = _YOUTUBE_RE.search(text)
    if m:
        info.youtube = m.group(0).rstrip("/.,)")

    return info


# ── 중복 확인 공통 로직 ───────────────────────────────────────────────

def filter_already_scanned(platform: str, content_ids: list[str]) -> list[str]:
    """outreach_scanned_content에 없는 content_id만 반환."""
    if not content_ids:
        return []
    from app.db.maesil_total_client import get_maesil_total_client
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_scanned_content")
            .select("content_id")
            .eq("platform", platform)
            .in_("content_id", content_ids)
            .execute()
        )
        already = {r["content_id"] for r in (resp.data or [])}
        return [cid for cid in content_ids if cid not in already]
    except Exception:
        return content_ids


def mark_scanned(platform: str, content_ids: list[str], lead_id_map: dict[str, str]) -> None:
    """스캔한 content_id를 outreach_scanned_content에 기록."""
    if not content_ids:
        return
    from app.db.maesil_total_client import get_maesil_total_client
    rows = [
        {"platform": platform, "content_id": cid, "lead_id": lead_id_map.get(cid)}
        for cid in content_ids
    ]
    try:
        get_maesil_total_client().schema("agent_work").table("outreach_scanned_content").upsert(
            rows, on_conflict="platform,content_id"
        ).execute()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("mark_scanned 실패 [%s]: %s", platform, e)


# ── 동일인 병합 로직 ──────────────────────────────────────────────────

def find_existing_lead_by_contact(email: str | None, kakao: str | None) -> str | None:
    """동일 이메일 or 카카오 링크로 이미 등록된 리드 id 반환."""
    if not email and not kakao:
        return None
    from app.db.maesil_total_client import get_maesil_total_client
    db = get_maesil_total_client().schema("agent_work").table("outreach_leads")
    try:
        if email:
            resp = db.select("id").eq("contact_email", email).limit(1).execute()
            if resp.data:
                return resp.data[0]["id"]
        if kakao:
            resp = db.select("id").eq("contact_kakao", kakao).limit(1).execute()
            if resp.data:
                return resp.data[0]["id"]
    except Exception:
        pass
    return None


# ── 추상 베이스 클래스 ────────────────────────────────────────────────

class BaseScanner(ABC):
    platform: str
    keywords: list[str]

    @abstractmethod
    def search(self, keyword: str) -> list[str]:
        """키워드 검색 → content_id 목록 반환."""

    @abstractmethod
    def fetch_content_details(self, content_ids: list[str]) -> list[ContentItem]:
        """content_id 배치 조회 → ContentItem 목록 반환 (필터 포함)."""

    def run_scan(self) -> dict[str, Any]:
        """
        전체 스캔 실행 (공통 로직).
        Returns: { platform, total_searched, new_items, items }
        """
        import logging
        logger = logging.getLogger(self.__class__.__name__)

        all_ids: list[str] = []
        seen: set[str] = set()

        for kw in self.keywords:
            ids = self.search(kw)
            for cid in ids:
                if cid not in seen:
                    seen.add(cid)
                    all_ids.append(cid)

        logger.info("[%s] 검색 결과 %d개", self.platform, len(all_ids))

        new_ids = filter_already_scanned(self.platform, all_ids)
        logger.info("[%s] 신규 %d개", self.platform, len(new_ids))

        if not new_ids:
            return {"platform": self.platform, "total_searched": len(all_ids), "new_items": 0, "items": []}

        items = self.fetch_content_details(new_ids)
        logger.info("[%s] 필터 통과 %d개", self.platform, len(items))

        return {
            "platform": self.platform,
            "total_searched": len(all_ids),
            "new_content_ids": new_ids,
            "new_items": len(items),
            "items": items,
        }
