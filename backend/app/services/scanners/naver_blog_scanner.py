"""
naver_blog_scanner.py — 네이버 블로그 파트너 발굴 스캐너.

Naver Search API /v1/search/blog 사용 (무료, 25,000콜/일).
블로그 포스트 → 채널(블로그) 수준 집계 → Claude Haiku GATE 적용.
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, quote

import httpx

from .base import BaseScanner, ContentItem, filter_already_scanned

logger = logging.getLogger(__name__)

# ── 스캔 키워드 ────────────────────────────────────────────────────────
KEYWORDS = [
    "스마트스토어 광고 방법",
    "쿠팡 로켓그로스 ROAS",
    "온라인 셀러 마케팅 비용",
    "스마트스토어 키워드 광고 세팅",
    "쿠팡파트너스 수익 공개",
    "쿠팡 광고비 절감",
    "스마트스토어 매출 공개",
    "온라인 쇼핑몰 광고 분석",
    "네이버 쇼핑 광고 최적화",
    "스마트스토어 운영 노하우",
]

# 네이버 블로그 포스트당 최소 조회수 필터 (Naver API에는 없으므로 제목 키워드로 대체)
_MIN_CONTENT_LEN = 30    # API description 최소 길이 (짧으면 빈 결과)
_MAX_RESULTS_PER_KW = 20  # 키워드당 최대 수집 건수


class NaverBlogScanner(BaseScanner):
    """네이버 블로그 검색 스캐너."""

    platform = "naver_blog"
    keywords = KEYWORDS

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._headers = {
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
        }
        self._search_cache: dict[str, dict] = {}  # url → API 원본 결과 캐시

    # ── Naver Search API ──────────────────────────────────────────────

    def _search_blog(self, query: str, display: int = 20, start: int = 1) -> list[dict]:
        """Naver 블로그 검색 API 호출."""
        url = "https://openapi.naver.com/v1/search/blog"
        params = {
            "query": query,
            "display": display,
            "start": start,
            "sort": "date",  # 최신순
        }
        try:
            r = httpx.get(url, params=params, headers=self._headers, timeout=10)
            r.raise_for_status()
            data = r.json()
            return data.get("items", [])
        except Exception as e:
            logger.warning("Naver blog search 실패 [%s]: %s", query, e)
            return []

    def _fetch_post_content(self, post_url: str) -> str:
        """블로그 포스트 HTML 파싱 → 본문 텍스트 추출 (최대 3000자)."""
        try:
            r = httpx.get(post_url, timeout=10, follow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0"})
            html = r.text

            # 네이버 블로그 iframe 처리
            iframe_m = re.search(
                r'<iframe[^>]+id=["\']mainFrame["\'][^>]+src=["\']([^"\']+)["\']', html
            )
            if iframe_m:
                iframe_url = "https://blog.naver.com" + iframe_m.group(1)
                r2 = httpx.get(iframe_url, timeout=10, follow_redirects=True,
                                headers={"User-Agent": "Mozilla/5.0"})
                html = r2.text

            # 텍스트 추출 (태그 제거)
            text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S)
            text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:3000]
        except Exception as e:
            logger.debug("포스트 파싱 실패 [%s]: %s", post_url, e)
            return ""

    def _extract_blog_id(self, link: str) -> str:
        """
        블로그 URL에서 blog_id(채널 식별자) 추출.
        https://blog.naver.com/USERNAME/... → USERNAME
        https://USERNAME.tistory.com/...  → USERNAME.tistory.com
        """
        parsed = urlparse(link)
        host = parsed.hostname or ""
        path = parsed.path

        if "blog.naver.com" in host:
            parts = [p for p in path.split("/") if p]
            return parts[0] if parts else link
        elif ".tistory.com" in host:
            return host  # 티스토리는 호스트가 채널ID
        else:
            return host or link

    # ── BaseScanner 구현 ─────────────────────────────────────────────

    def search(self, keyword: str) -> list[str]:
        """키워드 검색 → 포스트 URL(content_id) 목록 반환. API 결과를 캐시에 저장."""
        items = self._search_blog(keyword, display=_MAX_RESULTS_PER_KW)
        time.sleep(0.1)  # rate limit 준수
        urls = []
        for item in items:
            url = item.get("link", "")
            if url:
                self._search_cache[url] = item  # description/title/bloggername 보존
                urls.append(url)
        return urls

    def fetch_content_details(self, content_ids: list[str]) -> list[ContentItem]:
        """포스트 URL 배치 → ContentItem 목록 반환 (채널 단위 중복 제거)."""
        seen_blog_ids: set[str] = set()
        results: list[ContentItem] = []

        for post_url in content_ids:
            blog_id = self._extract_blog_id(post_url)
            if blog_id in seen_blog_ids:
                continue

            # 캐시된 API 결과 우선 사용, 없으면 _collect_blog_profile 호출
            cached = self._search_cache.get(post_url)
            if cached:
                blog_items = [cached]
            else:
                blog_items = self._collect_blog_profile(blog_id, post_url)
            if not blog_items:
                continue

            best = blog_items[0]
            # 설명 길이 필터 (캐시 활용 시 통과율 대폭 향상)
            description = re.sub(r"<[^>]+>", "", best.get("description", ""))
            if len(description) < _MIN_CONTENT_LEN:
                continue

            seen_blog_ids.add(blog_id)

            # 포스트 본문 파싱 (선택적: API 설명만으로 부족할 때)
            body = description
            if len(body) < 500:
                body = self._fetch_post_content(best.get("link", post_url)) or body
                time.sleep(0.3)

            # 연락처 텍스트 수집: 포스트 본문 + 추가 포스트들의 설명
            all_descs = " ".join(
                re.sub(r"<[^>]+>", "", it.get("description", ""))
                for it in blog_items
            )
            contact_text = f"{body} {all_descs}"

            # 블로그명 정제
            handle_name = re.sub(r"<[^>]+>", "", best.get("bloggername", blog_id))

            # 발행일 파싱 (예: "20240105" or RFC format)
            pub_date = _parse_naver_date(best.get("postdate", ""))

            # 포스트 URL (플랫폼에 맞게 정규화)
            platform_url = _normalize_blog_url(blog_id, post_url)

            item = ContentItem(
                platform="naver_blog",
                platform_id=blog_id,
                platform_url=platform_url,
                content_id=post_url,
                handle_name=handle_name,
                content_title=re.sub(r"<[^>]+>", "", best.get("title", "")),
                content_body=body[:3000],
                views=0,                    # Naver API는 조회수 미제공
                comments=0,
                published_at=pub_date,
                subscriber_count=None,      # 블로그 이웃 수 API 없음
                raw_contact_text=contact_text[:5000],
            )
            results.append(item)

            if len(results) >= 30:          # 키 소진 방지
                break

        return results

    def _collect_blog_profile(self, blog_id: str, original_url: str) -> list[dict]:
        """
        블로그 ID로 최근 포스트를 추가 수집해 채널 정보를 보강.
        Naver Search API는 site: 연산자를 지원하지 않으므로 bloggername 방식 사용.
        """
        # 네이버 블로그: username으로 해당 블로그 포스트 검색
        if "." not in blog_id:
            # bloggername 파라미터 없이 URL 패턴으로 최근 글 찾기
            # fallback: 원본 URL 하나만 반환 (추가 API 비용 최소화)
            return [{"link": original_url, "title": "", "description": "", "bloggername": blog_id, "postdate": ""}]

        # 티스토리/기타 도메인 기반 블로그: 도메인을 키워드로 검색
        try:
            items = self._search_blog(blog_id, display=3)
            if items:
                return items
        except Exception:
            pass

        # Fallback
        return [{"link": original_url, "title": "", "description": "", "bloggername": blog_id, "postdate": ""}]


# ── 날짜 파싱 유틸 ────────────────────────────────────────────────────

def _parse_naver_date(postdate: str) -> datetime | None:
    """Naver API postdate (YYYYMMDD) → datetime."""
    if not postdate:
        return None
    try:
        return datetime.strptime(postdate[:8], "%Y%m%d").replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _normalize_blog_url(blog_id: str, fallback_url: str) -> str:
    """blog_id → 채널 홈 URL."""
    if "." not in blog_id:
        return f"https://blog.naver.com/{blog_id}"
    if blog_id.endswith(".tistory.com") or ".tistory.com" in blog_id:
        return f"https://{blog_id}"
    return fallback_url


# ── Claude Haiku GATE 분석 ────────────────────────────────────────────

def analyze_items_haiku(items: list[ContentItem], api_key: str) -> list[dict]:
    """
    Claude Haiku로 블로그 포스트 일괄 분류.
    is_seller_content + is_educational GATE + conversion/risk 신호 감지.
    """
    if not items or not api_key:
        return [{}] * len(items)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    results: list[dict] = []

    for item in items:
        text_sample = f"""블로그명: {item.handle_name}
포스트 제목: {item.content_title}
본문 요약: {item.content_body[:1500]}"""

        prompt = f"""아래 블로그 포스트를 분석해 JSON으로만 답하세요.

{text_sample}

판단 기준:
- is_seller_content: 쿠팡·스마트스토어·네이버쇼핑 등 온라인 셀러/쇼핑몰 관련 내용이면 true
- is_educational: 다른 셀러에게 정보·방법·노하우를 제공하는 교육적 내용이면 true
  (단순 "나 얼마 벌었어요" 자랑글은 false)
- conversion_signals.has_paid_course: 유료 강의 판매 여부
- conversion_signals.has_paid_membership: 유료 멤버십/카페 운영 여부
- conversion_signals.has_ebook_sale: 전자책 판매 여부
- conversion_signals.has_consulting: 유료 컨설팅/코칭 여부
- conversion_signals.has_tool_recommendation_content: 외부 툴을 추천/소개하는 콘텐츠 여부
- conversion_signals.has_affiliate_experience: 제휴마케팅/파트너십 경험 언급 여부
- risk_signals.sells_competing_tool: 자체 엑셀 템플릿·프로그램·대시보드 판매 여부
- risk_signals.sells_own_program: 자체 유료 강의 프로그램/플랫폼 운영 여부
- risk_signals.is_competitor_partner: 경쟁 서비스(쿠팡 광고 분석 SaaS 등)의 공식 파트너 여부
- risk_signals.has_negative_tool_content: 외부 유료 툴에 부정적인 콘텐츠 여부
- content_summary: 이 블로거가 어떤 콘텐츠를 주로 다루는지 1문장 (한국어)
- confidence: 판단 신뢰도 (high/medium/low)

{{
  "is_seller_content": true/false,
  "is_educational": true/false,
  "conversion_signals": {{
    "has_paid_course": false,
    "has_paid_membership": false,
    "has_ebook_sale": false,
    "has_consulting": false,
    "has_tool_recommendation_content": false,
    "has_affiliate_experience": false
  }},
  "risk_signals": {{
    "sells_competing_tool": false,
    "sells_own_program": false,
    "is_competitor_partner": false,
    "has_negative_tool_content": false
  }},
  "content_summary": "...",
  "confidence": "high"
}}"""

        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            text = msg.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            results.append(json.loads(text))
        except Exception as e:
            logger.warning("Haiku 분석 실패 [%s]: %s", item.handle_name, e)
            results.append({})

        time.sleep(0.1)

    return results
