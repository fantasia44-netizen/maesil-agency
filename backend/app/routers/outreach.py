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


# ── YouTube 리드 관리 ────────────────────────────────────────────────

@router.get("/leads")
def list_leads(
    status: str | None = None,
    min_score: int = 0,
    limit: int = 50,
    offset: int = 0,
    user: UserContext = Depends(require_admin),
) -> list[dict]:
    """YouTube 리드 목록 조회."""
    q = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("outreach_leads")
        .select(
            "id, channel_id, channel_title, channel_url, subscriber_count, "
            "contact_email, naver_cafe_url, best_video_id, best_video_title, "
            "best_video_views, content_summary, score, status, emailed_at, created_at, updated_at"
        )
        .gte("score", min_score)
        .order("score", desc=True)
        .range(offset, offset + limit - 1)
    )
    if status:
        q = q.eq("status", status)
    resp = q.execute()
    return resp.data or []


@router.get("/leads/{lead_id}")
def get_lead(
    lead_id: str,
    user: UserContext = Depends(require_admin),
) -> dict:
    """특정 리드 상세 조회."""
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("outreach_leads")
        .select("*")
        .eq("id", lead_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="리드를 찾을 수 없습니다.")
    return rows[0]


@router.post("/leads/{lead_id}/send")
def send_lead_email(
    lead_id: str,
    user: UserContext = Depends(require_admin),
) -> dict:
    """특정 리드에게 파트너십 이메일 발송."""
    from app.services.outreach_mailer import send_single
    result = send_single(lead_id)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "발송 실패"))
    return {"ok": True, "message": "이메일 발송 완료"}


@router.patch("/leads/{lead_id}/status")
def update_lead_status(
    lead_id: str,
    body: dict,
    user: UserContext = Depends(require_admin),
) -> dict:
    """리드 상태 업데이트 (new / emailed / replied / rejected)."""
    from datetime import datetime, timezone
    allowed = {"new", "emailed", "replied", "rejected"}
    status = body.get("status", "")
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"status는 {sorted(allowed)} 중 하나")

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("outreach_leads")
        .update({"status": status, "updated_at": now})
        .eq("id", lead_id)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="리드를 찾을 수 없습니다.")
    return rows[0]


@router.post("/scan")
def trigger_scan(
    user: UserContext = Depends(require_admin),
) -> dict:
    """YouTube 스캔 수동 트리거 (백그라운드 실행)."""
    import threading
    from app.services.youtube_scanner import run_daily_scan

    def _run():
        try:
            result = run_daily_scan()
            logger.info("[manual-scan] 완료: %s", result)
        except Exception as e:
            logger.error("[manual-scan] 실패: %s", e)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return {"ok": True, "message": "YouTube 스캔 시작됨 (백그라운드 실행)"}


@router.get("/scan/stats")
def scan_stats(
    user: UserContext = Depends(require_admin),
) -> dict:
    """스캔 통계: 총 리드 수, 상태별 집계, 스캔된 영상 수."""
    db = get_maesil_total_client().schema("agent_work")

    try:
        leads_resp = db.table("outreach_leads").select("status", count="exact").execute()
        total_leads = leads_resp.count or len(leads_resp.data or [])
    except Exception:
        total_leads = 0

    try:
        videos_resp = (
            db.table("outreach_scanned_videos")
            .select("video_id", count="exact")
            .execute()
        )
        total_scanned = videos_resp.count or 0
    except Exception:
        total_scanned = 0

    status_counts: dict[str, int] = {}
    for row in (leads_resp.data or []):
        s = row.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "total_leads": total_leads,
        "total_scanned_videos": total_scanned,
        "by_status": status_counts,
    }
