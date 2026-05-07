"""
Secrets store — agent_work.secrets 테이블 래퍼.
Phase 1: 평문 저장. Phase 2에서 암호화 레이어 추가 예정.
"""
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from app.db.maesil_total_client import get_maesil_total_client

TABLE = "secrets"
SCHEMA = "agent_work"

# ── 인메모리 캐시 (프로세스 내 60초 TTL) ───────────────────────────
_cache: dict[str, tuple[Optional[str], float]] = {}  # name → (value, expire_at)
_cache_lock = threading.Lock()
_CACHE_TTL = 60  # seconds


def _cache_get(name: str) -> tuple[bool, Optional[str]]:
    with _cache_lock:
        entry = _cache.get(name)
        if entry and time.monotonic() < entry[1]:
            return True, entry[0]
        return False, None


def _cache_set(name: str, value: Optional[str]) -> None:
    with _cache_lock:
        _cache[name] = (value, time.monotonic() + _CACHE_TTL)


def invalidate_cache(name: str | None = None) -> None:
    """캐시 무효화. name=None이면 전체 초기화 (시크릿 저장 시 호출)."""
    with _cache_lock:
        if name is None:
            _cache.clear()
        else:
            _cache.pop(name, None)


def _table():
    return get_maesil_total_client().schema(SCHEMA).table(TABLE)


def get_secret(name: str) -> Optional[str]:
    hit, cached = _cache_get(name)
    if hit:
        return cached
    resp = _table().select("value").eq("name", name).limit(1).execute()
    rows = resp.data or []
    value = rows[0]["value"] if rows else None
    _cache_set(name, value)
    if value is not None:
        _touch_last_used(name)
    return value


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
    invalidate_cache(name)  # 저장 즉시 캐시 무효화


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


_touch_throttle: dict[str, float] = {}  # name → last_touch_at
_touch_lock = threading.Lock()
_TOUCH_TTL = 300  # 5분에 한 번만 last_used_at 갱신


def _touch_last_used(name: str) -> None:
    now_mono = time.monotonic()
    with _touch_lock:
        if now_mono - _touch_throttle.get(name, 0) < _TOUCH_TTL:
            return  # 최근에 이미 갱신함 → 스킵
        _touch_throttle[name] = now_mono
    try:
        now = datetime.now(timezone.utc).isoformat()
        _table().update({"last_used_at": now}).eq("name", name).execute()
    except Exception:
        # 사용 기록 실패가 비즈니스 로직을 깨지 않도록 swallow
        pass
