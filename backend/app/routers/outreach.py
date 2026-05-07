"""영업(Outreach) 에이전트 결과 조회 API.

저장된 타겟 리스트 / 제안서 초안을 대시보드에서 열람·다운로드할 수 있도록 제공.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse

from app.auth import UserContext, require_admin
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outreach", tags=["outreach"])


# ── 스냅샷 목록 / 상세 ─────────────────────────────────────────────

@router.get("/snapshots")
def list_snapshots(
    user: UserContext = Depends(require_admin),
) -> list[dict]:
    """영업 에이전트가 저장한 타겟 리스트 & 제안서 목록 (최근 50건)."""
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
    user: UserContext = Depends(require_admin),
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


# ── HTML 제안서 렌더링 (브라우저 인쇄 → PDF) ──────────────────────

@router.get("/snapshots/{snapshot_id}/html", response_class=HTMLResponse)
def get_proposal_html(
    snapshot_id: str,
    user: UserContext = Depends(require_admin),
) -> HTMLResponse:
    """
    제안서 스냅샷을 인쇄 가능한 HTML 페이지로 반환.
    (서버 사이드 렌더링 — 프론트엔드는 클라이언트 사이드 방식을 기본으로 사용)
    """
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("snapshots")
        .select("id, kind, payload, created_at")
        .eq("id", snapshot_id)
        .eq("kind", "proposal_draft")
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        return HTMLResponse("<h1>404 Not Found</h1>", status_code=404)

    from app.services.proposal_renderer import render_proposal_html
    html = render_proposal_html(rows[0])
    return HTMLResponse(content=html, media_type="text/html; charset=utf-8")


# ── maesil-studio 제안서 전송 ────────────────────────────────

@router.post("/snapshots/{snapshot_id}/send-to-studio")
def send_to_studio(
    snapshot_id: str,
    user: UserContext = Depends(require_admin),
) -> dict:
    """
    제안서 데이터를 maesil-studio 제안서 생성 API로 전송.

    studio 엔드포인트가 구성되어 있으면 실제 전송,
    미구성이면 studio-ready payload를 반환 (개발 중 상태).
    """
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("snapshots")
        .select("id, kind, payload, created_at")
        .eq("id", snapshot_id)
        .eq("kind", "proposal_draft")
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="제안서 스냅샷을 찾을 수 없습니다.")

    snapshot = rows[0]
    raw_payload = snapshot.get("payload") or {}
    # Supabase가 JSONB를 문자열로 반환하는 경우 대비
    if isinstance(raw_payload, str):
        import json as _json
        try:
            raw_payload = _json.loads(raw_payload)
        except Exception:
            raw_payload = {}
    payload: dict = raw_payload

    # studio-ready 패키지 구성
    studio_payload = {
        "content_type":  "proposal",
        "brand":         "maesil",
        "title":         f"{payload.get('mall_name', '스토어')} 제안서",
        "store_info": {
            "mall_name":    payload.get("mall_name"),
            "store_url":    payload.get("store_url"),
            "product_area": payload.get("product_area"),
        },
        "proposal_text": payload.get("proposal", ""),
        "sections":      payload.get("sections") or {},
        "benchmark":     payload.get("benchmark") or {},
        "source_snapshot_id": snapshot_id,
    }

    # studio API URL 확인
    try:
        studio_url = _get_studio_url()
    except Exception:
        studio_url = None

    if not studio_url:
        return {
            "status":        "pending",
            "message":       "maesil-studio 제안서 기능이 아직 연동되지 않았습니다. 준비된 페이로드를 반환합니다.",
            "studio_payload": studio_payload,
        }

    # 실제 studio API 호출
    try:
        import httpx
        r = httpx.post(
            f"{studio_url}/api/proposals/create",
            json=studio_payload,
            timeout=30,
            headers={"Content-Type": "application/json"},
        )
        r.raise_for_status()
        result = r.json()
        return {
            "status":       "sent",
            "studio_url":   studio_url,
            "studio_result": result,
        }
    except Exception as e:
        logger.warning("[send-to-studio] studio API 호출 실패: %s", e)
        return {
            "status":        "error",
            "message":       f"studio API 오류: {e}",
            "studio_payload": studio_payload,
        }


def _get_studio_url() -> str | None:
    """secrets 테이블에서 maesil-studio URL 조회."""
    r = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("secrets")
        .select("value")
        .eq("name", "maesil_studio_url")
        .limit(1)
        .execute()
    )
    rows = r.data or []
    return rows[0]["value"] if rows else None
