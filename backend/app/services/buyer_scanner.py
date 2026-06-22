"""buyer_scanner — 무료 소스에서 해외 B2B 바이어 발굴 (국가별 전세계).

소스:
1. ImportYeti  — 미국 통관 데이터 (US only, 무료 API)
2. EC21        — 전세계 바이어 디렉토리 (국가 필터 지원)
3. TradeKey    — 전세계 바이어 RFQ (국가 필터 지원)
4. Europages   — 유럽 기업 디렉토리 (유럽 국가)
5. ExportHub   — 전세계 바이어 디렉토리
6. MIC RFQ     — Made-in-China 바이어 요청 (전세계)
"""
from __future__ import annotations

import logging
import re
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# 국가 → EC21 국가코드 매핑
EC21_COUNTRY_CODES: dict[str, str] = {
    "USA": "US", "United States": "US",
    "Japan": "JP", "일본": "JP",
    "China": "CN", "중국": "CN",
    "Germany": "DE", "독일": "DE",
    "UK": "GB", "United Kingdom": "GB", "영국": "GB",
    "France": "FR", "프랑스": "FR",
    "Australia": "AU", "호주": "AU",
    "Canada": "CA", "캐나다": "CA",
    "India": "IN", "인도": "IN",
    "Brazil": "BR", "브라질": "BR",
    "UAE": "AE", "두바이": "AE",
    "Vietnam": "VN", "베트남": "VN",
    "Thailand": "TH", "태국": "TH",
    "Indonesia": "ID", "인도네시아": "ID",
    "Malaysia": "MY", "말레이시아": "MY",
    "Singapore": "SG", "싱가포르": "SG",
    "Philippines": "PH", "필리핀": "PH",
    "Mexico": "MX", "멕시코": "MX",
    "Italy": "IT", "이탈리아": "IT",
    "Spain": "ES", "스페인": "ES",
    "Netherlands": "NL", "네덜란드": "NL",
    "Poland": "PL", "폴란드": "PL",
    "Saudi Arabia": "SA", "사우디": "SA",
    "Turkey": "TR", "터키": "TR",
    "South Africa": "ZA", "남아공": "ZA",
    "Nigeria": "NG", "나이지리아": "NG",
    "Egypt": "EG", "이집트": "EG",
    "Russia": "RU", "러시아": "RU",
    "Kazakhstan": "KZ",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",
}

EUROPAGES_COUNTRIES: set[str] = {
    "DE", "FR", "GB", "IT", "ES", "NL", "PL", "BE", "SE", "AT",
    "CH", "DK", "FI", "NO", "CZ", "HU", "RO", "PT", "GR", "SK",
}


def _get_soup(url: str, timeout: int = 20):
    from bs4 import BeautifulSoup
    with httpx.Client(timeout=timeout, headers=HEADERS, follow_redirects=True) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            return None
        return BeautifulSoup(resp.text, "lxml")


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# ── 1. ImportYeti (미국 전용) ──────────────────────────────────────────────────

def search_importyeti(keyword: str, limit: int = 30) -> list[dict]:
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
                            "notes": c.get("address", "") or None,
                        })
    except Exception as e:
        logger.warning("[importyeti] %s: %s", keyword, e)
    return results


# ── 2. EC21 (전세계, 국가 필터) ───────────────────────────────────────────────

def scrape_ec21_buyers(keyword: str, country: str = "", limit: int = 30) -> list[dict]:
    from bs4 import BeautifulSoup
    results = []
    try:
        country_code = EC21_COUNTRY_CODES.get(country, country[:2].upper() if country else "")
        encoded = keyword.replace(" ", "+")
        url = f"https://www.ec21.com/global-buyer-directory/?searchWord={encoded}&selCountry={country_code}"
        soup = _get_soup(url)
        if not soup:
            return []

        items = (soup.select(".buyer_list li") or soup.select(".buyerList li")
                 or soup.select("ul.list li") or soup.select("[class*='buyer'] li"))

        for item in items[:limit]:
            company = _clean(item.select_one(".company, h3, h4, strong, .name, a[href*='buyer']").get_text() if item.select_one(".company, h3, h4, strong, .name, a[href*='buyer']") else "")
            cntry = _clean(item.select_one("[class*='country'], .country, .flag + span").get_text() if item.select_one("[class*='country'], .country, .flag + span") else country)
            product = _clean(item.select_one("[class*='product'], .want-to-buy, p").get_text() if item.select_one("[class*='product'], .want-to-buy, p") else keyword)[:200]
            email_a = item.find("a", href=re.compile(r"^mailto:"))
            email = email_a["href"].replace("mailto:", "").strip() if email_a else None

            if company and len(company) > 1:
                results.append({
                    "company_name": company, "country": cntry or country or "Unknown",
                    "product_interest": product, "contact_email": email,
                    "industry": "Import/Distribution", "source": "ec21", "notes": None,
                })
    except Exception as e:
        logger.warning("[ec21] %s/%s: %s", keyword, country, e)
    return results


# ── 3. TradeKey (전세계, 국가 필터) ──────────────────────────────────────────

def scrape_tradekey_buyers(keyword: str, country: str = "", limit: int = 20) -> list[dict]:
    results = []
    try:
        encoded = keyword.replace(" ", "+")
        country_param = country.replace(" ", "+") if country else ""
        url = f"https://www.tradekey.com/buyers/?search_keyword={encoded}&country={country_param}"
        soup = _get_soup(url)
        if not soup:
            return []

        items = (soup.select(".rfq-listing") or soup.select(".buyer-listing")
                 or soup.select(".listing-item") or soup.select("article"))

        for item in items[:limit]:
            name_el = item.select_one("h2, h3, .company-name, .buyer-name")
            country_el = item.select_one(".country, .location, [itemprop='addressCountry']")
            prod_el = item.select_one(".product-name, .requirement, p.desc, p")
            email_a = item.find("a", href=re.compile(r"^mailto:"))

            company = _clean(name_el.get_text()) if name_el else ""
            cntry = _clean(country_el.get_text()) if country_el else country
            product = _clean(prod_el.get_text())[:200] if prod_el else keyword
            email = email_a["href"].replace("mailto:", "").strip() if email_a else None

            if company and len(company) > 1:
                results.append({
                    "company_name": company, "country": cntry or "Unknown",
                    "product_interest": product, "contact_email": email,
                    "industry": "Import/Distribution", "source": "tradekey", "notes": None,
                })
    except Exception as e:
        logger.warning("[tradekey] %s/%s: %s", keyword, country, e)
    return results


# ── 4. Europages (유럽 전용) ──────────────────────────────────────────────────

def scrape_europages_buyers(keyword: str, country: str = "", limit: int = 20) -> list[dict]:
    """유럽 기업 디렉토리. 수입업체/유통사 검색."""
    results = []
    country_code = EC21_COUNTRY_CODES.get(country, "")
    if country and country_code not in EUROPAGES_COUNTRIES:
        return []  # 유럽 국가 아니면 스킵

    try:
        encoded = keyword.replace(" ", "-").lower()
        country_slug = country_code.lower() if country_code else ""
        base = f"https://www.europages.co.uk/en/search?q={keyword.replace(' ', '+')}"
        if country_slug:
            base += f"&country={country_slug.upper()}"
        soup = _get_soup(base)
        if not soup:
            return []

        items = (soup.select(".company-name") or soup.select("[class*='company']")
                 or soup.select("article, .card"))

        for item in items[:limit]:
            name_el = item.select_one("h2, h3, .name, a.company-name, strong")
            country_el = item.select_one(".country, .location, .address")
            prod_el = item.select_one(".activity, .description, p")

            company = _clean(name_el.get_text()) if name_el else ""
            cntry = _clean(country_el.get_text()) if country_el else country
            product = _clean(prod_el.get_text())[:200] if prod_el else keyword

            if company and len(company) > 1:
                results.append({
                    "company_name": company, "country": cntry or country or "Europe",
                    "product_interest": product, "contact_email": None,
                    "industry": "Import/Distribution", "source": "europages", "notes": None,
                })
    except Exception as e:
        logger.warning("[europages] %s/%s: %s", keyword, country, e)
    return results


# ── 5. ExportHub (전세계) ─────────────────────────────────────────────────────

def scrape_exporthub_buyers(keyword: str, country: str = "", limit: int = 20) -> list[dict]:
    results = []
    try:
        encoded = keyword.replace(" ", "+")
        url = f"https://www.exporthub.com/buyers/?keyword={encoded}"
        if country:
            url += f"&country={country.replace(' ', '+')}"
        soup = _get_soup(url)
        if not soup:
            return []

        items = (soup.select(".buyer-card, .rfq-item, .listing")
                 or soup.select("article, .card, li.item"))

        for item in items[:limit]:
            name_el = item.select_one("h2, h3, .company, .buyer-name, strong, a.title")
            country_el = item.select_one(".country, .location, [class*='country']")
            prod_el = item.select_one(".product, .desc, p")

            company = _clean(name_el.get_text()) if name_el else ""
            cntry = _clean(country_el.get_text()) if country_el else country
            product = _clean(prod_el.get_text())[:200] if prod_el else keyword

            if company and len(company) > 1:
                results.append({
                    "company_name": company, "country": cntry or "Unknown",
                    "product_interest": product, "contact_email": None,
                    "industry": "Import/Distribution", "source": "exporthub", "notes": None,
                })
    except Exception as e:
        logger.warning("[exporthub] %s/%s: %s", keyword, country, e)
    return results


# ── 통합 스캔 ──────────────────────────────────────────────────────────────────

# 소스 → 함수 매핑
_SCANNERS = {
    "importyeti":  lambda kw, co, lim: search_importyeti(kw, lim) if not co or co in ("USA", "US") else [],
    "ec21":        scrape_ec21_buyers,
    "tradekey":    scrape_tradekey_buyers,
    "europages":   scrape_europages_buyers,
    "exporthub":   scrape_exporthub_buyers,
}

ALL_SOURCES = list(_SCANNERS.keys())


def scan_buyers(
    keywords: list[str],
    countries: list[str] | None = None,
    sources: list[str] | None = None,
    limit_per_source: int = 30,
) -> dict:
    """국가별·소스별 바이어 발굴 후 DB 저장.

    countries: ["USA", "Japan", "Germany", ...] — None이면 국가 필터 없이 전체
    sources: None이면 ALL_SOURCES 전부 사용
    """
    if sources is None:
        sources = ALL_SOURCES
    if countries is None:
        countries = [""]  # 국가 필터 없음

    all_buyers: list[dict] = []
    seen: set[str] = set()

    for keyword in keywords:
        for country in countries:
            label = f"'{keyword}' / {country or '전체'}"
            logger.info("[buyer_scanner] %s 스캔", label)
            for src in sources:
                fn = _SCANNERS.get(src)
                if not fn:
                    continue
                try:
                    rows = fn(keyword, country, limit_per_source)
                    logger.info("[%s] %s → %d건", src, label, len(rows))
                    all_buyers.extend(rows)
                except Exception as e:
                    logger.warning("[%s] %s 실패: %s", src, label, e)
                time.sleep(1.5)

    # 중복 제거 (회사명 + 국가)
    unique: list[dict] = []
    for b in all_buyers:
        key = f"{b['company_name'].lower().strip()}::{b['country'].lower().strip()}"
        if key not in seen and b["company_name"].strip():
            seen.add(key)
            unique.append(b)

    # DB 저장
    from datetime import datetime, timezone
    from app.db.maesil_total_client import get_maesil_total_client
    db = get_maesil_total_client().schema("agent_work")
    now = datetime.now(timezone.utc).isoformat()

    inserted = skipped = 0
    for b in unique:
        try:
            db.table("buyer_leads").insert({**b, "status": "discovered",
                                            "created_at": now, "updated_at": now}).execute()
            inserted += 1
        except Exception:
            skipped += 1

    logger.info("[buyer_scanner] 완료 — 저장 %d / 스킵 %d", inserted, skipped)
    return {
        "keywords": keywords,
        "countries": countries,
        "sources": sources,
        "total_found": len(all_buyers),
        "unique": len(unique),
        "inserted": inserted,
        "skipped": skipped,
    }
