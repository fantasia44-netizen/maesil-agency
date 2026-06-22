"""buyer_scanner — 무료 소스에서 해외 B2B 바이어 발굴.

소스:
1. ImportYeti (data.importyeti.com) — 미국 통관 데이터 무료 API
   - 키워드로 미국 수입업체 검색
2. EC21 Global Buyer Directory — 글로벌 바이어 공개 디렉토리 스크래핑
3. TradeKey Buyer Directory — 추가 바이어 디렉토리

사용법:
    from app.services.buyer_scanner import scan_buyers
    result = scan_buyers(keywords=["korean food", "k-beauty"], countries=["USA", "Japan"])
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


# ── 1. ImportYeti (미국 통관 데이터, 무료) ─────────────────────────────────────

def search_importyeti(keyword: str, limit: int = 30) -> list[dict]:
    """키워드로 미국 수입업체 검색. ImportYeti 무료 API 사용."""
    results = []
    try:
        # ImportYeti 웹 검색 엔드포인트
        url = f"https://www.importyeti.com/company-search?q={httpx.URL(keyword).params}"
        # API 엔드포인트 시도
        api_url = f"https://data.importyeti.com/v1.0/search?q={keyword}&limit={limit}"
        with httpx.Client(timeout=15, headers=HEADERS) as client:
            resp = client.get(api_url)
            if resp.status_code == 200:
                data = resp.json()
                companies = data.get("results") or data.get("companies") or []
                for c in companies[:limit]:
                    results.append({
                        "company_name": c.get("name") or c.get("company_name", ""),
                        "country": "USA",
                        "industry": c.get("industry") or "Import/Distribution",
                        "product_interest": keyword,
                        "source": "importyeti",
                        "contact_email": None,
                        "notes": f"US importer — {c.get('address', '')}",
                    })
    except Exception as e:
        logger.warning("[importyeti] 검색 실패 (%s): %s", keyword, e)
    return results


def get_importyeti_company(company_name: str) -> dict | None:
    """ImportYeti에서 특정 회사 상세 조회."""
    try:
        slug = company_name.lower().replace(" ", "-").replace(",", "").replace(".", "")
        url = f"https://data.importyeti.com/v1.0/company/{slug}"
        with httpx.Client(timeout=10, headers=HEADERS) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning("[importyeti] 회사 조회 실패 (%s): %s", company_name, e)
    return None


# ── 2. EC21 바이어 디렉토리 스크래핑 ──────────────────────────────────────────

def scrape_ec21_buyers(keyword: str, limit: int = 30) -> list[dict]:
    """EC21 글로벌 바이어 디렉토리에서 바이어 목록 스크래핑."""
    from bs4 import BeautifulSoup
    results = []
    try:
        encoded = keyword.replace(" ", "+")
        url = f"https://www.ec21.com/global-buyer-directory/?searchWord={encoded}&catNo=&selCountry="
        with httpx.Client(timeout=20, headers=HEADERS, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                logger.warning("[ec21] HTTP %d for keyword=%s", resp.status_code, keyword)
                return []
            soup = BeautifulSoup(resp.text, "lxml")

        # 바이어 카드 파싱
        buyer_items = soup.select(".buyer_list li, .buyerList li, .list-buyer li, [class*='buyer'] li")
        if not buyer_items:
            # 대안 셀렉터
            buyer_items = soup.select("ul.list li")

        for item in buyer_items[:limit]:
            company = ""
            country = ""
            product = keyword
            email = None

            name_el = item.select_one(".company, .buyer-name, h3, h4, .name, strong")
            if name_el:
                company = name_el.get_text(strip=True)

            country_el = item.select_one(".country, [class*='country'], .flag + span")
            if country_el:
                country = country_el.get_text(strip=True)

            prod_el = item.select_one(".product, [class*='product'], .want-to-buy, p")
            if prod_el:
                product = prod_el.get_text(strip=True)[:200]

            email_el = item.find("a", href=re.compile(r"^mailto:"))
            if email_el:
                email = email_el["href"].replace("mailto:", "").strip()

            if company and len(company) > 1:
                results.append({
                    "company_name": company,
                    "country": country or "Unknown",
                    "product_interest": product,
                    "contact_email": email,
                    "industry": "Import/Distribution",
                    "source": "ec21",
                    "notes": None,
                })
    except Exception as e:
        logger.warning("[ec21] 스크래핑 실패 (%s): %s", keyword, e)
    return results


# ── 3. TradeKey 바이어 디렉토리 스크래핑 ──────────────────────────────────────

def scrape_tradekey_buyers(keyword: str, limit: int = 20) -> list[dict]:
    """TradeKey 글로벌 바이어 디렉토리 스크래핑."""
    from bs4 import BeautifulSoup
    results = []
    try:
        encoded = keyword.replace(" ", "+")
        url = f"https://www.tradekey.com/buyers/?search_keyword={encoded}"
        with httpx.Client(timeout=20, headers=HEADERS, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return []
            soup = BeautifulSoup(resp.text, "lxml")

        items = soup.select(".rfq-listing, .buyer-listing, .listing-item, article.rfq")
        for item in items[:limit]:
            company = ""
            country = ""
            product = keyword
            email = None

            name_el = item.select_one("h2, h3, .company-name, .buyer-name")
            if name_el:
                company = name_el.get_text(strip=True)

            country_el = item.select_one(".country, .location, [itemprop='addressCountry']")
            if country_el:
                country = country_el.get_text(strip=True)

            prod_el = item.select_one(".product-name, .requirement, p.desc")
            if prod_el:
                product = prod_el.get_text(strip=True)[:200]

            email_el = item.find("a", href=re.compile(r"^mailto:"))
            if email_el:
                email = email_el["href"].replace("mailto:", "").strip()

            if company and len(company) > 1:
                results.append({
                    "company_name": company,
                    "country": country or "Unknown",
                    "product_interest": product,
                    "contact_email": email,
                    "industry": "Import/Distribution",
                    "source": "tradekey",
                    "notes": None,
                })
    except Exception as e:
        logger.warning("[tradekey] 스크래핑 실패 (%s): %s", keyword, e)
    return results


# ── 통합 스캔 ──────────────────────────────────────────────────────────────────

def scan_buyers(
    keywords: list[str],
    sources: list[str] | None = None,
    limit_per_source: int = 30,
) -> dict:
    """여러 소스에서 바이어 발굴 후 DB에 저장.

    sources: ["importyeti", "ec21", "tradekey"] — 기본 모두 사용
    """
    if sources is None:
        sources = ["importyeti", "ec21", "tradekey"]

    all_buyers: list[dict] = []
    seen: set[str] = set()  # 중복 제거 (company_name + country)

    for keyword in keywords:
        logger.info("[buyer_scanner] 키워드='%s' 스캔 시작", keyword)

        if "importyeti" in sources:
            rows = search_importyeti(keyword, limit_per_source)
            logger.info("[importyeti] %d건", len(rows))
            all_buyers.extend(rows)
            time.sleep(1)

        if "ec21" in sources:
            rows = scrape_ec21_buyers(keyword, limit_per_source)
            logger.info("[ec21] %d건", len(rows))
            all_buyers.extend(rows)
            time.sleep(2)

        if "tradekey" in sources:
            rows = scrape_tradekey_buyers(keyword, limit_per_source)
            logger.info("[tradekey] %d건", len(rows))
            all_buyers.extend(rows)
            time.sleep(2)

    # 중복 제거
    unique = []
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

    inserted = 0
    skipped = 0
    for b in unique:
        try:
            b["status"] = "discovered"
            b["created_at"] = now
            b["updated_at"] = now
            db.table("buyer_leads").insert(b).execute()
            inserted += 1
        except Exception:
            skipped += 1  # 중복 키 등

    logger.info("[buyer_scanner] 완료 — 저장 %d건 / 스킵 %d건", inserted, skipped)
    return {
        "keywords": keywords,
        "sources": sources,
        "total_found": len(all_buyers),
        "unique": len(unique),
        "inserted": inserted,
        "skipped": skipped,
    }
