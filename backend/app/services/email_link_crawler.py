"""
email_link_crawler.py — YouTube 채널 외부 링크 크롤링 이메일 추출.

흐름:
  1. YouTube channels.list(part=snippet) → About 탭 외부 링크 목록 수집
     (brandingSettings.channel.links 또는 topicDetails — 실제로는 비공개)
     대신 채널 About 페이지 HTML 스크래핑으로 링크 추출
  2. 각 외부 링크 페이지 fetch → 이메일 정규식 추출
  3. 링크트리/linktree 등 단계 추가 언롤
"""
from __future__ import annotations

import logging
import re
import time
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_EMAIL_OBFUSCATED_RE = re.compile(
    r"([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*(?:at|@)\s*[\]\)]?\s*"
    r"([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*(?:dot|\.)\s*[\]\)]?\s*([a-zA-Z]{2,})",
    re.IGNORECASE,
)

# 크롤링 대상 외부 링크 패턴 (유튜버들이 자주 등록하는 사이트)
_CRAWLABLE_HOSTS = re.compile(
    r"(tistory\.com|blog\.naver\.com|naver\.me|"
    r"linktree\.ee|linktr\.ee|litt\.ly|bio\.link|"
    r"notion\.so|notion\.site|"
    r"brunch\.co\.kr|"
    r"smartstore\.naver\.com|"
    r"forms\.gle|"
    r"cafe\.naver\.com|"
    r"sites\.google\.com|"
    r"[a-z0-9\-]+\.com|[a-z0-9\-]+\.co\.kr|[a-z0-9\-]+\.kr)",
    re.IGNORECASE,
)

# 크롤링 제외 도메인 (SNS, 동영상 등)
_SKIP_HOSTS = {
    "youtube.com", "www.youtube.com",
    "instagram.com", "www.instagram.com",
    "facebook.com", "www.facebook.com",
    "twitter.com", "x.com",
    "tiktok.com", "www.tiktok.com",
    "open.kakao.com", "pf.kakao.com",
    "t.me",
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}


def _fetch_text(url: str, timeout: int = 8) -> str:
    """URL 텍스트 fetch. 실패 시 빈 문자열."""
    try:
        import urllib.request
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(80_000)  # 최대 80KB
            charset = "utf-8"
            ct = resp.headers.get("Content-Type", "")
            m = re.search(r"charset=([\w\-]+)", ct)
            if m:
                charset = m.group(1)
            return raw.decode(charset, errors="ignore")
    except Exception as e:
        logger.debug("fetch 실패 [%s]: %s", url, e)
        return ""


def _extract_email_from_text(text: str) -> str | None:
    m = _EMAIL_RE.search(text)
    if m:
        return m.group(0)
    m2 = _EMAIL_OBFUSCATED_RE.search(text)
    if m2:
        return f"{m2.group(1)}@{m2.group(2)}.{m2.group(3)}"
    return None


def _extract_links_from_html(html: str, base_url: str) -> list[str]:
    """HTML에서 href 링크 추출."""
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
    links = []
    for h in hrefs:
        if h.startswith("mailto:"):
            continue
        if h.startswith("//"):
            h = "https:" + h
        elif h.startswith("/"):
            parsed = urlparse(base_url)
            h = f"{parsed.scheme}://{parsed.netloc}{h}"
        elif not h.startswith("http"):
            continue
        links.append(h)
    return links


def _is_crawlable(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
        if host in _SKIP_HOSTS:
            return False
        return bool(_CRAWLABLE_HOSTS.search(host))
    except Exception:
        return False


def _get_youtube_channel_links(channel_id: str, api_key: str) -> list[str]:
    """
    YouTube Data API로 채널 About 탭 외부 링크 수집.
    brandingSettings.channel.links 필드 (비공개 API — 실제로는 안 나옴).
    대신 채널 About 페이지 HTML 파싱으로 외부 링크 추출.
    """
    links = []

    # 채널 About 페이지 스크래핑 (YouTube HTML 파싱)
    for url_template in [
        f"https://www.youtube.com/channel/{channel_id}/about",
        f"https://www.youtube.com/@{channel_id}/about",  # customUrl인 경우 fallback
    ]:
        html = _fetch_text(url_template)
        if not html:
            continue

        # YouTube About 페이지의 외부 링크는 redirect URL 형태로 들어있음
        # "https://www.youtube.com/redirect?event=channel_description&redir_token=...&q=<실제URL>"
        redirect_matches = re.findall(
            r'(?:q|url)=([^&"\'>\s]+)',
            html,
        )
        for raw in redirect_matches:
            try:
                from urllib.parse import unquote
                decoded = unquote(raw)
                if decoded.startswith("http") and _is_crawlable(decoded):
                    links.append(decoded)
            except Exception:
                pass

        # 직접 href에 있는 외부 링크
        for lnk in _extract_links_from_html(html, url_template):
            if _is_crawlable(lnk):
                links.append(lnk)

        if links:
            break

    # 중복 제거, 최대 8개
    seen: set[str] = set()
    result = []
    for lnk in links:
        base = lnk.split("?")[0].rstrip("/")
        if base not in seen:
            seen.add(base)
            result.append(lnk)
        if len(result) >= 8:
            break
    return result


def _crawl_linktree(url: str) -> list[str]:
    """링크트리 페이지에서 하위 링크 추출."""
    html = _fetch_text(url)
    if not html:
        return []
    links = []
    for lnk in _extract_links_from_html(html, url):
        if _is_crawlable(lnk) and lnk != url:
            links.append(lnk)
    return links[:10]


def find_email_from_channel_links(
    channel_id: str,
    api_key: str,
    delay: float = 0.5,
) -> str | None:
    """
    YouTube 채널 외부 링크들을 크롤링해 이메일 추출.
    channel_id: YouTube channel ID (UC로 시작) 또는 customUrl handle
    반환: 이메일 문자열 or None
    """
    try:
        links = _get_youtube_channel_links(channel_id, api_key)
    except Exception as e:
        logger.warning("[email_crawler] 링크 수집 실패 [%s]: %s", channel_id, e)
        return None

    logger.debug("[email_crawler] 채널 %s → 링크 %d개: %s", channel_id, len(links), links)

    all_links_to_crawl: list[str] = []
    for lnk in links:
        host = urlparse(lnk).netloc.lower()
        # 링크트리 계열은 언롤
        if any(h in host for h in ["linktr.ee", "linktree.ee", "litt.ly", "bio.link"]):
            sub = _crawl_linktree(lnk)
            all_links_to_crawl.extend(sub)
            time.sleep(delay)
        else:
            all_links_to_crawl.append(lnk)

    # 직접 크롤
    for lnk in all_links_to_crawl[:12]:
        time.sleep(delay)
        html = _fetch_text(lnk)
        if not html:
            continue
        email = _extract_email_from_text(html)
        if email:
            logger.info("[email_crawler] 이메일 발견 [%s] → %s (from %s)", channel_id, email, lnk)
            return email

    return None


def bulk_crawl_missing_emails(
    tenant_id: str,
    limit: int = 20000,
    delay: float = 0.6,
) -> dict:
    """
    이메일 없는 YouTube approved 리드에 대해 채널 링크 크롤링 실행.
    백그라운드 스레드에서 호출. delay는 페이지당 초 단위 대기.
    """
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services.secrets import get_secret
    from datetime import datetime, timezone

    db = get_maesil_total_client().schema("agent_work")

    # YouTube API 키 조회
    try:
        youtube_api_key = get_secret(tenant_id, "youtube_api_key") or get_secret(tenant_id, "google_api_key") or ""
    except Exception:
        youtube_api_key = ""

    # 이메일 없는 YouTube approved 리드 조회
    # PostgREST 1,000행 상한 우회 페이지네이션 — 단일 .limit(200)이 미발송 785명 중
    # 200명만 크롤링하던 문제 수정. 미발송 리드 전체를 대상으로 한다.
    leads: list[dict] = []
    while len(leads) < limit:
        take = min(1000, limit - len(leads))
        batch = (
            db.table("outreach_leads")
            .select("id, platform_url, handle_name")
            .eq("tenant_id", tenant_id)
            .eq("platform", "youtube")
            .is_("contact_email", "null")
            .in_("status", ["approved", "draft_ready"])
            .order("id")
            .range(len(leads), len(leads) + take - 1)
            .execute()
        ).data or []
        leads.extend(batch)
        if len(batch) < take:
            break
    logger.info("[bulk_crawl] YouTube 이메일 없는 리드 %d건 크롤링 시작", len(leads))

    found = 0
    for lead in leads:
        platform_url = lead.get("platform_url") or ""
        # channel ID 또는 handle 추출
        # https://www.youtube.com/@handle  또는 https://www.youtube.com/channel/UCxxx
        channel_id = ""
        m = re.search(r"youtube\.com/channel/([\w\-]+)", platform_url)
        if m:
            channel_id = m.group(1)
        else:
            m2 = re.search(r"youtube\.com/@([\w\-]+)", platform_url)
            if m2:
                channel_id = "@" + m2.group(1)

        if not channel_id:
            continue

        try:
            email = find_email_from_channel_links(channel_id, youtube_api_key, delay=delay)
        except Exception as e:
            logger.warning("[bulk_crawl] 크롤링 실패 [%s]: %s", channel_id, e)
            continue

        if email:
            try:
                db.table("outreach_leads").update({
                    "contact_email": email,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("tenant_id", tenant_id).eq("id", lead["id"]).execute()
                found += 1
                logger.info("[bulk_crawl] 이메일 복구 [%s] %s → %s", lead.get("handle_name"), channel_id, email)
            except Exception as e:
                logger.warning("[bulk_crawl] DB 업데이트 실패 [%s]: %s", lead["id"], e)

    logger.info("[bulk_crawl] 완료: %d/%d건 이메일 복구", found, len(leads))
    return {"crawled": len(leads), "found": found}
