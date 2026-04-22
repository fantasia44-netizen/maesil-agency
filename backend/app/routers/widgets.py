"""
위젯 엔드포인트 (LLM 비의존).
Phase 1 Day 1: system-status 스텁 — program_health 최근값을 반환.
Phase 1 Day 2~3: 실제 Render/Supabase API 호출해서 program_health 갱신하는 스케줄러 추가.
"""
from fastapi import APIRouter, Depends

from app.db.autotool_client import get_autotool_client
from app.auth import require_bearer

router = APIRouter(prefix="/api/widgets", tags=["widgets"], dependencies=[Depends(require_bearer)])


@router.get("/system-status")
def system_status() -> dict:
    client = get_autotool_client()

    # 등록된 프로그램 전체
    progs = (
        client.schema("agent_work")
        .table("program_registry")
        .select("name, display_name, host_provider, is_active")
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    programs = progs.data or []

    # 각 프로그램별 최신 헬스 1건
    cards = []
    for p in programs:
        hp = (
            client.schema("agent_work")
            .table("program_health")
            .select("server_status, db_status, response_time_ms, error_count_1h, traffic_1h, checked_at")
            .eq("program_name", p["name"])
            .order("checked_at", desc=True)
            .limit(1)
            .execute()
        )
        latest = (hp.data or [None])[0]
        cards.append(
            {
                "name": p["name"],
                "display_name": p.get("display_name") or p["name"],
                "host_provider": p.get("host_provider"),
                "health": latest,  # None이면 "아직 수집 전"
            }
        )

    return {"programs": cards}
