"""영업(Outreach) 에이전트 결과 조회 API.

저장된 타겟 리스트 / 제안서 초안을 대시보드에서 열람·다운로드할 수 있도록 제공.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, get_current_user
from app.db.maesil_total_client import get_maesil_total_client

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


@router.get("/snapshots")
def list_snapshots(
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    """영업 에이전트가 저장한 타겟 리스트 & 제안서 목록 (최근 50건, 유효기간 내)."""
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .in_("kind", ["outreach_targets", "proposal_draft"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return resp.data or []


@router.get("/snapshots/{snapshot_id}")
def get_snapshot(
    snapshot_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """특정 스냅샷 상세 조회."""
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .eq("id", snapshot_id)
        .in_("kind", ["outreach_targets", "proposal_draft"])
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="스냅샷을 찾을 수 없습니다.")
    return rows[0]
