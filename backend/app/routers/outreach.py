"""영업(Outreach) 에이전트 API — 멀티채널 파트너 발굴 + CRM."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
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
    from app.services.secrets import get_secret
    return get_secret("maesil_studio_url")


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
    """리드 목록 (플랫폼·상태·등급·채널유형 필터) — RPC."""
    resp = _db().rpc("list_outreach_leads", {
        "p_min_score":    min_score,
        "p_limit":        limit,
        "p_offset":       offset,
        "p_platform":     platform,
        "p_status":       status,
        "p_grade":        grade,
        "p_channel_type": channel_type,
    }).execute()
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
    """심층 분석 트리거. 백그라운드 실행."""
    import threading

    resp = _db().table("outreach_leads").select("id, grade, status").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")

    def _run():
        try:
            from app.services.channel_analyzer import analyze_lead
            analyze_lead(lead_id)
        except Exception as e:
            logger.error("[analyze] 실패 [%s]: %s", lead_id, e)

    threading.Thread(target=_run, daemon=True).start()
    _db().table("outreach_leads").update({"status": "analyzing", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", lead_id).execute()
    return {"ok": True, "message": "심층 분석 시작됨 (백그라운드)"}


@router.post("/leads/analyze-batch")
def trigger_batch_analysis(
    grades: str = "S,A,B,C,D",
    limit: int = 500,
    force: bool = False,
    user: UserContext = Depends(require_admin),
) -> dict:
    """리드 일괄 분석.
    - force=false (기본): discovered 상태만 분석
    - force=true: draft_ready 포함 재분석 (새 프롬프트 적용)
    grades=S,A,B,C,D  limit=500
    """
    import threading, time

    grade_list = [g.strip() for g in grades.split(",") if g.strip()]

    if force:
        # draft_ready + discovered 모두 대상
        status_filter = ["discovered", "draft_ready"]
    else:
        status_filter = ["discovered"]

    resp = (
        _db().table("outreach_leads")
        .select("id, grade, status")
        .in_("status", status_filter)
        .in_("grade", grade_list)
        .order("score", desc=True)
        .limit(limit)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        status_desc = "discovered + draft_ready" if force else "discovered"
        return {"ok": True, "queued": 0, "message": f"분석할 리드 없음 ({status_desc} 상태)"}

    ids = [r["id"] for r in rows]
    now_iso = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"status": "analyzing", "updated_at": now_iso}).in_("id", ids).execute()

    def _run_batch():
        try:
            from app.services.channel_analyzer import analyze_lead
        except ImportError as e:
            logger.error("[batch-analyze] import 실패: %s", e)
            return
        for lead_id in ids:
            try:
                analyze_lead(lead_id)
            except Exception as e:
                logger.error("[batch-analyze] 실패 [%s]: %s", lead_id, e)
            time.sleep(0.5)  # Haiku API rate limit 여유

    threading.Thread(target=_run_batch, daemon=True).start()
    reanalyze_note = " (재분석 포함)" if force else ""
    logger.info("[batch-analyze] %d건 분석 시작 (등급: %s%s)", len(ids), grades, reanalyze_note)
    return {"ok": True, "queued": len(ids), "message": f"{len(ids)}건 일괄 분석 시작됨 (백그라운드){reanalyze_note}"}


@router.get("/leads/{lead_id}/email-preview")
def preview_email(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """실제 발송될 이메일 HTML 미리보기."""
    from app.services.outreach_mailer import (
        _build_email_html, _draft_to_html, _build_subject,
        _build_agency_email_html, _build_agency_subject, _is_agency_lead,
    )

    resp = _db().table("outreach_leads").select("*").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    lead = rows[0]

    is_agency = _is_agency_lead(lead)
    handle = lead.get("handle_name") or ("대행사" if is_agency else "파트너 채널")
    subject = lead.get("email_subject") or (
        _build_agency_subject(handle) if is_agency else _build_subject(handle)
    )

    if lead.get("email_final"):
        html = _draft_to_html(lead["email_final"])
    elif is_agency:
        html = _build_agency_email_html(handle, lead.get("email_draft") or "")
    else:
        intro = lead.get("email_draft")
        if not intro:
            try:
                from app.services.outreach_personalize import build_personal_intro
                intro = build_personal_intro(lead)
            except Exception:
                intro = None
        html = _build_email_html(handle, lead.get("platform_url") or "", intro or "")

    return {"ok": True, "subject": subject, "html": html}


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
    _db().table("outreach_leads").update(update).eq("id", lead_id).execute()
    return {"ok": True}


@router.post("/leads/{lead_id}/approve")
def approve_lead(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """담당자 검토 완료 → approved 상태로 변경."""
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"status": "approved", "updated_at": now}).eq("id", lead_id).execute()
    return {"ok": True, "status": "approved"}


@router.post("/leads/{lead_id}/send")
def send_lead_email(lead_id: str, user: UserContext = Depends(require_admin)) -> dict:
    """수동 이메일 발송 (approved 상태 권장, email 있어야 함)."""
    from app.services.outreach_mailer import send_single
    result = send_single(lead_id)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "발송 실패"))
    return {"ok": True, "message": "이메일 발송 완료"}


# ── 수신거부 / 차단 (정보통신망법 컴플라이언스) ────────────────────────

def _unsub_page(message: str, ok: bool = True) -> str:
    color = "#059669" if ok else "#dc2626"
    icon = "✓" if ok else "✕"
    return f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>수신거부</title></head>
<body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:60px 20px;text-align:center">
<div style="max-width:440px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 32px;box-shadow:0 2px 16px rgba(0,0,0,.06)">
<div style="font-size:40px;color:{color}">{icon}</div>
<h2 style="color:#1e293b;font-size:18px;margin:16px 0 8px">{message}</h2>
<p style="color:#64748b;font-size:14px;line-height:1.7">앞으로 영업 메일이 발송되지 않습니다.<br>문의: support@maesil-insight.com</p>
</div></body></html>"""


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = "") -> HTMLResponse:
    """공개 수신거부 엔드포인트 (메일 링크). 토큰 검증 후 suppression 등록."""
    from app.services.outreach_suppression import verify_unsub_token, add_suppression
    addr = verify_unsub_token(token) if token else None
    if not addr:
        return HTMLResponse(_unsub_page("유효하지 않은 수신거부 링크입니다.", ok=False), status_code=400)
    add_suppression(addr, reason="unsubscribe", source="link")
    return HTMLResponse(_unsub_page(f"{addr} 님, 수신거부가 완료되었습니다.", ok=True))


@router.post("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_post(token: str = "") -> HTMLResponse:
    """RFC 8058 One-Click 수신거부 (메일 클라이언트 자동 호출)."""
    return unsubscribe(token)


@router.get("/r")
def track_click(lid: str = "") -> RedirectResponse:
    """오픈톡 링크 클릭 추적 → 기록 후 실제 오픈톡으로 리다이렉트 (공개)."""
    from app.config import settings
    dest = settings.outreach_kakao_url or "https://maesil-insight.com"
    if lid:
        try:
            now = datetime.now(timezone.utc).isoformat()
            rows = _db().table("outreach_leads").select("click_count").eq("id", lid).limit(1).execute().data or []
            cc = (rows[0].get("click_count") if rows else 0) or 0
            _db().table("outreach_leads").update({
                "click_count": cc + 1, "clicked_at": now, "updated_at": now,
            }).eq("id", lid).execute()
            logger.info("[click] 오픈톡 클릭 lead=%s (%d회)", lid, cc + 1)
        except Exception as e:
            logger.warning("click 기록 실패 [%s]: %s", lid, e)
    return RedirectResponse(dest, status_code=302)


class SuppressRequest(BaseModel):
    email: str
    reason: str = "manual"   # manual | bounce | complaint | blocked
    note: str | None = None


@router.post("/test-send")
def test_send(to: str = "", lead_id: str = "", user: UserContext = Depends(require_admin)) -> dict:
    """Gmail 발송 파이프라인 테스트 — 지정 주소로 샘플 1통 발송 (콜드 드립/실제 리드 안 건드림).
    OAuth 연결·도달·렌더·클릭추적 검증용. to=본인이메일 권장."""
    from app.services import outreach_gmail_sender as gm
    from app.services.outreach_mailer import build_lead_email

    if not to.strip():
        raise HTTPException(400, "to(수신 이메일)가 필요합니다.")
    if not gm.is_configured():
        raise HTTPException(400, "outreach_gmail_* 시크릿이 없습니다 (/settings에서 등록).")

    if lead_id:
        rows = _db().table("outreach_leads").select("*").eq("id", lead_id).limit(1).execute().data or []
        if not rows:
            raise HTTPException(404, "리드를 찾을 수 없습니다.")
        lead = rows[0]
        lead["contact_email"] = to  # 테스트는 본인 주소로만
    else:
        lead = {
            "id": "test", "platform": "youtube", "handle_name": "테스트채널",
            "contact_email": to,
            "email_draft": '최근 올리신 "테스트 영상" 잘 봤습니다. (발송 파이프라인 테스트 메일입니다)',
            "best_content_title": "테스트 인기 영상",
        }
    subject, html = build_lead_email(lead)
    result = gm.send(to, subject, html)
    if not result.get("ok"):
        raise HTTPException(400, f"발송 실패: {result.get('error')}")
    return {"ok": True, "to": to, "id": result.get("id"), "subject": subject}


@router.post("/suppress")
def suppress_email(body: SuppressRequest, user: UserContext = Depends(require_admin)) -> dict:
    """관리자 수동 차단(BLOCKED 등). suppression 등록 + 리드 상태 전환."""
    from app.services.outreach_suppression import add_suppression
    if not body.email.strip():
        raise HTTPException(400, "email 필요")
    if add_suppression(body.email, reason=body.reason, source="admin", note=body.note):
        return {"ok": True, "email": body.email.strip().lower()}
    raise HTTPException(400, "차단 처리 실패")


class StatusPatch(BaseModel):
    status: str


class GradePatch(BaseModel):
    grade: str


@router.patch("/leads/{lead_id}/grade")
def update_lead_grade(lead_id: str, body: GradePatch, user: UserContext = Depends(require_admin)) -> dict:
    """등급 수동 변경 (S/A/B/C/D)."""
    if body.grade not in ("S", "A", "B", "C", "D"):
        raise HTTPException(400, "grade는 S/A/B/C/D 중 하나")
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"grade": body.grade, "updated_at": now}).eq("id", lead_id).execute()
    return {"ok": True, "grade": body.grade}


@router.patch("/leads/{lead_id}/status")
def update_lead_status(lead_id: str, body: StatusPatch, user: UserContext = Depends(require_admin)) -> dict:
    allowed = {"discovered","analyzing","draft_ready","approved","emailed",
               "replied","no_reply","negotiating","deal","rejected","archived"}
    if body.status not in allowed:
        raise HTTPException(400, f"status는 {sorted(allowed)} 중 하나")
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"status": body.status, "updated_at": now}).eq("id", lead_id).execute()
    return {"ok": True, "status": body.status}


# ── 광고대행사 임포트 (공식 인증 명단 큐레이션) ────────────────────────

@router.post("/agencies/import")
def import_official_agencies(
    source: str = "coupang_official",
    enrich: bool = True,
    user: UserContext = Depends(require_admin),
) -> dict:
    """네이버/쿠팡 공식 광고대행사를 ad_agency 리드로 적재 (발송 안 함, discovered 상태).
    source: 'coupang_official' | 'naver_official'
    enrich: 홈페이지에서 이메일 보강 시도.
    """
    from app.services import outreach_agency_importer as imp
    if source == "coupang_official":
        return imp.import_coupang_official(enrich=enrich)
    if source == "naver_official":
        return imp.import_naver_official(enrich=enrich)
    raise HTTPException(400, "source는 'coupang_official' 또는 'naver_official'")


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


@router.post("/scan/debug")
def trigger_scan_debug(
    platform: str | None = None,
    user: UserContext = Depends(require_admin),
) -> dict:
    """동기 스캔 — 에러 즉시 반환 (디버그용)."""
    import traceback
    try:
        from app.services.outreach_pipeline import run_platform_scan, run_all_platforms
        result = run_platform_scan(platform) if platform else run_all_platforms()
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e), "traceback": traceback.format_exc()}


@router.get("/scan/stats")
def scan_stats(user: UserContext = Depends(require_admin)) -> dict:
    """통계: 플랫폼별 리드 수 + 상태별 집계 + 등급별 집계 + KPI — RPC."""
    try:
        resp = _db().rpc("get_outreach_stats", {}).execute()
        raw: dict = resp.data or {}
    except Exception as e:
        return {"error": str(e)}

    by_status: dict[str, int] = raw.get("by_status") or {}
    total: int = raw.get("total_leads") or 0

    return {
        "total_leads":           total,
        "total_scanned_content": raw.get("total_scanned_content") or 0,
        "by_platform":           raw.get("by_platform") or {},
        "by_status":             by_status,
        "by_grade":              raw.get("by_grade") or {},
        "kpi": {
            "discovered":  total,
            "emailed":     (by_status.get("emailed", 0) + by_status.get("replied", 0)
                            + by_status.get("no_reply", 0) + by_status.get("negotiating", 0)
                            + by_status.get("deal", 0)),
            "replied":     by_status.get("replied", 0),
            "negotiating": by_status.get("negotiating", 0),
            "deal":        by_status.get("deal", 0),
            "touches_sent":    raw.get("touches_sent") or 0,
            "touches_replied": raw.get("touches_replied") or 0,
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
    _db().table("outreach_touchpoints").update(update).eq("id", touch_id).execute()
    return {"ok": True}
