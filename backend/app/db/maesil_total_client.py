"""
Maesil-Total Supabase 클라이언트.
Phase 1: agent_work 스키마 전용 읽기/쓰기.

HTTP/2 idle 연결 끊김 문제로 싱글턴 불가 → 요청마다 새 클라이언트 생성.
자격증명(URL/Key)은 프로세스 시작 시 1회만 읽어 캐시.
"""
import logging
import os

from supabase import Client, ClientOptions, create_client

logger = logging.getLogger(__name__)

# 쿼리 타임아웃 (초) — 이 시간 내 응답 없으면 Exception 발생
_QUERY_TIMEOUT = 10

# 자격증명: 프로세스 시작 시 1회 읽기
def _read_credentials() -> tuple[str, str]:
    url = (
        os.environ.get("MAESIL_TOTAL_SUPABASE_URL", "").strip()
        or os.environ.get("AUTOTOOL_SUPABASE_URL", "").strip()
    )
    key = (
        os.environ.get("MAESIL_TOTAL_SERVICE_ROLE_KEY", "").strip()
        or os.environ.get("AUTOTOOL_SERVICE_ROLE_KEY", "").strip()
    )
    if not url:
        candidates = sorted(k for k in os.environ if any(t in k for t in ("SUPABASE", "AUTOTOOL", "MAESIL")))
        raise RuntimeError(
            f"MAESIL_TOTAL_SUPABASE_URL 환경변수 없음. 관련 키: {candidates}"
        )
    logger.info("[db] credentials loaded: url=%.40s…", url)
    return url, key


_SUPABASE_URL, _SUPABASE_KEY = _read_credentials()


def get_maesil_total_client() -> Client:
    """매 호출마다 새 클라이언트 반환 (HTTP/2 stale connection 방지).
    postgrest_client_timeout: 쿼리 10초 내 응답 없으면 타임아웃.
    """
    options = ClientOptions(postgrest_client_timeout=_QUERY_TIMEOUT)
    return create_client(_SUPABASE_URL, _SUPABASE_KEY, options=options)


# ── maesil-hub (GBL 전용 DB) ────────────────────────────────────────────
# GBL 트래픽(기록·메타집계)을 사업 DB(maesil-total)에서 분리하기 위한 별도 프로젝트.
# 미설정 시 maesil-total로 폴백 → env 설정 전까지 무중단 전환.
_HUB_URL = os.environ.get("MAESIL_HUB_SUPABASE_URL", "").strip()
_HUB_KEY = os.environ.get("MAESIL_HUB_SERVICE_ROLE_KEY", "").strip()
if _HUB_URL and _HUB_KEY:
    logger.info("[db] maesil-hub 사용: url=%.40s…", _HUB_URL)
else:
    logger.info("[db] maesil-hub 미설정 → maesil-total 폴백")


def hub_configured() -> bool:
    return bool(_HUB_URL and _HUB_KEY)


def get_maesil_hub_client() -> Client:
    """GBL 데이터용 클라이언트. hub env 있으면 hub, 없으면 maesil-total 폴백."""
    if _HUB_URL and _HUB_KEY:
        options = ClientOptions(postgrest_client_timeout=_QUERY_TIMEOUT)
        return create_client(_HUB_URL, _HUB_KEY, options=options)
    return get_maesil_total_client()
