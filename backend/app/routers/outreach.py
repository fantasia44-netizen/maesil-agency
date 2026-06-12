"""영업(Outreach) 에이전트 API — 멀티채널 파트너 발굴 + CRM."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.auth import UserContext, require_admin
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outreach", tags=["outreach"])


def _db():
    return get_maesil_total_client().schema("agent_work")


# ── 기존 스냅샷 엔드포인트 (유지) ──────────────────────────────────────

@router.get("/snapshots")
def list_snapshots(user: UserContext = Depends(require_admin)) -> list[dict]:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .in_("kind", ["outreach_targets", "proposal_draft"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return resp.data or []


@router.get("/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: str, user: UserContext = Depends(require_admin)) -> dict:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .eq("id", snapshot_id)
        .in_("kind", ["outreach_targets", "proposal_draft"])
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "스냅샷을 찾을 수 없습니다.")
    return rows[0]


@router.get("/snapshots/{snapshot_id}/html", response_class=HTMLResponse)
def get_proposal_html(snapshot_id: str, user: UserContext = Depends(require_admin)) -> HTMLResponse:
    resp = (
        _db().table("snapshots")
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
    return HTMLResponse(content=render_proposal_html(rows[0]), media_type="text/html; charset=utf-8")


@router.post("/snapshots/{snapshot_id}/send-to-studio")
def send_to_studio(snapshot_id: str, user: UserContext = Depends(require_admin)) -> dict:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at")
        .eq("id", snapshot_id)
        .eq("kind", "proposal_draft")
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "제안서 스냅샷을 찾을 수 없습니다.")
    snapshot = rows[0]
    raw = snapshot.get("payload") or {}
    if isinstance(raw, str):
        import json as _j
        try:
            raw = _j.loads(raw)
        except Exception:
            raw = {}
    studio_payload = {
        "content_type": "proposal", "brand": "maesil",
        "title": f"{raw.get('mall_name','스토어')} 제안서",
        "store_info": {"mall_name": raw.get("mall_name"), "store_url": raw.get("store_url"),
                       "product_area": raw.get("product_area")},
        "proposal_text": raw.get("proposal", ""),
        "sections": raw.get("sections") or {},
        "benchmark": raw.get("benchmark") or {},
        "source_snapshot_id": snapshot_id,
    }
    studio_url = _get_studio_url()
    if not studio_url:
        return {"status": "pending", "studio_payload": studio_payload}
    try:
        import httpx
        r = httpx.post(f"{studio_url}/api/proposals/create", json=studio_payload, timeout=30)
        r.raise_for_status()
        return {"status": "sent", "studio_result": r.json()}
    except Exception as e:
        return {"status": "error", "message": str(e), "studio_payload": studio_payload}


def _get_studio_url() -> str | None:
    r = _db().table("secrets").select("value").eq("name", "maesil_studio_url").limit(1).execute()
    rows = r.data or []
    return rows[0]["value"] if rows else None


# ── YouTube 리드 관리 (v4) ────────────────────────────────────────────

@router.get("/leads")
def list_leads(
    platform: str | None = None,
    status: str | None = None,
    grade: str | None = None,
    channel_type: str | None = None,
    min_score: int = 0,
    limit: int = 50,
    offset: int = 0,
    user: UserContext = Depends(require_admin),
) -> list[dict]:
    """리드 목록 (플랫폼·상태·등급·채널유형 필터)."""
    q = (
        _db().table("outreach_leads")
        .select(
            "id, platform, platform_url, handle_name, subscriber_count, community_size, "
            "contact_email, contact_kakao, contact_naver_cafe, contact_instagram, "
            "best_content_id, best_content_title, best_content_views, "
            "content_summary, channel_type, approach_strategy, "
            "conversion_power_score, competitive_risk_score, "
            "has_paid_course, has_tool_recommendation, sells_own_program, sells_competing_tool, "
            "score, score_breakdown, grade, status, touch_count, last_touch_at, "
            "emailed_at, reply_type, reply_summary, created_at, updated_at"
        )
        .gte("score", min_score)
        .order("score", desc=True)
        .range(offset, offset + limit - 1)
    )
    if platform:
        q = q.eq("platform", platform)
    if status:
        q = q.eq("status", status)
    if grade:
        q = q.eq("grade", grade)
    if channel_type:
        q = q.eq("channel_type", channel_type)
    resp = q.execute()
    return resp.data or []


@router.get("/leads/{lead_id}")
def get_lead(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    resp = _db().table("outreach_leads").select("*").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    lead = rows[0]
    # 터치포인트 이력 포함
    tp_resp = (
        _db().table("outreach_touchpoints")
        .select("*")
        .eq("lead_id", lead_id)
        .order("touch_sequence")
        .execute()
    )
    lead["touchpoints"] = tp_resp.data or []
    return lead


@router.post("/leads/{lead_id}/analyze")
def trigger_analysis(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """Sonnet 심층 분석 트리거 (A/S급만). 백그라운드 실행."""
    import threading

    resp = _db().table("outreach_leads").select("id, grade, status").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    lead = rows[0]
    if lead.get("grade") not in ("S", "A", "B"):
        raise HTTPException(400, f"C/D급 리드는 심층 분석 대상이 아닙니다 (현재 {lead.get('grade')}급)")

    def _run():
        try:
            from app.services.channel_analyzer import analyze_lead
            analyze_lead(lead_id)
        except Exception as e:
            logger.error("[analyze] 실패 [%s]: %s", lead_id, e)

    threading.Thread(target=_run, daemon=True).start()
    _db().table("outreach_leads").update({"status": "analyzing", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", lead_id).execute()
    return {"ok": True, "message": "심층 분석 시작됨 (백그라운드)"}


class EmailDraftPatch(BaseModel):
    email_subject: str | None = None
    email_draft: str | None = None
    email_final: str | None = None


@router.patch("/leads/{lead_id}/email-draft")
def update_email_draft(lead_id: str, body: EmailDraftPatch, user: UserContext = Depends(require_admin)) -> dict:
    """이메일 초안 편집 저장."""
    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.email_subject is not None:
        update["email_subject"] = body.email_subject
    if body.email_draft is not None:
        update["email_draft"] = body.email_draft
    if body.email_final is not None:
        update["email_final"] = body.email_final
    resp = _db().table("outreach_leads").update(update).eq("id", lead_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    return {"ok": True}


@router.post("/leads/{lead_id}/approve")
def approve_lead(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """담당자 검토 완료 → approved 상태로 변경."""
    now = datetime.now(timezone.utc).isoformat()
    resp = _db().table("outreach_leads").update({"status": "approved", "updated_at": now}).eq("id", lead_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    return {"ok": True, "status": "approved"}


@router.post("/leads/{lead_id}/send")
def send_lead_email(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """수동 이메일 발송 (approved 상태 권장, email 있어야 함)."""
    from app.services.outreach_mailer import send_single
    result = send_single(lead_id)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "발송 실패"))
    return {"ok": True, "message": "이메일 발송 완료"}


class StatusPatch(BaseModel):
    status: str


@router.patch("/leads/{lead_id}/status")
def update_lead_status(lead_id: str, body: StatusPatch, user: UserContext = Depends(require_admin)) -> dict:
    allowed = {"discovered","analyzing","draft_ready","approved","emailed",
               "replied","no_reply","negotiating","deal","rejected","archived"}
    if body.status not in allowed:
        raise HTTPException(400, f"status는 {sorted(allowed)} 중 하나")
    now = datetime.now(timezone.utc).isoformat()
    resp = _db().table("outreach_leads").update({"status": body.status, "updated_at": now}).eq("id", lead_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    return rows[0]


# ── 스캔 트리거 ──────────────────────────────────────────────────────

@router.post("/scan")
def trigger_scan(
    platform: str | None = None,
    user: UserContext = Depends(require_admin),
) -> dict:
    """전체 or 특정 플랫폼 스캔 수동 트리거 (백그라운드)."""
    import threading
    from app.services.outreach_pipeline import run_platform_scan, run_all_platforms

    def _run():
        try:
            result = run_platform_scan(platform) if platform else run_all_platforms()
            logger.info("[manual-scan] 완료: %s", result)
        except Exception as e:
            logger.error("[manual-scan] 실패: %s", e)

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True, "message": f"스캔 시작됨 ({platform or '전체'}, 백그라운드 실행)"}


@router.get("/scan/stats")
def scan_stats(user: UserContext = Depends(require_admin)) -> dict:
    """통계: 플랫폼별 리드 수 + 상태별 집계 + 등급별 집계 + KPI."""
    try:
        leads_resp = _db().table("outreach_leads").select("platform, grade, status").execute()
        rows = leads_resp.data or []
    except Exception as e:
        return {"error": str(e)}

    total = len(rows)
    by_status: dict[str, int] = {}
    by_grade: dict[str, int] = {}
    by_platform: dict[str, int] = {}

    for r in rows:
        s = r.get("status", "unknown")
        g = r.get("grade", "?")
        p = r.get("platform", "unknown")
        by_status[s] = by_status.get(s, 0) + 1
        by_grade[g] = by_grade.get(g, 0) + 1
        by_platform[p] = by_platform.get(p, 0) + 1

    try:
        content_resp = _db().table("outreach_scanned_content").select("content_id", count="exact").execute()
        total_scanned = content_resp.count or 0
    except Exception:
        total_scanned = 0

    try:
        touch_resp = _db().table("outreach_touchpoints").select("status, channel").execute()
        touch_rows = touch_resp.data or []
        touches_sent = sum(1 for t in touch_rows if t.get("status") == "sent")
        touches_replied = sum(1 for t in touch_rows if t.get("status") == "replied")
    except Exception:
        touches_sent = 0
        touches_replied = 0

    return {
        "total_leads": total,
        "total_scanned_content": total_scanned,
        "by_platform": by_platform,
        "by_status": by_status,
        "by_grade": by_grade,
        "kpi": {
            "discovered": total,
            "emailed": by_status.get("emailed", 0) + by_status.get("replied", 0)
                       + by_status.get("no_reply", 0) + by_status.get("negotiating", 0)
                       + by_status.get("deal", 0),
            "replied": by_status.get("replied", 0),
            "negotiating": by_status.get("negotiating", 0),
            "deal": by_status.get("deal", 0),
            "touches_sent": touches_sent,
            "touches_replied": touches_replied,
        },
    }


# ── 터치포인트 관리 ──────────────────────────────────────────────────

@router.get("/leads/{lead_id}/touchpoints")
def get_touchpoints(lead_id: str, user: UserContext = Depends(require_admin)) -> list[dict]:
    resp = (
        _db().table("outreach_touchpoints")
        .select("*")
        .eq("lead_id", lead_id)
        .order("touch_sequence")
        .execute()
    )
    return resp.data or []


class TouchStatusPatch(BaseModel):
    status: str


@router.patch("/touchpoints/{touch_id}/status")
def update_touch_status(touch_id: str, body: TouchStatusPatch, user: UserContext = Depends(require_admin)) -> dict:
    """터치포인트 수동 상태 변경 (담당자가 DM 보냈을 때 'sent' 처리 등)."""
    allowed = {"pending","sent","failed","replied","bounced","skipped"}
    if body.status not in allowed:
        raise HTTPException(400, f"status는 {sorted(allowed)} 중 하나")
    update: dict = {"status": body.status}
    if body.status == "sent":
        update["sent_at"] = datetime.now(timezone.utc).isoformat()
    elif body.status == "replied":
        update["replied_at"] = datetime.now(timezone.utc).isoformat()
    resp = _db().table("outreach_touchpoints").update(update).eq("id", touch_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "터치포인트를 찾을 수 없습니다.")
    return rows[0]
