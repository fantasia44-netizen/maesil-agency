"""
위젯 엔드포인트 (LLM 비의존).
Phase 1 Day 1: system-status 스텁 — program_health 최근값을 반환.
Phase 1 Day 2~3: 실제 Render/Supabase API 호출해서 program_health 갱신하는 스케줄러 추가.
"""
from fastapi import APIRouter, Depends

from app.db.autotool_client import get_autotool_client
from app.auth import require_bearer

router = APIRouter(prefix="/api/widgets", tags=["widgets"], dependencies=[Depends(require_bearer)])

# 에이전트 정의 (코드에서 관리, Phase별 확장)
AGENT_REGISTRY = [
    {"agent_type": "orchestrator", "display_name": "오케스트레이터", "phase": 1},
    {"agent_type": "sales",        "display_name": "세일즈 에이전트",  "phase": 2},
    {"agent_type": "finance",      "display_name": "파이낸스 에이전트","phase": 2},
    {"agent_type": "warehouse",    "display_name": "웨어하우스 에이전트","phase": 3},
    {"agent_type": "cs",           "display_name": "CS 에이전트",      "phase": 3},
]


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


@router.get("/agent-status")
def agent_status() -> dict:
    client = get_autotool_client()

    # 에이전트 타입별 마지막 실행 1건씩 조회
    runs_resp = (
        client.schema("agent_work")
        .table("runs")
        .select("agent_type, status, started_at, ended_at, error_reason, cost_usd")
        .order("started_at", desc=True)
        .limit(200)
        .execute()
    )
    runs = runs_resp.data or []

    # 에이전트 타입별 최신 run만 추출
    latest: dict = {}
    for r in runs:
        atype = r["agent_type"]
        if atype not in latest:
            latest[atype] = r

    cards = []
    for agent in AGENT_REGISTRY:
        atype = agent["agent_type"]
        run = latest.get(atype)
        cards.append({
            "agent_type": atype,
            "display_name": agent["display_name"],
            "phase": agent["phase"],
            "status": run["status"] if run else "idle",
            "last_run_at": run["started_at"] if run else None,
            "last_ended_at": run["ended_at"] if run else None,
            "error_reason": run.get("error_reason") if run else None,
            "cost_usd": run.get("cost_usd") if run else None,
        })

    return {"agents": cards}
