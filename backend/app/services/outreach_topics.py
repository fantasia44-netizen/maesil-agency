"""outreach_topics — 아웃리치 '주제(브랜드)' 레지스트리.

검색·수집을 주제별로 완전히 분리하기 위한 단일 진실 원천(SSOT).
각 주제(campaign)는 고유한 브랜드·목적·플랫폼별 검색 키워드를 갖는다.

- partner   : 매실인사이트 파트너 유입(광고 절감 도구를 추천해줄 셀러 교육/커뮤니티 채널)
- interview : 매실K 인지도 — 대표가 게스트로 출연할 인터뷰/대담/창업스토리 채널

주제 추가는 아래 TOPIC_REGISTRY에 한 항목만 넣으면 됨(스캔·목록·검증은 campaign
문자열로 이미 분리되어 동작). 나중에 DB+UI 관리형으로 옮길 때도 이 구조를 그대로
테이블로 승격하면 된다.
"""
from __future__ import annotations

# 네이버 인터뷰 전용(모듈 기본은 파트너 성격이라 분리)
_INTERVIEW_NAVER = [
    "셀러 인터뷰", "온라인 창업 스토리", "쇼핑몰 창업 스토리",
    "사장님 인터뷰", "창업가 인터뷰", "월매출 인터뷰",
]


def _partner_youtube():
    from app.services.scanners.youtube_scanner import KEYWORDS
    return KEYWORDS


def _interview_youtube():
    from app.services.scanners.youtube_scanner import INTERVIEW_KEYWORDS
    return INTERVIEW_KEYWORDS


# 주제 레지스트리 — key = campaign 문자열
TOPIC_REGISTRY: dict[str, dict] = {
    "partner": {
        "label": "인사이트 파트너 유입",
        "brand": "매실인사이트",
        # None => 스캐너 모듈 기본 키워드 사용(파트너 성격)
        "youtube": _partner_youtube,
        "naver": None,
    },
    "interview": {
        "label": "매실K 인터뷰/출연 채널",
        "brand": "매실K",
        "youtube": _interview_youtube,
        "naver": _INTERVIEW_NAVER,
    },
}

DEFAULT_TOPIC = "partner"


def known_topics() -> list[dict]:
    """UI 표시용 주제 메타 목록."""
    return [{"campaign": k, "label": v["label"], "brand": v["brand"]}
            for k, v in TOPIC_REGISTRY.items()]


def resolve_keywords(cfg, campaign: str, platform: str) -> list[str] | None:
    """주제·플랫폼에 맞는 검색 키워드 반환.

    우선순위: 테넌트 오버라이드(cfg.keywords_<campaign>_<platform>)
      → 레거시 파트너 오버라이드(cfg.keywords_<platform>, partner만)
      → 주제 레지스트리 기본값
      → None(스캐너 모듈 기본값 사용).
    """
    topic = TOPIC_REGISTRY.get(campaign) or TOPIC_REGISTRY[DEFAULT_TOPIC]

    # 1) 주제 전용 테넌트 오버라이드
    override = getattr(cfg, f"keywords_{campaign}_{platform}", None)
    if override:
        return override

    # 2) 레거시 오버라이드는 partner에만 적용(기존 동작 보존)
    if campaign == "partner":
        legacy = getattr(cfg, f"keywords_{platform}", None) \
            or getattr(cfg, "keywords_youtube" if platform == "youtube" else "keywords_naver", None)
        if legacy:
            return legacy

    # 3) 레지스트리 기본값(콜러블이면 지연 로딩)
    base = topic.get(platform)
    return base() if callable(base) else base
