"""
DB 레지스트리 기반 동적 Supabase 클라이언트 팩토리.
db_registry + secrets 테이블에서 URL/키를 읽어 클라이언트를 생성한다.
"""
from functools import lru_cache

from supabase import Client, create_client

from app.db.maesil_total_client import get_maesil_total_client


def get_db_client(db_name: str) -> Client:
    """db_registry에 등록된 DB에 대한 Supabase 클라이언트 반환."""
    autotool = get_maesil_total_client()

    # db_registry 조회
    reg = (
        autotool.schema("agent_work")
        .table("db_registry")
        .select("supabase_url, api_key_ref")
        .eq("name", db_name)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    rows = reg.data or []
    if not rows:
        raise ValueError(f"DB not found in registry: {db_name}")

    row = rows[0]
    url = row["supabase_url"]
    key_ref = row.get("api_key_ref")

    if not url:
        raise ValueError(f"DB '{db_name}' has no supabase_url configured")

    # secrets에서 API 키 조회 (봉투암호화 복호화 포함)
    key = None
    if key_ref:
        from app.services.secrets import get_secret
        key = get_secret(key_ref)

    if not key:
        raise ValueError(f"No API key found for DB '{db_name}' (key_ref={key_ref})")

    return create_client(url, key)


def get_operator_id(db_name: str) -> str | None:
    """secrets에서 operator_id 조회 (예: 'maesil_total_operator_id')."""
    from app.services.secrets import get_secret
    return get_secret(f"{db_name}_operator_id")
