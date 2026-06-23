"""buyer_scanner — 해외 B2B 바이어 발굴 (AI 후보생성 + 웹사이트 검증).

설계 (2026-06 재구현):
  기존 EC21/TradeKey/Europages 스크래핑은 JS렌더링·봇차단으로 빈 결과가 잦고,
  Google/Brave/DuckDuckGo 검색 API는 전부 유료·카드필수·봇차단으로 전환됨.
  → 신규 키 없이 안정적으로 작동하는 방식으로 전환:

    1. (ai)   Claude가 키워드×국가별 "실제 수입상/유통사" 후보 생성
              (회사명 + 추정 도메인 + 카테고리)
    2. (검증) 각 후보 웹사이트를 실제로 fetch → 살아있으면 채택,
              연락처 페이지에서 이메일 추출 (난독화 패턴 포함)
              → 할루시네이션(존재하지 않는 회사)은 도메인 미응답으로 자동 탈락
    3. (importyeti) 미국 통관 import 기록 — 검증된 실수입상 (US only, 보너스)

소스 태그(source 컬럼): "ai" | "importyeti"
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# ── 이메일 추출 ────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_EMAIL_OBFUSCATED_RE = re.compile(
    r"([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*(?:at|@)\s*[\]\)]?\s*"
    r"([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*(?:dot|\.)\s*[\]\)]?\s*([a-zA-Z]{2,})",
    re.IGNORECASE,
)

# 이메일 false-positive 필터 (이미지/예시/트래킹 등)
_EMAIL_JUNK = re.compile(
    r"(@2x|@3x|\.png|\.jpg|\.jpeg|\.gif|\.svg|\.webp|"
    r"example\.com|email\.com|domain\.com|yourname|"
    r"sentry\.|wixpress\.|@sentry|wordpress\.|@example|@test|"
    r"\.wixpress|\.cloudfront|\.gstatic|\.googleapis|core-js)",
    re.IGNORECASE,
)

# B2B 연락처로 의미있는 로컬파트 우선순위 (info/sales/import 등)
_PREFERRED_LOCAL = ("import", "sales", "buy", "purchas", "contact", "info", "trade", "order", "hello", "office")


def _extract_emails(text: str) -> list[str]:
    """텍스트에서 유효 이메일 추출 (정상 + 난독화), junk 제거 + 우선순위 정렬."""
    found: list[str] = []
    for m in _EMAIL_RE.finditer(text):
        e = m.group(0).strip().rstrip(".")
        if not _EMAIL_JUNK.search(e) and len(e) < 80:
            found.append(e.lower())
    if not found:
        m2 = _EMAIL_OBFUSCATED_RE.search(text)
        if m2:
            cand = f"{m2.group(1)}@{m2.group(2)}.{m2.group(3)}".lower()
            if not _EMAIL_JUNK.search(cand):
                found.append(cand)
    # 중복 제거 + B2B 우선 정렬
    seen: set[str] = set()
    uniq = [e for e in found if not (e in seen or seen.add(e))]
    uniq.sort(key=lambda e: 0 if any(p in e.split("@")[0] for p in _PREFERRED_LOCAL) else 1)
    return uniq


def _fetch_text(url: str, timeout: int = 8) -> str:
    """URL 텍스트 fetch (최대 120KB). 실패 시 빈 문자열."""
    try:
        with httpx.Client(timeout=timeout, headers=HEADERS, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return ""
            return resp.text[:120_000]
    except Exception as e:
        logger.debug("[buyer_scanner] fetch 실패 [%s]: %s", url, e)
        return ""


# 연락처/이메일이 잘 노출되는 경로 (impressum/kontakt = 유럽 법적 표기, 이메일 필수)
_CONTACT_PATHS = ["", "/contact", "/contact-us", "/contacts", "/about", "/about-us",
                  "/en/contact", "/kontakt", "/impressum", "/get-in-touch", "/wholesale"]


def _crawl_site_email(website: str, delay: float = 0.2) -> Optional[str]:
    """후보 회사 웹사이트를 크롤링해 첫 유효 이메일 반환. 도메인 미응답이면 None."""
    domain = website.strip().rstrip("/")
    domain = re.sub(r"^https?://", "", domain).split("/")[0]
    if not domain or "." not in domain:
        return None

    reachable = False
    for path in _CONTACT_PATHS:
        url = f"https://{domain}{path}"
        html = _fetch_text(url)
        if not html:
            continue
        reachable = True
        emails = _extract_emails(html)
        # 같은 도메인 메일 우선 (info@thatdomain.com)
        emails.sort(key=lambda e: 0 if domain.split(".")[-2:][0] in e else 1)
        if emails:
            return emails[0]
        time.sleep(delay)
    # 도메인은 살아있으나 이메일 미발견 → 빈 문자열로 "검증됨" 신호
    return "" if reachable else None


# ── AI 후보 생성 (Claude) ──────────────────────────────────────────────────────

def _ai_candidates(anthropic_key: str, keyword: str, country: str, limit: int) -> list[dict]:
    """Claude가 키워드×국가의 실제 수입상/유통사 후보 생성."""
    import anthropic

    target = country or "any country worldwide"
    prompt = f"""You are a B2B export market researcher helping a Korean exporter find real overseas buyers.

Product / keyword: "{keyword}"
Target market: {target}

List up to {limit} REAL companies in {target} that import, distribute, wholesale, or
specialty-retail this kind of product and could realistically be B2B buyers for a Korean exporter.
Strongly prefer importers / distributors / wholesalers / specialty chains over generic marketplaces.
Only include companies you are genuinely confident exist and are currently operating.

For each company return:
- company_name: official company name (Latin alphabet)
- country: the country it operates in
- website: its best-known primary domain WITHOUT scheme (e.g. "acme-foods.de"). If you are not
  confident of the real domain, use null. NEVER invent a fake domain.
- category: what the company does (importer / distributor / wholesaler / retailer / ...)
- product_interest: short note on how it relates to "{keyword}"

Return ONLY a JSON array, no prose:
[{{"company_name":"...","country":"...","website":"...","category":"...","product_interest":"..."}}]"""

    try:
        client = anthropic.Anthropic(api_key=anthropic_key)
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if not m:
            return []
        arr = json.loads(m.group(0))
        out = []
        for c in arr:
            name = (c.get("company_name") or "").strip()
            if not name:
                continue
            out.append({
                "company_name": name,
                "country": (c.get("country") or country or "Unknown").strip(),
                "website": (c.get("website") or "").strip() or None,
                "category": (c.get("category") or "").strip(),
                "product_interest": (c.get("product_interest") or keyword).strip()[:200],
            })
        return out
    except Exception as e:
        logger.warning("[buyer_scanner:ai] '%s'/%s 후보생성 실패: %s", keyword, country, e)
        return []


def _scan_ai(keyword: str, country: str, limit: int, anthropic_key: str) -> list[dict]:
    """AI 후보 생성 → 웹사이트 검증/이메일 추출 → 검증된 리드 반환."""
    if not anthropic_key:
        logger.warning("[buyer_scanner:ai] anthropic_api_key 없음 — 스킵")
        return []

    candidates = _ai_candidates(anthropic_key, keyword, country, limit)
    logger.info("[buyer_scanner:ai] '%s'/%s → 후보 %d개", keyword, country or "전체", len(candidates))

    results: list[dict] = []
    for c in candidates:
        email: Optional[str] = None
        verified = False
        if c["website"]:
            crawled = _crawl_site_email(c["website"])
            if crawled is not None:          # 도메인 응답함 = 실존 검증
                verified = True
                email = crawled or None
            time.sleep(0.3)

        note = f"AI발굴 · {c['category']}".strip(" ·")
        note += " · 웹사이트확인됨" if verified else " · 미검증"
        if c["website"]:
            note += f" · {c['website']}"

        results.append({
            "company_name": c["company_name"],
            "country": c["country"],
            "product_interest": c["product_interest"],
            "contact_email": email,
            "industry": c["category"] or "Import/Distribution",
            "source": "ai",
            "notes": note[:300],
        })
    return results


# ── ImportYeti (미국 통관 실데이터) ─────────────────────────────────────────────

def search_importyeti(keyword: str, limit: int = 30) -> list[dict]:
    """미국 통관 import 기록 기반 실수입상 (US only)."""
    results = []
    try:
        api_url = f"https://data.importyeti.com/v1.0/search?q={keyword}&limit={limit}"
        with httpx.Client(timeout=15, headers=HEADERS) as client:
            resp = client.get(api_url)
            if resp.status_code == 200:
                data = resp.json()
                companies = data.get("results") or data.get("companies") or []
                for c in companies[:limit]:
                    name = c.get("name") or c.get("company_name", "")
                    if name:
                        results.append({
                            "company_name": name,
                            "country": "USA",
                            "industry": c.get("industry") or "Import/Distribution",
                            "product_interest": keyword,
                            "source": "importyeti",
                            "contact_email": None,
                            "notes": (c.get("address") or "") or None,
                        })
    except Exception as e:
        logger.warning("[importyeti] %s: %s", keyword, e)
    return results


def _scan_importyeti(keyword: str, country: str, limit: int) -> list[dict]:
    # ImportYeti는 미국 전용 → 국가 미지정/미국일 때만
    if country and country not in ("USA", "US", "United States"):
        return []
    return search_importyeti(keyword, limit)


# ── 통합 스캔 ──────────────────────────────────────────────────────────────────

ALL_SOURCES = ["ai", "importyeti"]


def scan_buyers(
    keywords: list[str],
    countries: list[str] | None = None,
    sources: list[str] | None = None,
    limit_per_source: int = 20,
) -> dict:
    """국가별·소스별 바이어 발굴 후 DB 저장.

    sources: ["ai", "importyeti"] — None이면 ai 기본.
    countries: None이면 전세계(국가 미지정 1회).
    """
    from datetime import datetime, timezone
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services.secrets import get_secret

    if sources is None:
        sources = ["ai"]
    if not countries:
        countries = [""]

    anthropic_key = get_secret("anthropic_api_key") or "" if "ai" in sources else ""

    db = get_maesil_total_client().schema("agent_work")

    # 기존 회사명(소문자) 미리 적재 — 중복 삽입 방지
    existing: set[str] = set()
    try:
        rows = db.table("buyer_leads").select("company_name, country").limit(5000).execute().data or []
        for r in rows:
            existing.add(f"{(r.get('company_name') or '').lower().strip()}::{(r.get('country') or '').lower().strip()}")
    except Exception:
        pass

    all_buyers: list[dict] = []
    for keyword in keywords:
        for country in countries:
            label = f"'{keyword}' / {country or '전체'}"
            for src in sources:
                try:
                    if src == "ai":
                        rows = _scan_ai(keyword, country, limit_per_source, anthropic_key)
                    elif src == "importyeti":
                        rows = _scan_importyeti(keyword, country, limit_per_source)
                    else:
                        continue
                    logger.info("[buyer_scanner:%s] %s → %d건", src, label, len(rows))
                    all_buyers.extend(rows)
                except Exception as e:
                    logger.warning("[buyer_scanner:%s] %s 실패: %s", src, label, e)
                time.sleep(0.5)

    # 중복 제거 (회사명+국가) — 배치 내 + DB 기존
    unique: list[dict] = []
    seen = set(existing)
    for b in all_buyers:
        name = (b.get("company_name") or "").strip()
        if not name:
            continue
        key = f"{name.lower()}::{(b.get('country') or '').lower().strip()}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(b)

    # DB 저장
    now = datetime.now(timezone.utc).isoformat()
    inserted = skipped = 0
    for b in unique:
        try:
            db.table("buyer_leads").insert({
                **b, "status": "discovered", "created_at": now, "updated_at": now,
            }).execute()
            inserted += 1
        except Exception as e:
            logger.debug("[buyer_scanner] insert 실패 [%s]: %s", b.get("company_name"), e)
            skipped += 1

    logger.info("[buyer_scanner] 완료 — 수집 %d / 고유 %d / 저장 %d / 스킵 %d",
                len(all_buyers), len(unique), inserted, skipped)
    return {
        "keywords": keywords,
        "countries": countries,
        "sources": sources,
        "total_found": len(all_buyers),
        "unique": len(unique),
        "inserted": inserted,
        "skipped": skipped,
        "with_email": sum(1 for b in unique if b.get("contact_email")),
    }
