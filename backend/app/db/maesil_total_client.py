"""
Maesil-Total Supabase 클라이언트 (부트스트랩 접속).
Phase 1: 단일 클라이언트 — agent_work 스키마 전용 읽기/쓰기.
Phase 2+: 다중 DB 클라이언트는 db_registry 기반 팩토리로 확장.

os.environ 직접 읽기: pydantic-settings alias 문제 우회.
신규(MAESIL_TOTAL_*) → 구(AUTOTOOL_*) 순서로 폴백.
"""
import logging
import os

from supabase import Client, create_client

logger = logging.getLogger(__name__)

# 모듈 레벨 싱글턴 (lru_cache 대신)
_client: Client | None = None


def get_maesil_total_client() -> Client:
    global _client
    if _client is not None:
        return _client

    # URL: 신규 이름 → 구 이름 순서
    url_key, url = "", ""
    for k in ("MAESIL_TOTAL_SUPABASE_URL", "AUTOTOOL_SUPABASE_URL"):
        v = os.environ.get(k, "").strip()
        if v:
            url_key, url = k, v
            break

    # Service Role Key: 신규 이름 → 구 이름 순서
    svc_key = (
        os.environ.get("MAESIL_TOTAL_SERVICE_ROLE_KEY", "").strip()
        or os.environ.get("AUTOTOOL_SERVICE_ROLE_KEY", "").strip()
    )

    if not url:
        # 디버그용: 환경변수 이름 목록 (값 제외)
        candidates = sorted(
            k for k in os.environ
            if any(t in k for t in ("SUPABASE", "AUTOTOOL", "MAESIL"))
        )
        raise RuntimeError(
            f"Supabase URL 환경변수를 찾을 수 없습니다. "
            f"(MAESIL_TOTAL_SUPABASE_URL 또는 AUTOTOOL_SUPABASE_URL 필요) "
            f"현재 관련 환경변수 키: {candidates}"
        )

    logger.info("[db] Supabase client init: key=%s url=%.40s…", url_key, url)
    _client = create_client(url, svc_key)
    return _client
