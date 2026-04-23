"""
DB 레지스트리 기반 동적 Supabase 클라이언트 팩토리.
db_registry + secrets 테이블에서 URL/키를 읽어 클라이언트를 생성한다.
"""
from functools import lru_cache

from supabase import Client, create_client

from app.db.autotool_client import get_autotool_client


def get_db_client(db_name: str) -> Client:
    """db_registry에 등록된 DB에 대한 Supabase 클라이언트 반환."""
    autotool = get_autotool_client()

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

    # secrets에서 API 키 조회
    key = None
    if key_ref:
        sec = (
            autotool.schema("agent_work")
            .table("secrets")
            .select("value")
            .eq("name", key_ref)
            .limit(1)
            .execute()
        )
        sec_rows = sec.data or []
        if sec_rows:
            key = sec_rows[0]["value"]

    if not key:
        raise ValueError(f"No API key found for DB '{db_name}' (key_ref={key_ref})")

    return create_client(url, key)


def get_operator_id(db_name: str) -> str | None:
    """secrets에서 operator_id 조회 (예: 'autotool_operator_id')."""
    autotool = get_autotool_client()
    name = f"{db_name}_operator_id"
    sec = (
        autotool.schema("agent_work")
        .table("secrets")
        .select("value")
        .eq("name", name)
        .limit(1)
        .execute()
    )
    rows = sec.data or []
    return rows[0]["value"] if rows else None
