"""
Autotool Supabase 클라이언트 (부트스트랩 접속).
Phase 1: 단일 클라이언트 — agent_work 스키마 전용 읽기/쓰기.
Phase 2+: 다중 DB 클라이언트는 db_registry 기반 팩토리로 확장.
"""
from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_autotool_client() -> Client:
    return create_client(
        settings.autotool_supabase_url,
        settings.autotool_service_role_key,
    )
