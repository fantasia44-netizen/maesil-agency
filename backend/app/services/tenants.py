"""tenants — 워크스페이스 조회 헬퍼.

Phase 2: 스케줄러가 기본(internal) 테넌트 1개로 단일 동작.
Phase 5: list_active_outreach_tenants()로 활성 테넌트 순회.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def get_default_tenant_id() -> str | None:
    """가장 먼저 생성된(기본) 테넌트 id. 스케줄러 단일-테넌트 동작용."""
    try:
        resp = _db().table("tenants").select("id").order("created_at").limit(1).execute()
        rows = resp.data or []
        return rows[0]["id"] if rows else None
    except Exception as e:
        logger.warning("get_default_tenant_id 실패: %s", e)
        return None


def list_active_outreach_tenants() -> list[dict]:
    """status=active 인 테넌트 목록 (Phase 5 멀티테넌트 스케줄러용)."""
    try:
        resp = (
            _db().table("tenants")
            .select("id, name, plan, status")
            .eq("status", "active")
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning("list_active_outreach_tenants 실패: %s", e)
        return []
