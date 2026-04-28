"""
program_health — 주기적 헬스 체크 → program_health 테이블 기록.

폴링 흐름:
  1) program_registry에서 active 프로그램 목록
  2) health_url ping → response_time_ms, server_status
  3) Render API → 서비스 배포 상태
  4) alert_events에서 최근 1시간 에러 카운트
  5) program_health INSERT
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

import httpx

from app.db.maesil_total_client import get_maesil_total_client
from app.services.secrets import get_secret

logger = logging.getLogger(__name__)
RENDER_API_BASE = "https://api.render.com/v1"


def _client():
    return get_maesil_total_client()


# ─────────────────────────────────────────────────────────────────
# 개별 체크 헬퍼
# ─────────────────────────────────────────────────────────────────

def _ping_health_url(url: str) -> tuple[str, int | None]:
    """GET health_url → (server_status, response_time_ms)."""
    try:
        t0 = time.monotonic()
        r = httpx.get(url, timeout=10, follow_redirects=True)
        ms = int((time.monotonic() - t0) * 1000)
        if r.status_code < 400:
            return "up", ms
        if r.status_code < 500:
            return "degraded", ms
        return "down", ms
    except httpx.TimeoutException:
        return "degraded", None
    except Exception:
        return "down", None


def _check_render_service(service_id: str, api_key: str) -> str:
    """Render /v1/services/{id} → 'up' | 'down' | 'degraded' | 'unknown'."""
    try:
        r = httpx.get(
            f"{RENDER_API_BASE}/services/{service_id}",
            headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            timeout=10,
        )
        if r.status_code != 200:
            return "unknown"
        data = r.json() or {}
        if data.get("suspended") == "suspended":
            return "down"
        # serviceDetails.deploy.status: "live" | "build_failed" | "deactivated" 등
        deploy = (data.get("serviceDetails") or {}).get("deploy") or {}
        ds = (deploy.get("status") or "").lower()
        if ds in ("live", ""):
            return "up"
        if "fail" in ds or "cancel" in ds:
            return "down"
        if ds in ("in_progress", "pending", "created"):
            return "degraded"
        return "up"
    except Exception as e:
        logger.debug("render service check error [%s]: %s", service_id, e)
        return "unknown"


def _count_errors_1h(program_name: str) -> int:
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    try:
        resp = (
            _client()
            .schema("agent_work")
            .table("alert_events")
            .select("id", count="exact")
            .eq("program_name", program_name)
            .in_("severity", ["error", "critical"])
            .gte("created_at", since)
            .execute()
        )
        return resp.count or 0
    except Exception:
        return 0


# ─────────────────────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────────────────────

def check_all() -> dict:
    """모든 active 프로그램 헬스 체크 후 program_health에 기록."""
    api_key = get_secret("render_api")
    now = datetime.now(timezone.utc)

    # active 프로그램 목록
    resp = (
        _client()
        .schema("agent_work")
        .table("program_registry")
        .select("name, host_provider, host_service_id, health_url")
        .eq("is_active", True)
        .execute()
    )
    programs = resp.data or []

    results: list[dict] = []
    for p in programs:
        name       = p["name"]
        health_url = p.get("health_url")
        service_id = p.get("host_service_id")
        provider   = p.get("host_provider")

        # health_url도 service_id도 없으면 스킵
        if not health_url and not service_id:
            continue

        server_status    = "unknown"
        response_time_ms = None

        # 1. health_url ping
        if health_url:
            server_status, response_time_ms = _ping_health_url(health_url)

        # 2. Render API (health_url 결과가 unknown이거나 보완 용도)
        if service_id and provider == "render" and api_key:
            render_status = _check_render_service(service_id, api_key)
            if server_status == "unknown":
                server_status = render_status
            elif render_status == "down":
                server_status = "down"   # Render가 down이면 무조건 down

        # 3. 최근 1시간 에러 카운트 → 5개 이상이면 degraded
        error_count = _count_errors_1h(name)
        if error_count >= 5 and server_status == "up":
            server_status = "degraded"

        try:
            _client().schema("agent_work").table("program_health").insert({
                "program_name":    name,
                "server_status":   server_status,
                "response_time_ms": response_time_ms,
                "error_count_1h":  error_count,
                "checked_at":      now.isoformat(),
            }).execute()
            results.append({"name": name, "status": server_status, "error_count_1h": error_count})
            logger.debug("program_health [%s] → %s (%sms, err1h=%s)", name, server_status, response_time_ms, error_count)
        except Exception as e:
            logger.warning("program_health insert error [%s]: %s", name, e)
            results.append({"name": name, "error": str(e)})

    logger.info("[health] checked %d programs", len(results))
    return {"checked": len(results), "results": results}


__all__ = ["check_all"]
