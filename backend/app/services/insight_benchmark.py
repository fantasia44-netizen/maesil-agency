"""
maesil-insight 벤치마크 조회 서비스.

카테고리별 평균 ROAS / 실수익률 / 주요 채널을 maesil-insight DB에서 읽어
영업 제안서에 삽입 가능한 형태로 반환.

maesil-insight 조회 실패 시 사내 수집 벤치마크(fallback) 반환.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ── 카테고리 키워드 매핑 ──────────────────────────────────────────
CATEGORY_MAP: dict[str, list[str]] = {
    "뷰티":    ["화장품", "스킨케어", "마스크팩", "선크림", "세럼", "미용", "beauty", "skincare", "토너", "앰플"],
    "식품":    ["식품", "음식", "건강식품", "다이어트", "영양제", "단백질", "food", "헬스푸드", "비타민"],
    "생활용품": ["생활용품", "주방", "청소", "욕실", "인테리어", "수납", "household", "가전", "주방용품"],
    "패션":    ["패션", "의류", "옷", "가방", "신발", "악세서리", "fashion", "의류잡화"],
    "반려동물": ["반려동물", "강아지", "고양이", "펫", "pet", "사료", "간식"],
    "육아":    ["육아", "유아", "아기", "임산부", "유모차", "baby", "키즈"],
}

# ── 업계 기준 fallback (충분한 샘플 수집 전 또는 조회 실패 시) ────
FALLBACK: dict[str, dict] = {
    "뷰티":    {"avg_roas": 3.8, "avg_margin_pct": 22, "top_channel": "네이버쇼핑", "sample_size": 120},
    "식품":    {"avg_roas": 2.9, "avg_margin_pct": 15, "top_channel": "쿠팡",       "sample_size": 85},
    "생활용품": {"avg_roas": 3.2, "avg_margin_pct": 18, "top_channel": "네이버쇼핑", "sample_size": 67},
    "패션":    {"avg_roas": 4.1, "avg_margin_pct": 28, "top_channel": "네이버쇼핑", "sample_size": 94},
    "반려동물": {"avg_roas": 3.5, "avg_margin_pct": 20, "top_channel": "쿠팡",       "sample_size": 42},
    "육아":    {"avg_roas": 3.1, "avg_margin_pct": 16, "top_channel": "네이버쇼핑", "sample_size": 38},
    "기타":    {"avg_roas": 3.0, "avg_margin_pct": 17, "top_channel": "네이버쇼핑", "sample_size": 50},
}


def detect_category(text: str) -> str:
    """키워드/카테고리명 텍스트로 대분류 추론."""
    t = text.lower()
    for cat, keywords in CATEGORY_MAP.items():
        if any(k in t for k in keywords):
            return cat
    return "기타"


def get_benchmark(keyword_or_area: str) -> dict:
    """
    카테고리 벤치마크 반환.

    1. maesil-insight DB에서 실데이터 조회 시도
    2. 실패 or 데이터 없으면 fallback 반환

    반환 형태:
    {
        "category": "뷰티",
        "avg_roas": 3.8,
        "avg_margin_pct": 22,
        "top_channel": "네이버쇼핑",
        "sample_size": 120,
        "source": "maesil-insight:naver_ad_sync_log" | "benchmark"
    }
    """
    category = detect_category(keyword_or_area)

    try:
        from app.db.registry_client import get_db_client
        client = get_db_client("maesil-insight")

        # ROAS 관련 테이블 탐색
        tables_r = client.rpc("execute_readonly_sql", {
            "query": """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND (
                    table_name ILIKE '%roas%'
                    OR table_name ILIKE '%perf%'
                    OR table_name ILIKE '%revenue%'
                    OR table_name ILIKE '%ad_sync%'
                    OR table_name ILIKE '%report%'
                  )
                ORDER BY table_name
                LIMIT 8
            """
        }).execute()
        tables = [r.get("table_name") for r in (tables_r.data or []) if r.get("table_name")]
        logger.info("[insight_benchmark] 후보 테이블: %s", tables)

        for tbl in tables:
            try:
                r2 = client.rpc("execute_readonly_sql", {
                    "query": f"""
                        SELECT
                            ROUND(AVG(roas)::numeric, 2)          AS avg_roas,
                            ROUND(AVG(net_margin_pct)::numeric, 1) AS avg_margin_pct,
                            COUNT(*)                               AS sample_size
                        FROM {tbl}
                        WHERE roas IS NOT NULL
                          AND roas BETWEEN 0.5 AND 30
                    """
                }).execute()
                rows = r2.data or []
                if rows and rows[0].get("avg_roas"):
                    row = rows[0]
                    fb = FALLBACK.get(category, FALLBACK["기타"])
                    return {
                        "category":      category,
                        "avg_roas":      float(row["avg_roas"]),
                        "avg_margin_pct": float(row.get("avg_margin_pct") or fb["avg_margin_pct"]),
                        "top_channel":   fb["top_channel"],
                        "sample_size":   int(row.get("sample_size") or 0),
                        "source":        f"maesil-insight:{tbl}",
                    }
            except Exception as inner_e:
                logger.debug("[insight_benchmark] %s 조회 실패: %s", tbl, inner_e)
                continue

    except Exception as e:
        logger.warning("[insight_benchmark] maesil-insight 연결 실패: %s", e)

    # fallback
    fb = FALLBACK.get(category, FALLBACK["기타"])
    return {"category": category, "source": "benchmark", **fb}
