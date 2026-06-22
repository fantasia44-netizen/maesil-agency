"""brand_discovery — 브랜드 키워드 현지어 번역 + 국가별 바이어 발굴.

흐름:
1. 브랜드 프로필 → Claude가 핵심 키워드 추출
2. 키워드 × 국가별 언어 → Claude 번역
3. 현지어 키워드로 EC21/TradeKey 검색
4. 결과 → Claude가 한국어 번역 정리
"""
from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# 국가 → 언어 코드 + 언어명
COUNTRY_LANG: dict[str, dict] = {
    "Japan":        {"code": "ja", "name": "일본어",   "name_en": "Japanese"},
    "China":        {"code": "zh", "name": "중국어",   "name_en": "Chinese (Simplified)"},
    "Vietnam":      {"code": "vi", "name": "베트남어", "name_en": "Vietnamese"},
    "Thailand":     {"code": "th", "name": "태국어",   "name_en": "Thai"},
    "Indonesia":    {"code": "id", "name": "인도네시아어", "name_en": "Indonesian"},
    "Malaysia":     {"code": "ms", "name": "말레이어", "name_en": "Malay"},
    "Philippines":  {"code": "fil","name": "필리핀어", "name_en": "Filipino"},
    "Germany":      {"code": "de", "name": "독일어",   "name_en": "German"},
    "France":       {"code": "fr", "name": "프랑스어", "name_en": "French"},
    "Spain":        {"code": "es", "name": "스페인어", "name_en": "Spanish"},
    "Mexico":       {"code": "es", "name": "스페인어", "name_en": "Spanish"},
    "Brazil":       {"code": "pt", "name": "포르투갈어", "name_en": "Portuguese"},
    "Italy":        {"code": "it", "name": "이탈리아어", "name_en": "Italian"},
    "Netherlands":  {"code": "nl", "name": "네덜란드어", "name_en": "Dutch"},
    "Poland":       {"code": "pl", "name": "폴란드어", "name_en": "Polish"},
    "UAE":          {"code": "ar", "name": "아랍어",   "name_en": "Arabic"},
    "Saudi Arabia": {"code": "ar", "name": "아랍어",   "name_en": "Arabic"},
    "Turkey":       {"code": "tr", "name": "터키어",   "name_en": "Turkish"},
    "Russia":       {"code": "ru", "name": "러시아어", "name_en": "Russian"},
    "India":        {"code": "hi", "name": "힌디어",   "name_en": "Hindi"},
    "USA":          {"code": "en", "name": "영어",     "name_en": "English"},
    "UK":           {"code": "en", "name": "영어",     "name_en": "English"},
    "Australia":    {"code": "en", "name": "영어",     "name_en": "English"},
    "Canada":       {"code": "en", "name": "영어",     "name_en": "English"},
    "Singapore":    {"code": "en", "name": "영어",     "name_en": "English"},
}


def _claude(anthropic_key: str) -> Any:
    import anthropic
    return anthropic.Anthropic(api_key=anthropic_key)


def extract_keywords(brand_profile: dict, anthropic_key: str) -> list[str]:
    """브랜드 프로필에서 바이어 검색용 핵심 키워드 추출 (한국어)."""
    client = _claude(anthropic_key)
    categories = ", ".join(brand_profile.get("product_categories") or [])
    prompt = f"""아래 브랜드/회사 정보에서 해외 바이어 발굴에 사용할 핵심 키워드 5~10개를 추출하세요.
수입업체, 유통사, 도매업체가 실제로 검색할 만한 제품/카테고리 키워드 위주로.

회사명: {brand_profile.get('company_name', '')}
브랜드명: {brand_profile.get('brand_name', '')}
제품 카테고리: {categories}
설명: {brand_profile.get('description', '')}

JSON 배열로만 응답. 예: ["korean food", "gochujang", "korean snack", "k-food importer"]"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    import json, re
    text = msg.content[0].text
    m = re.search(r'\[.*?\]', text, re.DOTALL)
    if m:
        return json.loads(m.group())
    return [brand_profile.get("brand_name") or brand_profile.get("company_name") or "korean product"]


def translate_keywords(keywords: list[str], country: str, anthropic_key: str) -> list[dict]:
    """키워드 목록을 해당 국가 언어로 번역. [{keyword_ko, keyword_local, language, country}]"""
    lang_info = COUNTRY_LANG.get(country)
    if not lang_info:
        # 영어로 fallback
        lang_info = {"code": "en", "name": "영어", "name_en": "English"}

    if lang_info["code"] == "en":
        # 영어는 번역 불필요
        return [{"keyword_ko": kw, "keyword_local": kw, "language": "en",
                 "country": country, "keyword_local_romanized": kw} for kw in keywords]

    client = _claude(anthropic_key)
    kw_list = "\n".join(f"- {kw}" for kw in keywords)
    prompt = f"""아래 키워드들을 {lang_info['name']}({lang_info['name_en']})로 번역하세요.
바이어/수입업체 검색에 사용할 용어입니다. 현지 비즈니스 용어로 자연스럽게 번역.

키워드:
{kw_list}

JSON 배열로 응답:
[{{"ko": "원문", "local": "{lang_info['name_en']} 번역", "romanized": "로마자 표기(있는 경우)"}}]"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        import json, re
        text = msg.content[0].text
        m = re.search(r'\[.*?\]', text, re.DOTALL)
        if m:
            items = json.loads(m.group())
            return [{
                "keyword_ko": item.get("ko", kw),
                "keyword_local": item.get("local", kw),
                "keyword_local_romanized": item.get("romanized"),
                "language": lang_info["code"],
                "country": country,
            } for item, kw in zip(items, keywords)]
    except Exception as e:
        logger.warning("[translate_keywords] %s/%s: %s", country, keywords, e)

    return [{"keyword_ko": kw, "keyword_local": kw, "language": lang_info["code"],
             "country": country, "keyword_local_romanized": None} for kw in keywords]


def translate_result_to_korean(texts: list[str], source_lang: str, anthropic_key: str) -> list[str]:
    """발굴 결과(회사명, 제품명 등)를 한국어로 번역."""
    if source_lang == "en":
        return texts  # 영어는 그대로

    client = _claude(anthropic_key)
    items_str = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = f"""아래 텍스트들을 한국어로 번역하세요. 회사명/제품명/업종 정보입니다.
번역 불가능한 고유명사는 발음대로 표기. 번호 순서 유지하여 JSON 배열로만 응답.

{items_str}

응답: ["번역1", "번역2", ...]"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        import json, re
        text = msg.content[0].text
        m = re.search(r'\[.*?\]', text, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception as e:
        logger.warning("[translate_to_ko] %s: %s", source_lang, e)
    return texts


def run_brand_discovery(brand_id: str, anthropic_key: str) -> dict:
    """브랜드 ID 기준으로 전체 발굴 파이프라인 실행."""
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services.buyer_scanner import scrape_ec21_buyers, scrape_tradekey_buyers
    from datetime import datetime, timezone

    db = get_maesil_total_client().schema("agent_work")
    now = datetime.now(timezone.utc).isoformat()

    # 브랜드 프로필 로드
    brand_rows = db.table("brand_profiles").select("*").eq("id", brand_id).limit(1).execute().data or []
    if not brand_rows:
        return {"error": "브랜드 없음"}
    brand = brand_rows[0]
    countries = brand.get("target_countries") or list(COUNTRY_LANG.keys())[:5]

    logger.info("[brand_discovery] 브랜드=%s 국가=%s", brand.get("company_name"), countries)

    # 1. 키워드 추출
    keywords_ko = extract_keywords(brand, anthropic_key)
    logger.info("[brand_discovery] 추출 키워드: %s", keywords_ko)

    total_found = 0
    total_saved = 0

    for country in countries:
        lang_info = COUNTRY_LANG.get(country, {"code": "en", "name": "영어"})

        # 2. 현지어 번역
        translations = translate_keywords(keywords_ko, country, anthropic_key)
        time.sleep(0.5)

        # DB에 키워드 번역 저장
        for t in translations:
            try:
                kw_row = db.table("brand_keywords").insert({
                    "brand_id": brand_id,
                    "keyword_ko": t["keyword_ko"],
                    "language": t["language"],
                    "country": country,
                    "keyword_local": t["keyword_local"],
                    "keyword_local_romanized": t.get("keyword_local_romanized"),
                    "created_at": now,
                }).execute().data or [{}]
                kw_id = (kw_row[0] or {}).get("id")
            except Exception:
                kw_id = None

            # 3. 현지어 키워드로 검색
            local_kw = t["keyword_local"]
            buyers: list[dict] = []
            buyers.extend(scrape_ec21_buyers(local_kw, country, limit=20))
            time.sleep(1)
            buyers.extend(scrape_tradekey_buyers(local_kw, country, limit=15))
            time.sleep(1)

            if not buyers:
                continue

            total_found += len(buyers)

            # 4. 결과를 한국어로 번역
            names = [b["company_name"] for b in buyers]
            products = [b.get("product_interest") or "" for b in buyers]

            names_ko = translate_result_to_korean(names, lang_info["code"], anthropic_key)
            products_ko = translate_result_to_korean(products, lang_info["code"], anthropic_key)
            time.sleep(0.5)

            # 5. brand_discovery_results에 저장
            for i, b in enumerate(buyers):
                try:
                    db.table("brand_discovery_results").insert({
                        "brand_id": brand_id,
                        "keyword_id": kw_id,
                        "company_name": b["company_name"],
                        "company_name_ko": names_ko[i] if i < len(names_ko) else None,
                        "country": country,
                        "language": lang_info["code"],
                        "contact_email": b.get("contact_email"),
                        "product_interest": b.get("product_interest"),
                        "product_interest_ko": products_ko[i] if i < len(products_ko) else None,
                        "source": b.get("source"),
                        "status": "discovered",
                        "saved_to_buyers": False,
                        "created_at": now,
                    }).execute()
                    total_saved += 1
                except Exception as e:
                    logger.warning("[brand_discovery] 결과 저장 실패: %s", e)

    return {
        "brand_id": brand_id,
        "brand_name": brand.get("brand_name") or brand.get("company_name"),
        "countries": countries,
        "keywords_extracted": keywords_ko,
        "total_found": total_found,
        "total_saved": total_saved,
    }
