"""
Secrets store — agent_work.secrets 테이블 래퍼.

봉투암호화(Fernet): SECRETS_ENC_KEY 환경변수가 설정되면 저장 시 자동 암호화,
조회 시 자동 복호화. 키 미설정 시 평문 저장으로 폴백(기존 호환).
기존 평문 row 는 그대로 읽히며, 다시 저장(/settings에서 재입력)하면 암호화됩니다.
"""
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)

TABLE = "secrets"
SCHEMA = "agent_work"

# ── 봉투암호화 (Fernet) ───────────────────────────────────────────
_ENC_PREFIX = "enc:v1:"
_fernet = None
_fernet_init = False
_fernet_lock = threading.Lock()
_warned_plaintext = False


def _get_fernet():
    """SECRETS_ENC_KEY 로 Fernet 인스턴스 생성(1회 캐시). 키 없으면 None."""
    global _fernet, _fernet_init
    if _fernet_init:
        return _fernet
    with _fernet_lock:
        if _fernet_init:
            return _fernet
        key = (settings.secrets_enc_key or "").strip()
        if key:
            try:
                from cryptography.fernet import Fernet
                _fernet = Fernet(key.encode())
            except Exception as e:
                logger.error("SECRETS_ENC_KEY 로 Fernet 초기화 실패 — 평문 폴백: %s", e)
                _fernet = None
        _fernet_init = True
        return _fernet


def _encrypt(value: str) -> str:
    """저장용 암호화. 키 없으면 평문 그대로(경고 1회)."""
    global _warned_plaintext
    f = _get_fernet()
    if f is None:
        if not _warned_plaintext:
            logger.warning("SECRETS_ENC_KEY 미설정 — 시크릿이 평문으로 저장됩니다.")
            _warned_plaintext = True
        return value
    return _ENC_PREFIX + f.encrypt(value.encode()).decode()


def _decrypt(stored: Optional[str]) -> Optional[str]:
    """조회용 복호화. enc 접두사 없으면 레거시 평문으로 간주해 그대로 반환."""
    if stored is None:
        return None
    if not stored.startswith(_ENC_PREFIX):
        return stored  # 레거시 평문
    f = _get_fernet()
    if f is None:
        logger.error("암호화된 시크릿이 있으나 SECRETS_ENC_KEY 가 없어 복호화 불가.")
        return None
    try:
        return f.decrypt(stored[len(_ENC_PREFIX):].encode()).decode()
    except Exception as e:
        logger.error("시크릿 복호화 실패: %s", e)
        return None

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
    """전역 시크릿 조회 (tenant_id IS NULL). 인프라/공용 키용 — 시그니처 불변."""
    hit, cached = _cache_get(name)
    if hit:
        return cached
    resp = _table().select("value").is_("tenant_id", "null").eq("name", name).limit(1).execute()
    rows = resp.data or []
    raw = rows[0]["value"] if rows else None
    value = _decrypt(raw)
    _cache_set(name, value)
    if value is not None:
        _touch_last_used(name)
    return value


def get_tenant_secret(tenant_id: str | None, name: str) -> Optional[str]:
    """테넌트 시크릿 조회 — (tenant_id, name) 우선, 없으면 전역(get_secret) fallback.

    tenant_id 가 None 이면 전역과 동일. outreach 발송 경로(Gmail/플랫폼키)에서 사용.
    """
    if not tenant_id:
        return get_secret(name)
    key = f"t:{tenant_id}:{name}"
    hit, cached = _cache_get(key)
    if hit:
        return cached
    try:
        resp = _table().select("value").eq("tenant_id", tenant_id).eq("name", name).limit(1).execute()
        rows = resp.data or []
    except Exception:
        rows = []
    if rows:
        value = _decrypt(rows[0]["value"])
    else:
        value = get_secret(name)  # 전역 fallback (자체 캐시)
    _cache_set(key, value)
    return value


def _manual_upsert(tenant_id: str | None, name: str, value: str, kind: str, notes: str | None) -> None:
    """on_conflict 회피(전역은 partial unique, 값 NULL 비교 이슈) — 존재 확인 후 update/insert."""
    now = datetime.now(timezone.utc).isoformat()
    enc = _encrypt(value)
    t = _table()
    q = t.select("name").eq("name", name)
    q = q.is_("tenant_id", "null") if tenant_id is None else q.eq("tenant_id", tenant_id)
    exists = bool((q.limit(1).execute().data) or [])
    payload = {"value": enc, "kind": kind, "notes": notes, "updated_at": now}
    if exists:
        u = _table().update(payload).eq("name", name)
        u = u.is_("tenant_id", "null") if tenant_id is None else u.eq("tenant_id", tenant_id)
        u.execute()
    else:
        _table().insert({"tenant_id": tenant_id, "name": name, **payload}).execute()


def upsert_secret(name: str, value: str, kind: str, notes: str | None = None) -> None:
    """전역 시크릿 저장 (tenant_id NULL). 시그니처 불변."""
    _manual_upsert(None, name, value, kind, notes)
    invalidate_cache(name)


def upsert_tenant_secret(tenant_id: str, name: str, value: str, kind: str,
                         notes: str | None = None) -> None:
    """테넌트 시크릿 저장."""
    _manual_upsert(tenant_id, name, value, kind, notes)
    invalidate_cache(f"t:{tenant_id}:{name}")


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
