"""
agent_work 전용 쓰기 도구.
모든 에이전트 쓰기는 agent_work 스키마에만 허용.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db.autotool_client import get_autotool_client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_finding(
    run_id: str,
    agent_type: str,
    kind: str,
    title: str,
    body: str,
    evidence_refs: list | None = None,
    confidence_score: float | None = None,
) -> str:
    """에이전트 판단/근거 저장. finding_id 반환."""
    fid = str(uuid.uuid4())
    get_autotool_client().schema("agent_work").table("findings").insert({
        "id": fid,
        "run_id": run_id,
        "agent_type": agent_type,
        "kind": kind,
        "title": title,
        "body": body,
        "evidence_refs": evidence_refs or [],
        "confidence_score": confidence_score,
        "created_at": _now(),
    }).execute()
    return fid


def create_snapshot(
    run_id: str,
    agent_type: str,
    kind: str,
    payload: dict[str, Any],
    valid_seconds: int = 3600,
) -> str:
    """분석 스냅샷 저장. snapshot_id 반환."""
    sid = str(uuid.uuid4())
    from datetime import timedelta
    valid_until = (datetime.now(timezone.utc) + timedelta(seconds=valid_seconds)).isoformat()
    get_autotool_client().schema("agent_work").table("snapshots").insert({
        "id": sid,
        "agent_type": agent_type,
        "kind": kind,
        "payload": payload,
        "valid_until": valid_until,
        "created_at": _now(),
    }).execute()
    return sid


def create_suggestion(
    run_id: str,
    target_area: str,
    severity: str,
    title: str,
    body: str,
    evidence_refs: list | None = None,
) -> str:
    """개선 제안 저장. suggestion_id 반환."""
    sid = str(uuid.uuid4())
    get_autotool_client().schema("agent_work").table("suggestions").insert({
        "id": sid,
        "run_id": run_id,
        "target_area": target_area,
        "severity": severity,
        "title": title,
        "body": body,
        "evidence_refs": evidence_refs or [],
        "status": "open",
        "created_at": _now(),
    }).execute()
    return sid
