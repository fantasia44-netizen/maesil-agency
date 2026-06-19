"""tenant_config — 테넌트별 영업 설정 로더 (전역 settings.outreach_* 대체).

load_config(tenant_id) → TenantOutreachConfig. 60s 캐시.
DB 행이 없으면 app.config.settings 기본값으로 채움(기존 동작과 동일).
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from datetime import timedelta, timezone, tzinfo

import logging

logger = logging.getLogger(__name__)

_CACHE_TTL = 60
_cache: dict[str, tuple["TenantOutreachConfig", float]] = {}
_lock = threading.Lock()


def _tzinfo(name: str) -> tzinfo:
    """이름→tzinfo. Windows 등 tzdata 없을 때 KST로 폴백."""
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(name)
    except Exception:
        return timezone(timedelta(hours=9))  # Asia/Seoul fallback


@dataclass
class TenantOutreachConfig:
    tenant_id: str
    cold_drip_enabled: bool
    daily_cap: int
    drip_grades: str
    send_start_hour: int
    send_end_hour: int
    timezone: str
    quiet_hours: bool
    ad_prefix: bool
    kakao_url: str
    sender_info: str
    influencer_subject: str
    agency_subject: str
    unsubscribe_base_url: str
    keywords_youtube: list[str] | None = None
    keywords_naver: list[str] | None = None

    @property
    def tz(self) -> tzinfo:
        return _tzinfo(self.timezone)

    @property
    def grade_list(self) -> list[str]:
        return [g.strip() for g in (self.drip_grades or "").split(",") if g.strip()]


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _defaults(tenant_id: str, row: dict | None) -> TenantOutreachConfig:
    """DB 행(있으면) + app.config 기본값 병합."""
    from app.config import settings
    r = row or {}

    def g(key, default):
        v = r.get(key)
        return v if v is not None else default

    return TenantOutreachConfig(
        tenant_id=tenant_id,
        cold_drip_enabled=bool(g("cold_drip_enabled", settings.outreach_cold_drip_enabled)),
        daily_cap=int(g("daily_cap", settings.outreach_daily_cap)),
        drip_grades=g("drip_grades", settings.outreach_drip_grades),
        send_start_hour=int(g("send_start_hour", settings.outreach_send_start_hour)),
        send_end_hour=int(g("send_end_hour", settings.outreach_send_end_hour)),
        timezone=g("timezone", "Asia/Seoul"),
        quiet_hours=bool(g("quiet_hours", settings.outreach_quiet_hours)),
        ad_prefix=bool(g("ad_prefix", settings.outreach_ad_prefix)),
        kakao_url=g("kakao_url", settings.outreach_kakao_url),
        sender_info=g("sender_info", settings.outreach_sender_info),
        influencer_subject=g("influencer_subject", settings.outreach_influencer_subject),
        agency_subject=g("agency_subject", settings.outreach_agency_subject),
        unsubscribe_base_url=g("unsubscribe_base_url", settings.unsubscribe_base_url),
        keywords_youtube=r.get("keywords_youtube") or None,
        keywords_naver=r.get("keywords_naver") or None,
    )


def load_config(tenant_id: str) -> TenantOutreachConfig:
    now = time.monotonic()
    with _lock:
        ent = _cache.get(tenant_id)
        if ent and now < ent[1]:
            return ent[0]
    row = None
    try:
        resp = _db().table("tenant_outreach_config").select("*").eq("tenant_id", tenant_id).limit(1).execute()
        rows = resp.data or []
        row = rows[0] if rows else None
    except Exception as e:
        logger.warning("tenant_config 조회 실패 [%s]: %s — 기본값 사용", tenant_id, e)
    cfg = _defaults(tenant_id, row)
    with _lock:
        _cache[tenant_id] = (cfg, now + _CACHE_TTL)
    return cfg


def invalidate(tenant_id: str | None = None) -> None:
    with _lock:
        if tenant_id is None:
            _cache.clear()
        else:
            _cache.pop(tenant_id, None)


def save_config(tenant_id: str, patch: dict) -> None:
    """설정 일부 업데이트(upsert) + 캐시 무효화."""
    from datetime import datetime
    allowed = {
        "cold_drip_enabled", "daily_cap", "drip_grades", "send_start_hour", "send_end_hour",
        "timezone", "quiet_hours", "ad_prefix", "kakao_url", "sender_info",
        "influencer_subject", "agency_subject", "unsubscribe_base_url",
        "keywords_youtube", "keywords_naver", "gmail_connected",
    }
    upd = {k: v for k, v in patch.items() if k in allowed}
    if not upd:
        return
    upd["tenant_id"] = tenant_id
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    _db().table("tenant_outreach_config").upsert(upd, on_conflict="tenant_id").execute()
    invalidate(tenant_id)
