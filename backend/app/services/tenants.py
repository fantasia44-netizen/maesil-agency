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
    """영업 스케줄러 대상 테넌트 — status=active 이고, 트라이얼이 만료되지 않은 것만.

    (plan=trial 인데 trial_ends_at 가 지났으면 제외 → 14일 무료가 실제로 종료됨.
     internal/유료 플랜은 만료 무관.)
    """
    from datetime import datetime, timezone
    try:
        resp = (
            _db().table("tenants")
            .select("id, name, plan, status, trial_ends_at")
            .eq("status", "active")
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        logger.warning("list_active_outreach_tenants 실패: %s", e)
        return []

    now_iso = datetime.now(timezone.utc).isoformat()
    out = []
    for t in rows:
        if t.get("plan") == "trial" and t.get("trial_ends_at") and t["trial_ends_at"] < now_iso:
            continue  # 만료된 트라이얼 — 영업 정지
        out.append(t)
    return out
