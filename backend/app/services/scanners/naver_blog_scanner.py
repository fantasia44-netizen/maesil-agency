"""
naver_blog_scanner.py — 네이버 블로그 파트너 발굴 스캐너.

Naver Search API /v1/search/blog 사용 (무료, 25,000콜/일).
블로그 포스트 → 채널(블로그) 수준 집계 → 프로필 스크랩(연락처) → Haiku GATE.
"""
from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from .base import BaseScanner, ContentItem

logger = logging.getLogger(__name__)

# ── 키워드 — 관련순(sim) + 최신순(date) 병행 ──────────────────────────
_KEYWORDS_SIM = [          # 관련도 높은 교육·정보형 블로거 발굴
    "스마트스토어 운영",
    "스마트스토어 광고",
    "스마트스토어 강의",
    "쿠팡 셀러",
    "쿠팡 광고",
    "온라인 셀러 강의",
    "쇼핑몰 창업",
    "네이버 쇼핑 키워드",
    "이커머스 강의",
    "구매대행 방법",
    "위탁판매 강의",
    "사입 노하우",
]
_KEYWORDS_DATE = [         # 최신 활성 블로거 발굴
    "스마트스토어 수익 공개",
    "쿠팡 수익 공개",
    "스마트스토어 매출 공개",
    "온라인 부업 후기",
]

_MAX_PER_KW = 20           # 키워드당 최대 수집 건수
_MAX_ITEMS  = 60           # 전체 상한 (API 콜 절약)


class NaverBlogScanner(BaseScanner):
    platform = "naver_blog"
    keywords  = _KEYWORDS_SIM + _KEYWORDS_DATE   # run_scan용 (사용 안 함, 직접 오버라이드)

    def __init__(self, client_id: str, client_secret: str, keywords: list[str] | None = None):
        self.client_id     = client_id
        self.client_secret = client_secret
        self._tenant_keywords = keywords or None   # 테넌트별 키워드(없으면 모듈 기본)
        self._headers = {
            "X-Naver-Client-Id":     client_id,
            "X-Naver-Client-Secret": client_secret,
        }
        self._api_cache: dict[str, dict] = {}   # url → API 원본

    # ── Naver Search API ─────────────────────────────────────────────

    def _search_blog(self, query: str, display: int = 20,
                     sort: str = "sim") -> list[dict]:
        try:
            r = httpx.get(
                "https://openapi.naver.com/v1/search/blog",
                params={"query": query, "display": display, "sort": sort},
                headers=self._headers, timeout=10,
            )
            r.raise_for_status()
            return r.json().get("items", [])
        except Exception as e:
            logger.warning("Naver blog search 실패 [%s]: %s", query, e)
            return []

    # ── BaseScanner 오버라이드 — 직접 run_scan 구현 ───────────────────

    def search(self, keyword: str) -> list[str]:
        """단일 키워드 → URL 목록 (BaseScanner 호환용, 실제론 run_scan 오버라이드)."""
        items = self._search_blog(keyword, display=_MAX_PER_KW, sort="sim")
        time.sleep(0.15)
        urls = []
        for it in items:
            url = it.get("link", "")
            if url:
                self._api_cache[url] = it
                urls.append(url)
        return urls

    def run_scan(self, tenant_id: str) -> dict:
        """
        키워드별 sim+date 병행 수집 → blog_id 단위 중복 제거 → fetch_content_details.
        테넌트 스코프 dedup + 테넌트별 키워드.

        중복 체크: 포스트 URL이 아닌 blog_id(채널)로 outreach_leads 확인.
        - 네이버 블로그는 같은 인기 포스트가 매일 동일 키워드에서 검색되므로
          post URL 기반 outreach_scanned_content 체크는 영구 0건을 유발.
        """
        sim_kws  = self._tenant_keywords or _KEYWORDS_SIM
        date_kws = self._tenant_keywords or _KEYWORDS_DATE

        # ── 1) 키워드 수집 ──
        seen_urls: set[str] = set()
        blog_id_to_best_url: dict[str, str] = {}   # blog_id → 대표 포스트 URL

        for kw in sim_kws:
            for it in self._search_blog(kw, display=_MAX_PER_KW, sort="sim"):
                url = it.get("link", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                self._api_cache[url] = it
                bid = _extract_blog_id(url)
                if bid and bid not in blog_id_to_best_url:
                    blog_id_to_best_url[bid] = url
            time.sleep(0.15)
            if len(blog_id_to_best_url) >= _MAX_ITEMS:
                break

        if len(blog_id_to_best_url) < _MAX_ITEMS:
            for kw in date_kws:
                for it in self._search_blog(kw, display=_MAX_PER_KW, sort="date"):
                    url = it.get("link", "")
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)
                    self._api_cache[url] = it
                    bid = _extract_blog_id(url)
                    if bid and bid not in blog_id_to_best_url:
                        blog_id_to_best_url[bid] = url
                time.sleep(0.15)
                if len(blog_id_to_best_url) >= _MAX_ITEMS:
                    break

        all_blog_ids = list(blog_id_to_best_url.keys())
        logger.info("[naver_blog] 검색 결과 블로그 %d개", len(all_blog_ids))

        # ── 2) 이미 outreach_leads에 있는 블로그 제외 (테넌트 스코프) ──
        new_blog_ids = _filter_new_blog_ids(tenant_id, all_blog_ids)
        logger.info("[naver_blog] 신규 블로그 %d개", len(new_blog_ids))

        if not new_blog_ids:
            return {"platform": self.platform, "total_searched": len(all_blog_ids),
                    "new_items": 0, "items": [], "new_content_ids": []}

        new_urls = [blog_id_to_best_url[bid] for bid in new_blog_ids]
        items = self.fetch_content_details(new_urls)
        logger.info("[naver_blog] 필터 통과 %d개", len(items))
        return {
            "platform": self.platform,
            "total_searched": len(all_blog_ids),
            "new_content_ids": new_urls,   # pipeline의 mark_scanned용
            "new_items": len(items),
            "items": items,
        }

    # ── ContentItem 변환 ─────────────────────────────────────────────

    def fetch_content_details(self, content_ids: list[str]) -> list[ContentItem]:
        seen_blog_ids: set[str] = set()
        results: list[ContentItem] = []

        for post_url in content_ids:
            blog_id = _extract_blog_id(post_url)
            if not blog_id or blog_id in seen_blog_ids:
                continue

            api_item = self._api_cache.get(post_url, {})
            raw_desc = re.sub(r"<[^>]+>", "", api_item.get("description", "")).strip()

            # 설명이 너무 짧으면 의미 없는 결과 — 스킵
            if len(raw_desc) < 20:
                continue

            seen_blog_ids.add(blog_id)

            # 1) 포스트 본문 크롤링 (항상 시도 — 연락처 추출 품질 향상)
            post_body = self._fetch_post_body(post_url)
            time.sleep(0.2)

            # 2) 블로그 프로필/소개 페이지 스크랩 (연락처 핵심)
            profile_text = self._fetch_blog_profile(blog_id, post_url)
            time.sleep(0.2)

            # 연락처 추출용 통합 텍스트: 프로필 > 포스트 본문 > API description
            contact_text = f"{profile_text} {post_body} {raw_desc}"

            # 콘텐츠 분석용: 포스트 본문 우선, 없으면 description
            content_body = post_body if len(post_body) > len(raw_desc) else raw_desc

            handle_name = re.sub(r"<[^>]+>", "",
                                 api_item.get("bloggername", "") or blog_id).strip()
            platform_url = _normalize_blog_url(blog_id, post_url)
            pub_date     = _parse_naver_date(api_item.get("postdate", ""))
            title        = re.sub(r"<[^>]+>", "",
                                  api_item.get("title", "")).strip()

            results.append(ContentItem(
                platform      = "naver_blog",
                platform_id   = blog_id,
                platform_url  = platform_url,
                content_id    = post_url,
                handle_name   = handle_name or blog_id,
                content_title = title,
                content_body  = content_body[:3000],
                views         = 0,
                comments      = 0,
                published_at  = pub_date,
                subscriber_count = None,   # Naver API 미제공
                raw_contact_text = contact_text[:6000],
            ))

            if len(results) >= 40:
                break

        return results

    # ── 스크래핑 헬퍼 ────────────────────────────────────────────────

    def _fetch_post_body(self, post_url: str) -> str:
        """포스트 본문 텍스트 추출 (Naver iframe 처리 포함)."""
        try:
            r = httpx.get(post_url, timeout=10, follow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0"})
            html = r.text

            # 네이버 블로그 iframe mainFrame 처리
            m = re.search(
                r'<iframe[^>]+id=["\']mainFrame["\'][^>]+src=["\']([^"\']+)["\']', html
            )
            if m:
                iframe_url = "https://blog.naver.com" + m.group(1)
                r2 = httpx.get(iframe_url, timeout=10, follow_redirects=True,
                               headers={"User-Agent": "Mozilla/5.0"})
                html = r2.text

            return _strip_html(html)[:3000]
        except Exception as e:
            logger.debug("포스트 파싱 실패 [%s]: %s", post_url, e)
            return ""

    def _fetch_blog_profile(self, blog_id: str, fallback_url: str) -> str:
        """
        블로그 소개/프로필 페이지 스크랩.
        이메일·카카오 연락처가 주로 여기 있음.
        """
        if "." in blog_id:
            # 티스토리: 블로그 메인에서 텍스트 추출
            try:
                r = httpx.get(f"https://{blog_id}", timeout=8,
                              follow_redirects=True,
                              headers={"User-Agent": "Mozilla/5.0"})
                return _strip_html(r.text)[:2000]
            except Exception:
                return ""

        # 네이버 블로그: 소개 페이지 시도
        candidates = [
            f"https://blog.naver.com/BlogInfo.nhn?blogId={blog_id}",
            f"https://blog.naver.com/{blog_id}",
        ]
        for url in candidates:
            try:
                r = httpx.get(url, timeout=8, follow_redirects=True,
                              headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200 and len(r.text) > 200:
                    text = _strip_html(r.text)[:2000]
                    if len(text) > 50:
                        return text
            except Exception:
                continue
        return ""


# ── 공통 유틸 ─────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S)
    text = re.sub(r"<style[^>]*>.*?</style>",  " ", text,  flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_blog_id(link: str) -> str:
    parsed = urlparse(link)
    host   = parsed.hostname or ""
    path   = parsed.path

    if "blog.naver.com" in host:
        parts = [p for p in path.split("/") if p]
        return parts[0] if parts else ""
    if ".tistory.com" in host:
        return host
    return host or ""


def _normalize_blog_url(blog_id: str, fallback: str) -> str:
    if not blog_id:
        return fallback
    if "." not in blog_id:
        return f"https://blog.naver.com/{blog_id}"
    if ".tistory.com" in blog_id:
        return f"https://{blog_id}"
    return fallback


def _filter_new_blog_ids(tenant_id: str, blog_ids: list[str]) -> list[str]:
    """해당 테넌트의 outreach_leads에 없는 blog_id만 반환 (채널 단위 중복 방지)."""
    if not blog_ids:
        return []
    try:
        from app.db.maesil_total_client import get_maesil_total_client
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_leads")
            .select("platform_id")
            .eq("tenant_id", tenant_id)
            .eq("platform", "naver_blog")
            .in_("platform_id", blog_ids)
            .execute()
        )
        existing = {r["platform_id"] for r in (resp.data or [])}
        return [bid for bid in blog_ids if bid not in existing]
    except Exception:
        return blog_ids   # DB 오류 시 전부 처리


def _parse_naver_date(postdate: str) -> datetime | None:
    if not postdate:
        return None
    try:
        return datetime.strptime(postdate[:8], "%Y%m%d").replace(tzinfo=timezone.utc)
    except Exception:
        return None


# ── Claude Haiku GATE 분석 ────────────────────────────────────────────

def analyze_items_haiku(items: list[ContentItem], api_key: str) -> list[dict]:
    """
    Claude Haiku로 블로그 포스트 일괄 분류.
    셀러 콘텐츠 여부 + conversion/risk 신호 감지.
    """
    if not items or not api_key:
        return [{}] * len(items)

    import anthropic
    client  = anthropic.Anthropic(api_key=api_key)
    results: list[dict] = []

    for item in items:
        sample = (
            f"블로그명: {item.handle_name}\n"
            f"포스트 제목: {item.content_title}\n"
            f"본문 요약: {item.content_body[:2000]}"
        )

        prompt = f"""아래 블로그 포스트를 분석해 JSON으로만 답하세요.

{sample}

판단 기준:
- is_seller_content: 쿠팡·스마트스토어·네이버쇼핑 등 온라인 셀러/쇼핑몰 관련이면 true
- is_educational: 다른 셀러에게 노하우·방법·정보를 제공하는 교육적 내용이면 true
- conversion_signals.has_paid_course: 유료 강의 판매
- conversion_signals.has_paid_membership: 유료 멤버십/카페 운영
- conversion_signals.has_ebook_sale: 전자책 판매
- conversion_signals.has_consulting: 유료 컨설팅/코칭
- conversion_signals.has_tool_recommendation_content: 외부 툴 추천/소개 콘텐츠
- conversion_signals.has_affiliate_experience: 제휴마케팅/파트너십 경험 언급
- risk_signals.promotes_other_program: 특정 경쟁 프로그램/앱/웹서비스를 파트너로 적극 홍보하면 true (어플=프로그램=웹 동일)
- risk_signals.sells_own_program: 자체 개발 프로그램/앱/웹서비스/자동화툴을 판매하면 true (강의 판매는 해당 없음)
- risk_signals.is_program_company: 블로그 운영 주체가 소프트웨어/프로그램/SaaS 업체 자체이면 true
- content_summary: 이 블로거가 주로 다루는 내용 1문장 (한국어)
- confidence: high/medium/low

{{
  "is_seller_content": true,
  "is_educational": false,
  "conversion_signals": {{
    "has_paid_course": false,
    "has_paid_membership": false,
    "has_ebook_sale": false,
    "has_consulting": false,
    "has_tool_recommendation_content": false,
    "has_affiliate_experience": false
  }},
  "risk_signals": {{
    "promotes_other_program": false,
    "sells_own_program": false,
    "is_program_company": false
  }},
  "content_summary": "...",
  "confidence": "medium"
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
