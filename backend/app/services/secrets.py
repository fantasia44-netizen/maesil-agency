"""
Secrets store — agent_work.secrets 테이블 래퍼.
Phase 1: 평문 저장. Phase 2에서 암호화 레이어 추가 예정.
"""
from datetime import datetime, timezone
from typing import Optional

from app.db.autotool_client import get_autotool_client

TABLE = "secrets"
SCHEMA = "agent_work"


def _table():
    return get_autotool_client().schema(SCHEMA).table(TABLE)


def get_secret(name: str) -> Optional[str]:
    resp = _table().select("value").eq("name", name).limit(1).execute()
    rows = resp.data or []
    if not rows:
        return None
    _touch_last_used(name)
    return rows[0]["value"]


def upsert_secret(name: str, value: str, kind: str, notes: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    _table().upsert(
        {
            "name": name,
            "value": value,
            "kind": kind,
            "notes": notes,
            "updated_at": now,
        },
        on_conflict="name",
    ).execute()


def mark_tested(name: str, ok: bool, error: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    _table().update(
        {
            "last_tested_at": now,
            "last_test_ok": ok,
            "last_test_error": error,
        }
    ).eq("name", name).execute()


def list_secrets_masked() -> list[dict]:
    """UI용: value는 반환하지 않고 마스킹된 메타만."""
    resp = _table().select(
        "id, name, kind, key_version, last_used_at, last_tested_at, last_test_ok, notes, created_at, updated_at"
    ).order("name").execute()
    return resp.data or []


def _touch_last_used(name: str) -> None:
    try:
        now = datetime.now(timezone.utc).isoformat()
        _table().update({"last_used_at": now}).eq("name", name).execute()
    except Exception:
        # 사용 기록 실패가 비즈니스 로직을 깨지 않도록 swallow
        pass
