"""
네이버 검색 (쇼핑 + 블로그/영상) — maesil-insight 게이트웨이 경유.

인증: maesil_insight_url + harness_api_token (이미 설정된 값 재사용)
네이버 API 키는 maesil-insight에서 관리 → agency에 별도 등록 불필요.
"""
from __future__ import annotations

import logging
import re

import httpx

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "")


def search_naver_shopping(
    keyword: str,
    display: int = 100,
    sort: str = "sim",
) -> dict:
    """
    maesil-insight /api/v1/naver/shopping-search 경유로 검색.
    결과를 셀러(판매처)별로 집계해 반환.

    Returns:
        {
          "keyword": str,
          "total_items": int,
          "sellers": [
            {
              "mall_name": str,
              "best_rank": int,
              "product_count": int,
              "price_min": int | None,
              "price_max": int | None,
              "categories": list[str],
              "sample_products": list[str],
              "store_url": str,
            },
            ...
          ]
        }
    """
    base_url = get_secret("maesil_insight_url")
    token    = get_secret("harness_api_token")

    if not base_url:
        return {"error": "maesil_insight_url 미설정 (/settings에서 등록)"}
    if not token:
        return {"error": "harness_api_token 미설정 (/settings에서 등록)"}

    url = base_url.rstrip("/") + "/api/v1/naver/shopping-search"
    try:
        r = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params={
                "keyword": keyword,
                "display": min(max(display, 1), 30),  # 30개 상한 (타임아웃 방지)
                "sort":    sort,
            },
            timeout=20,
        )
        r.raise_for_status()
        data  = r.json()
        items = data.get("items") or []

    except httpx.HTTPStatusError as e:
        logger.warning("naver shopping gateway error [%s]: %s", keyword, e)
        return {"error": f"인사이트 API 오류: {e.response.status_code}"}
    except Exception as e:
        logger.warning("naver shopping search error [%s]: %s", keyword, e)
        return {"error": str(e)}

    # 셀러별 집계
    sellers: dict[str, dict] = {}
    for idx, item in enumerate(items):
        mall = (item.get("mallName") or "").strip()
        if not mall:
            continue

        if mall not in sellers:
            sellers[mall] = {
                "mall_name":       mall,
                "best_rank":       idx + 1,
                "product_count":   0,
                "price_min":       None,
                "price_max":       None,
                "categories":      set(),
                "sample_products": [],
                "store_url":       f"https://smartstore.naver.com/{mall}",
            }

        s = sellers[mall]
        s["product_count"] += 1

        price = int(item.get("lprice") or 0)
        if price:
            s["price_min"] = min(s["price_min"] or price, price)
            s["price_max"] = max(s["price_max"] or price, price)

        cat = (item.get("category1") or "").strip()
        if cat:
            s["categories"].add(cat)

        if len(s["sample_products"]) < 3:
            s["sample_products"].append(_strip_html(item.get("title", "")))

    result_sellers = []
    for s in sellers.values():
        s["categories"] = list(s["categories"])
        result_sellers.append(s)
    result_sellers.sort(key=lambda x: x["best_rank"])

    return {
        "keyword":     keyword,
        "total_items": len(items),
        "sellers":     result_sellers,
    }


def search_naver_content(
    query: str,
    search_type: str = "blog",
    display: int = 10,
) -> dict:
    """네이버 블로그/영상 검색 — maesil-insight 게이트웨이 경유.

    search_type: "blog" | "video"
    Returns list of {title, link, description, pubDate} items.
    """
    base_url = get_secret("maesil_insight_url")
    token    = get_secret("harness_api_token")

    if not base_url:
        return {"error": "maesil_insight_url 미설정"}
    if not token:
        return {"error": "harness_api_token 미설정"}

    # maesil-insight 게이트웨이: /api/v1/naver/search?type=blog|video
    # sort=date → 최신순 정렬 (오래된 영상 참조 방지)
    url = base_url.rstrip("/") + "/api/v1/naver/search"
    try:
        r = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params={"query": query, "type": search_type, "display": min(display, 20), "sort": "date"},
            timeout=15,
        )
        r.raise_for_status()
        data  = r.json()
        items = data.get("items") or []
    except httpx.HTTPStatusError as e:
        logger.warning("naver content search error [%s/%s]: %s", search_type, query, e)
        return {"error": f"인사이트 API 오류: {e.response.status_code}"}
    except Exception as e:
        logger.warning("naver content search error [%s/%s]: %s", search_type, query, e)
        return {"error": str(e)}

    results = []
    for item in items[:display]:
        results.append({
            "title":       _strip_html(item.get("title", "")),
            "link":        item.get("link", ""),
            "description": _strip_html(item.get("description", ""))[:200],
            "pub_date":    item.get("pubDate", ""),
        })

    return {
        "query":       query,
        "search_type": search_type,
        "total":       len(results),
        "items":       results,
    }
