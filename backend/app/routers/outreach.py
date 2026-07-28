"""영업(Outreach) 에이전트 API — 멀티채널 파트너 발굴 + CRM."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outreach", tags=["outreach"])


def _db():
    return get_maesil_total_client().schema("agent_work")


def _require_tid(user: UserContext) -> str:
    """현재 유저의 워크스페이스(tenant) id. 영업 데이터 격리 키."""
    if not user.tenant_id:
        raise HTTPException(403, "연결된 워크스페이스가 없습니다. 관리자에게 문의하세요.")
    return user.tenant_id


# ── 기존 스냅샷 엔드포인트 (유지) ──────────────────────────────────────

@router.get("/snapshots")
def list_snapshots(user: UserContext = Depends(get_current_user)) -> list[dict]:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .eq("tenant_id", _require_tid(user))
        .in_("kind", ["outreach_targets", "proposal_draft"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return resp.data or []


@router.get("/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at, valid_until")
        .eq("tenant_id", _require_tid(user))
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
def get_proposal_html(snapshot_id: str, user: UserContext = Depends(get_current_user)) -> HTMLResponse:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at")
        .eq("tenant_id", _require_tid(user))
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
def send_to_studio(snapshot_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    resp = (
        _db().table("snapshots")
        .select("id, kind, payload, created_at")
        .eq("tenant_id", _require_tid(user))
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
    campaign: str | None = "partner",
    min_score: int = 0,
    limit: int = 50,
    offset: int = 0,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    """리드 목록 (플랫폼·상태·등급·채널유형·캠페인 필터) — RPC.

    campaign: 'partner'(기본, 파트너 모집) | 'interview'(인터뷰/출연) | 'all'(전체).
    PostgREST가 응답당 최대 1,000행으로 자르므로 1,000행 단위로 루프 조회해 limit까지 채움.
    """
    tid = _require_tid(user)
    p_campaign = None if campaign in (None, "all", "") else campaign
    page = 1000
    rows: list[dict] = []
    while len(rows) < limit:
        take = min(page, limit - len(rows))
        params = {
            "p_tenant_id":    tid,
            "p_min_score":    min_score,
            "p_limit":        take,
            "p_offset":       offset + len(rows),
            "p_platform":     platform,
            "p_status":       status,
            "p_grade":        grade,
            "p_channel_type": channel_type,
            "p_campaign":     p_campaign,
        }
        try:
            resp = _db().rpc("list_outreach_leads", params).execute()
        except Exception as e:
            # SQL 061 미적용(구 RPC) 시 캠페인 파라미터 제거 후 재시도 (배포 과도기 안전장치)
            if "p_campaign" in str(e) or "list_outreach_leads" in str(e):
                logger.warning("[outreach] 구 RPC 폴백 (SQL 061 미적용?): %s", e)
                params.pop("p_campaign", None)
                resp = _db().rpc("list_outreach_leads", params).execute()
            else:
                raise
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < take:
            break
    return rows


@router.get("/topics")
def list_topics(user: UserContext = Depends(get_current_user)) -> dict:
    """아웃리치 주제(브랜드) 목록 — 주제별 검색·수집이 분리됨.

    [{campaign, label, brand}] (partner=인사이트 파트너 유입, interview=매실K 인터뷰).
    """
    _require_tid(user)
    from app.services.outreach_topics import known_topics
    return {"topics": known_topics()}


@router.get("/campaign-counts")
def campaign_counts(user: UserContext = Depends(get_current_user)) -> dict:
    """캠페인별 리드 수 (탭 뱃지용). {partner, interview, interview_candidate}."""
    tid = _require_tid(user)
    out = {"partner": 0, "interview": 0, "interview_candidate": 0}
    try:
        resp = _db().rpc("outreach_campaign_counts", {"p_tenant_id": tid}).execute()
        for r in resp.data or []:
            out[r.get("campaign") or "partner"] = r.get("cnt") or 0
    except Exception as e:
        logger.warning("[outreach] campaign-counts 실패 (SQL 061 미적용?): %s", e)
    try:
        cand = (_db().table("outreach_leads").select("id", count="exact")
                .eq("tenant_id", tid).eq("interview_candidate", True).execute())
        out["interview_candidate"] = cand.count or 0
    except Exception:
        pass
    return out


# 인터뷰/출연 "호스트형" 채널 유형 — 게스트를 출연시키거나 사람·사례를 다룸.
# educator(강사)·tool_expert·reviewer는 '가르치는' 파트너 후보라 제외.
_INTERVIEW_HOST_TYPES = {"case_sharer", "community_admin", "influencer", "interviewer"}
# 콘텐츠 텍스트에 이게 있으면 인터뷰/출연 성격 (channel_type 없어도 보조 판별)
_INTERVIEW_KEYWORDS = ("인터뷰", "출연", "대담", "게스트", "사례", "스토리", "만나", "초대")


def _looks_interview(row: dict) -> bool:
    if (row.get("channel_type") or "") in _INTERVIEW_HOST_TYPES:
        return True
    text = f"{row.get('best_content_title') or ''} {row.get('content_summary') or ''}"
    return any(k in text for k in _INTERVIEW_KEYWORDS)


@router.post("/leads/find-interview-candidates")
def find_interview_candidates(
    min_subscribers: int = 3000,
    active_months: int = 18,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """기존 발굴 리드에서 인터뷰/출연 '겸용 후보'를 재계산(전체 리컴퓨트).

    후보 = 셀러 시청자 + 구독≥N + 비경쟁 + 최근 active_months내 활동 +
           (호스트형 채널유형 OR 인터뷰성 콘텐츠).
    강사형(educator)·리뷰형·죽은 채널(오래 미업로드)은 제외.
    ※ 메타데이터 한계상 AI제품판매 등 애매한 건 남을 수 있음 → 목록에서 수동 제외.
    재실행 시 자동 기준으로 다시 계산됨.
    """
    tid = _require_tid(user)
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=active_months * 30)).isoformat()
    q = (_db().table("outreach_leads")
         .select("id, handle_name, channel_type, subscriber_count, "
                 "best_content_title, content_summary, interview_candidate")
         .eq("tenant_id", tid)
         .eq("is_seller_content", True)
         .gte("subscriber_count", min_subscribers)
         .neq("sells_competing_tool", True)
         .neq("channel_dead", True)                   # 날아간(삭제·정지) 채널 제외
         .gte("best_content_published_at", cutoff)   # 최근 활동 채널만 (죽은 채널 제외)
         .limit(3000))
    rows = q.execute().data or []

    match_ids = {r["id"] for r in rows if _looks_interview(r)}

    # 전체 리컴퓨트: 매칭은 true, 나머지는 false (이전 잘못된 표시 정리)
    def _bulk(ids: list, val: bool):
        for i in range(0, len(ids), 200):
            (_db().table("outreach_leads").update({"interview_candidate": val})
             .eq("tenant_id", tid).in_("id", ids[i:i + 200]).execute())

    try:
        # 현재 true인데 이제 매칭 아님 → false로
        cur = (_db().table("outreach_leads").select("id")
               .eq("tenant_id", tid).eq("interview_candidate", True).limit(5000).execute().data or [])
        stale = [r["id"] for r in cur if r["id"] not in match_ids]
        _bulk(stale, False)
        _bulk(list(match_ids), True)
    except Exception as e:
        logger.error("[outreach] 인터뷰후보 재계산 실패: %s", e)
        raise HTTPException(500, f"저장 실패: {str(e)[:200]}")

    logger.info("[outreach] 인터뷰 후보 재계산: 후보 %d, 해제 %d (구독≥%d, 강사 제외)",
                len(match_ids), len(stale), min_subscribers)
    return {"ok": True, "candidates": len(match_ids), "cleared": len(stale),
            "scanned": len(rows), "min_subscribers": min_subscribers}


@router.post("/leads/verify-channels")
def verify_channels_endpoint(
    campaign: str | None = None,
    only_candidates: bool = False,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """유튜브 채널 생존 검증 → 삭제·정지된(날아간) 채널을 channel_dead 표시.

    only_candidates=true: 인터뷰 후보만 검증 (범위 좁혀 빠르게).
    살아있는 채널은 구독자 수도 최신화. channels.list 1유닛/50개라 저렴.
    """
    tid = _require_tid(user)
    from app.services.outreach_verify import verify_channels
    result = verify_channels(tid, campaign=campaign, only_candidates=only_candidates)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error") or "검증 실패")
    return result


@router.post("/leads/deep-verify-interview")
def deep_verify_interview_endpoint(
    limit: int = 25,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """인터뷰 후보의 최근 영상 스크립트까지 읽고 Claude가 인터뷰 여부 재판정.

    강사·AI스팸·낚시성 채널을 후보에서 제외. 비용 때문에 limit로 제한
    (미검증 후보 우선). 반복 실행하면 나머지도 순차 검증됨.
    """
    tid = _require_tid(user)
    from app.services.outreach_verify import deep_verify_interview
    result = deep_verify_interview(tid, limit=limit)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error") or "심층 검증 실패")
    return result


class InterviewFlag(BaseModel):
    value: bool


@router.patch("/leads/{lead_id}/interview-candidate")
def set_interview_candidate(lead_id: str, body: InterviewFlag,
                            user: UserContext = Depends(get_current_user)) -> dict:
    """특정 리드의 인터뷰 겸용 표시 수동 토글."""
    tid = _require_tid(user)
    resp = (_db().table("outreach_leads")
            .update({"interview_candidate": body.value})
            .eq("tenant_id", tid).eq("id", lead_id).execute())
    if not resp.data:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    return {"ok": True, "interview_candidate": body.value}


@router.get("/leads/{lead_id}")
def get_lead(lead_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    tid = _require_tid(user)
    resp = _db().table("outreach_leads").select("*").eq("tenant_id", tid).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    lead = rows[0]
    # 터치포인트 이력 포함
    tp_resp = (
        _db().table("outreach_touchpoints")
        .select("*")
        .eq("tenant_id", tid)
        .eq("lead_id", lead_id)
        .order("touch_sequence")
        .execute()
    )
    lead["touchpoints"] = tp_resp.data or []
    return lead


@router.post("/leads/{lead_id}/analyze")
def trigger_analysis(lead_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    """심층 분석 트리거. 백그라운드 실행."""
    import threading
    tid = _require_tid(user)

    resp = _db().table("outreach_leads").select("id, grade, status").eq("tenant_id", tid).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")

    def _run():
        try:
            from app.services.channel_analyzer import analyze_lead
            analyze_lead(tid, lead_id)
        except Exception as e:
            logger.error("[analyze] 실패 [%s]: %s", lead_id, e)

    threading.Thread(target=_run, daemon=True).start()
    _db().table("outreach_leads").update({"status": "analyzing", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("tenant_id", tid).eq("id", lead_id).execute()
    return {"ok": True, "message": "심층 분석 시작됨 (백그라운드)"}


@router.post("/leads/analyze-batch")
def trigger_batch_analysis(
    grades: str = "S,A,B,C,D",
    limit: int = 20000,
    force: bool = False,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """리드 일괄 분석.
    - force=false (기본): discovered 상태만 분석
    - force=true: draft_ready 포함 재분석 (새 프롬프트 적용)
    limit 기본 20000 — 대상 전체 분석(글자 분석은 Haiku라 건당 비용 미미, 페이지네이션).
    """
    import threading, time
    tid = _require_tid(user)

    grade_list = [g.strip() for g in grades.split(",") if g.strip()]

    if force:
        # 전체 재분석 — analyzing 포함(이전 배치에서 stuck된 리드 복구), 발송 완료/협의중/딜/거절/보관 제외
        status_filter = ["discovered", "analyzing", "draft_ready", "approved", "emailed", "no_reply"]
    else:
        status_filter = ["discovered"]

    # PostgREST 1,000행 상한 우회 페이지네이션 — 대상 전체 분석
    rows: list[dict] = []
    while len(rows) < limit:
        take = min(1000, limit - len(rows))
        batch = (
            _db().table("outreach_leads")
            .select("id, grade, status")
            .eq("tenant_id", tid)
            .in_("status", status_filter)
            .in_("grade", grade_list)
            .order("score", desc=True)
            .range(len(rows), len(rows) + take - 1)
            .execute()
        ).data or []
        rows.extend(batch)
        if len(batch) < take:
            break
    if not rows:
        status_desc = "discovered + draft_ready" if force else "discovered"
        return {"ok": True, "queued": 0, "message": f"분석할 리드 없음 ({status_desc} 상태)"}

    # emailed/no_reply 등 보존 상태는 analyzing으로 바꾸지 않음
    _preserve = {"emailed", "no_reply", "replied", "negotiating", "deal", "rejected", "archived"}
    ids_to_analyze = [r["id"] for r in rows if r.get("status") not in _preserve]
    ids_preserve = [r["id"] for r in rows if r.get("status") in _preserve]
    ids = [r["id"] for r in rows]
    now_iso = datetime.now(timezone.utc).isoformat()
    if ids_to_analyze:
        # Supabase .in_() URL 길이 제한 → 100개씩 청크 업데이트
        chunk_size = 100
        for i in range(0, len(ids_to_analyze), chunk_size):
            chunk = ids_to_analyze[i:i + chunk_size]
            _db().table("outreach_leads").update({"status": "analyzing", "updated_at": now_iso}).eq("tenant_id", tid).in_("id", chunk).execute()

    def _run_batch():
        try:
            from app.services.channel_analyzer import analyze_lead
        except ImportError as e:
            logger.error("[batch-analyze] import 실패: %s", e)
            return
        for lead_id in ids:
            try:
                analyze_lead(tid, lead_id)
            except Exception as e:
                logger.error("[batch-analyze] 실패 [%s]: %s", lead_id, e)
            time.sleep(0.5)  # Haiku API rate limit 여유

    threading.Thread(target=_run_batch, daemon=True).start()
    reanalyze_note = " (재분석 포함)" if force else ""
    logger.info("[batch-analyze] %d건 분석 시작 (등급: %s%s)", len(ids), grades, reanalyze_note)
    return {"ok": True, "queued": len(ids), "message": f"{len(ids)}건 일괄 분석 시작됨 (백그라운드){reanalyze_note}"}


@router.post("/leads/crawl-emails")
def crawl_emails_from_links(
    limit: int = 20000,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """이메일 없는 YouTube 리드의 채널 외부 링크(블로그·카페·링크트리 등) 크롤링해 이메일 추출.
    백그라운드 실행. 완료 시 로그에서 확인.
    기본 limit 20000 — 미발송 리드 전체 대상(과거 200 상한이 785명 중 200만 크롤링).
    """
    import threading
    tid = _require_tid(user)

    def _run():
        from app.services.email_link_crawler import bulk_crawl_missing_emails
        result = bulk_crawl_missing_emails(tid, limit=limit)
        logger.info("[crawl-emails] 결과: %s", result)

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True, "message": f"최대 {limit}건 크롤링 시작 (백그라운드). 수 분 소요."}


@router.post("/leads/reextract-emails")
def reextract_emails(
    limit: int = 20000,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """이메일 없는 approved 리드의 raw_contact_text를 재파싱해 이메일 추출.
    오브퍼스케이트 패턴 개선 등 이후 기존 리드 소급 적용에 사용.
    """
    import threading
    tid = _require_tid(user)

    def _run():
        # DB 조회를 요청 밖(백그라운드)으로 — raw_contact_text가 커서 동기 조회 시
        # 프론트 30초 타임아웃(fetch failed)을 넘기던 문제 수정. 링크 크롤링과 동일 패턴.
        from app.services.scanners.base import extract_contact
        rows: list[dict] = []
        try:
            while len(rows) < limit:
                take = min(1000, limit - len(rows))
                batch = (
                    _db().table("outreach_leads")
                    .select("id, raw_contact_text")
                    .eq("tenant_id", tid)
                    .is_("contact_email", "null")
                    .not_.is_("raw_contact_text", "null")
                    .in_("status", ["approved", "discovered", "analyzing", "draft_ready"])
                    .order("id")
                    .range(len(rows), len(rows) + take - 1)
                    .execute()
                ).data or []
                rows.extend(batch)
                if len(batch) < take:
                    break
        except Exception as e:
            logger.warning("[reextract-emails] 리드 조회 실패: %s", e)
            return

        updated = 0
        for r in rows:
            txt = r.get("raw_contact_text") or ""
            if not txt:
                continue
            contact = extract_contact(txt)
            if contact.email:
                try:
                    _db().table("outreach_leads").update({
                        "contact_email": contact.email,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("tenant_id", tid).eq("id", r["id"]).execute()
                    updated += 1
                except Exception as e:
                    logger.warning("reextract email 업데이트 실패 [%s]: %s", r["id"], e)
        logger.info("[reextract-emails] %d/%d건 이메일 복구 완료", updated, len(rows))

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True, "message": "이메일 재추출 시작 (백그라운드). 수 분 소요."}


@router.post("/leads/rescore")
def trigger_rescore(
    limit: int = 20000,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """기존 리드 등급 재채점 (AI 재실행 없음).
    DB에 저장된 신호값으로 새 scorer 기준 재계산 → score/grade/score_breakdown 업데이트.
    구 필드(sells_competing_tool, is_competitor_partner 등) → 새 필드 매핑 포함.
    limit 기본 20000 — 전 리드 대상(로컬 재계산이라 비용 없음, 페이지네이션).
    """
    import threading
    tid = _require_tid(user)

    _COLS = (
        "id, grade, status, platform, "
        "contact_email, contact_kakao, contact_naver_cafe, community_size, activity_level, "
        "subscriber_count, platforms_json, "
        # 구 리스크 필드
        "sells_competing_tool, sells_own_program, is_competitor_partner, has_negative_tool_content, "
        # 신 리스크 필드 (재스캔 리드)
        "promotes_other_program, is_program_company, "
        # 전환력 필드
        "has_paid_course, has_paid_membership, has_ebook_sale, has_consulting, "
        "has_affiliate_exp, has_tool_recommendation"
    )
    def _run_rescore():
        from app.services.outreach_scorer import calculate_score
        # DB 조회도 백그라운드로 — 요청 안 동기 조회가 프론트 타임아웃(fetch failed) 유발.
        # PostgREST 1,000행 상한 우회 페이지네이션.
        rows: list[dict] = []
        try:
            while len(rows) < limit:
                take = min(1000, limit - len(rows))
                batch = (
                    _db().table("outreach_leads")
                    .select(_COLS)
                    .eq("tenant_id", tid)
                    .order("id")
                    .range(len(rows), len(rows) + take - 1)
                    .execute()
                ).data or []
                rows.extend(batch)
                if len(batch) < take:
                    break
        except Exception as e:
            logger.warning("[rescore] 리드 조회 실패: %s", e)
            return
        if not rows:
            logger.info("[rescore] 리드 없음")
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        _preserve_status = {"emailed", "no_reply", "replied", "negotiating", "deal", "rejected", "archived", "unsubscribe", "blocked"}
        updated = 0

        for lead in rows:
            try:
                # ── 리스크 신호 매핑 (구 → 신) ──────────────────────────
                # 신 필드가 있으면 우선 사용, 없으면 구 필드로 추정
                promotes_other = (
                    lead.get("promotes_other_program")
                    or lead.get("is_competitor_partner")  # 구: 경쟁사 파트너 ≈ 타 프로그램 홍보
                ) or False
                sells_own = lead.get("sells_own_program") or lead.get("sells_competing_tool") or False
                is_prog_co = lead.get("is_program_company") or False

                # ── 전환력 신호 ──────────────────────────────────────────
                # has_paid_course는 이제 보너스 없음
                conversion_power = 0
                if lead.get("has_paid_membership"):
                    conversion_power += 12
                if lead.get("has_consulting"):
                    conversion_power += 10
                if lead.get("has_ebook_sale"):
                    conversion_power += 8
                if lead.get("has_tool_recommendation"):
                    conversion_power += 8
                if lead.get("has_affiliate_exp"):
                    conversion_power += 5
                conversion_power = min(conversion_power, 40)

                # ── 리스크 점수 ──────────────────────────────────────────
                risk_score = 0
                if promotes_other:
                    risk_score += 35
                if sells_own:
                    risk_score += 30
                if is_prog_co:
                    risk_score += 40
                risk_score = min(risk_score, 40)

                score_input = {
                    "platform": lead.get("platform", ""),
                    "contact_email": lead.get("contact_email"),
                    "contact_kakao": lead.get("contact_kakao"),
                    "contact_naver_cafe": lead.get("contact_naver_cafe"),
                    "community_size": lead.get("community_size"),
                    "activity_level": lead.get("activity_level"),
                    "subscriber_count": lead.get("subscriber_count") or 0,
                    "platforms_json": lead.get("platforms_json") or [],
                    "conversion_power_score": conversion_power,
                    "competitive_risk_score": risk_score,
                    # 신 필드도 업데이트
                    "promotes_other_program": bool(promotes_other),
                    "sells_own_program": bool(sells_own),
                    "is_program_company": bool(is_prog_co),
                }
                total, new_grade, breakdown = calculate_score(score_input)

                # 상태 재결정 (발송/협의 등 보존)
                cur_status = lead.get("status") or "discovered"
                if cur_status in _preserve_status:
                    new_status = cur_status
                elif new_grade in ("S", "A", "B", "C"):
                    new_status = "approved"
                else:
                    new_status = "draft_ready"

                _db().table("outreach_leads").update({
                    "score": total,
                    "grade": new_grade,
                    "score_breakdown": breakdown,
                    "promotes_other_program": bool(promotes_other),
                    "sells_own_program": bool(sells_own),
                    "is_program_company": bool(is_prog_co),
                    "status": new_status,
                    "updated_at": now_iso,
                }).eq("tenant_id", tid).eq("id", lead["id"]).execute()
                updated += 1
            except Exception as e:
                logger.error("[rescore] 실패 [%s]: %s", lead.get("id"), e)

        logger.info("[rescore] 완료: %d/%d건 재채점", updated, len(rows))

    threading.Thread(target=_run_rescore, daemon=True).start()
    return {"ok": True, "message": "등급 재채점 시작됨 (백그라운드, 약 10~30초)"}


@router.get("/leads/{lead_id}/agency-briefing", response_class=HTMLResponse)
def get_agency_briefing(lead_id: str, user: UserContext = Depends(get_current_user)) -> HTMLResponse:
    """광고대행사 AI 브리핑 HTML 반환."""
    resp = _db().table("outreach_leads").select("agency_briefing,handle_name").eq("tenant_id", _require_tid(user)).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        return HTMLResponse("<h1>리드 없음</h1>", status_code=404)
    briefing = (rows[0].get("agency_briefing") or {})
    html = briefing.get("briefing_html") or ""
    if not html:
        return HTMLResponse("<p style='padding:2rem;color:#64748b'>브리핑이 아직 생성되지 않았습니다. AI 브리핑 생성 버튼을 눌러주세요.</p>")
    return HTMLResponse(content=html, media_type="text/html; charset=utf-8")


@router.get("/leads/{lead_id}/email-preview")
def preview_email(lead_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    """실제 발송될 이메일 HTML 미리보기."""
    from app.services.outreach_mailer import (
        _build_email_html, _draft_to_html, _build_subject,
        _build_agency_email_html, _build_agency_subject, _is_agency_lead,
    )

    resp = _db().table("outreach_leads").select("*").eq("tenant_id", _require_tid(user)).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    lead = rows[0]

    from app.services.outreach_mailer import build_lead_email
    subject, html = build_lead_email(lead)
    return {"ok": True, "subject": subject, "html": html}


class EmailDraftPatch(BaseModel):
    email_subject: str | None = None
    email_draft: str | None = None
    email_final: str | None = None


@router.patch("/leads/{lead_id}/email-draft")
def update_email_draft(lead_id: str, body: EmailDraftPatch, user: UserContext = Depends(get_current_user)) -> dict:
    """이메일 초안 편집 저장."""
    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.email_subject is not None:
        update["email_subject"] = body.email_subject
    if body.email_draft is not None:
        update["email_draft"] = body.email_draft
    if body.email_final is not None:
        update["email_final"] = body.email_final
    _db().table("outreach_leads").update(update).eq("tenant_id", _require_tid(user)).eq("id", lead_id).execute()
    return {"ok": True}


@router.post("/leads/{lead_id}/approve")
def approve_lead(lead_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    """담당자 검토 완료 → approved 상태로 변경."""
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"status": "approved", "updated_at": now}).eq("tenant_id", _require_tid(user)).eq("id", lead_id).execute()
    return {"ok": True, "status": "approved"}


@router.post("/leads/{lead_id}/send")
def send_lead_email(lead_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    """수동 이메일 발송 (approved 상태 권장, email 있어야 함)."""
    from app.services.outreach_mailer import send_single
    result = send_single(_require_tid(user), lead_id)
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
    parsed = verify_unsub_token(token) if token else None
    if not parsed:
        return HTMLResponse(_unsub_page("유효하지 않은 수신거부 링크입니다.", ok=False), status_code=400)
    tid, addr = parsed
    if not tid:
        # 구 토큰(멀티테넌트 이전) → 기본 테넌트로 처리
        from app.services.tenants import get_default_tenant_id
        tid = get_default_tenant_id()
    if not tid:
        return HTMLResponse(_unsub_page("처리 중 오류가 발생했습니다.", ok=False), status_code=500)
    add_suppression(tid, addr, reason="unsubscribe", source="link")
    # 해당 테넌트의 같은 이메일 리드 상태 → unsubscribe
    try:
        now = datetime.now(timezone.utc).isoformat()
        _db().table("outreach_leads").update({"status": "unsubscribe", "updated_at": now}) \
            .eq("tenant_id", tid).eq("contact_email", addr.strip().lower()).execute()
    except Exception as e:
        logger.warning("수신거부 리드 상태 업데이트 실패 [%s]: %s", addr, e)
    return HTMLResponse(_unsub_page(f"{addr} 님, 수신거부가 완료되었습니다.", ok=True))


@router.post("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_post(token: str = "") -> HTMLResponse:
    """RFC 8058 One-Click 수신거부 (메일 클라이언트 자동 호출)."""
    return unsubscribe(token)


_PIXEL_GIF = (
    b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00"
    b"\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00"
    b"\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
)


@router.get("/px")
def track_open(lid: str = "") -> Response:
    """이메일 오픈 픽셀 (1×1 GIF). 인증 없음 — 메일 클라이언트가 호출."""
    if lid:
        try:
            now = datetime.now(timezone.utc).isoformat()
            rows = _db().table("outreach_leads").select("open_count,opened_at").eq("id", lid).limit(1).execute().data or []
            if rows:
                oc = (rows[0].get("open_count") or 0) + 1
                upd: dict = {"open_count": oc, "updated_at": now}
                if not rows[0].get("opened_at"):
                    upd["opened_at"] = now
                _db().table("outreach_leads").update(upd).eq("id", lid).execute()
                logger.info("[open] 이메일 오픈 lead=%s (%d회)", lid, oc)
        except Exception as e:
            logger.warning("open 기록 실패 [%s]: %s", lid, e)
    return Response(content=_PIXEL_GIF, media_type="image/gif",
                    headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"})


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
def test_send(to: str = "", lead_id: str = "", user: UserContext = Depends(get_current_user)) -> dict:
    """Gmail 발송 파이프라인 테스트 — 지정 주소로 샘플 1통 발송 (콜드 드립/실제 리드 안 건드림).
    OAuth 연결·도달·렌더·클릭추적 검증용. to=본인이메일 권장."""
    from app.services import outreach_gmail_sender as gm
    from app.services.outreach_mailer import build_lead_email
    tid = _require_tid(user)

    if not to.strip():
        raise HTTPException(400, "to(수신 이메일)가 필요합니다.")
    if not gm.is_configured(tid):
        raise HTTPException(400, "outreach_gmail_* 시크릿이 없습니다 (/settings에서 등록).")

    if lead_id:
        rows = _db().table("outreach_leads").select("*").eq("tenant_id", tid).eq("id", lead_id).limit(1).execute().data or []
        if not rows:
            raise HTTPException(404, "리드를 찾을 수 없습니다.")
        lead = rows[0]
        lead["contact_email"] = to  # 테스트는 본인 주소로만
    else:
        lead = {
            "id": "test", "tenant_id": tid, "platform": "youtube", "handle_name": "테스트채널",
            "contact_email": to,
            "email_draft": '최근 올리신 "테스트 영상" 잘 봤습니다. (발송 파이프라인 테스트 메일입니다)',
            "best_content_title": "테스트 인기 영상",
        }
    subject, html = build_lead_email(lead)
    result = gm.send(tid, to, subject, html)
    if not result.get("ok"):
        raise HTTPException(400, f"발송 실패: {result.get('error')}")
    return {"ok": True, "to": to, "id": result.get("id"), "subject": subject}


@router.get("/config")
def get_outreach_config(user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트 영업 설정 조회 (없으면 기본값)."""
    from app.services.tenant_config import load_config
    c = load_config(_require_tid(user))
    return {
        "cold_drip_enabled": c.cold_drip_enabled, "daily_cap": c.daily_cap,
        "drip_grades": c.drip_grades, "send_start_hour": c.send_start_hour,
        "send_end_hour": c.send_end_hour, "timezone": c.timezone,
        "quiet_hours": c.quiet_hours, "ad_prefix": c.ad_prefix,
        "kakao_url": c.kakao_url, "sender_info": c.sender_info,
        "influencer_subject": c.influencer_subject, "agency_subject": c.agency_subject,
        "unsubscribe_base_url": c.unsubscribe_base_url,
        "keywords_youtube": c.keywords_youtube, "keywords_naver": c.keywords_naver,
    }


class OutreachConfigPatch(BaseModel):
    cold_drip_enabled: bool | None = None
    daily_cap: int | None = None
    drip_grades: str | None = None
    send_start_hour: int | None = None
    send_end_hour: int | None = None
    timezone: str | None = None
    quiet_hours: bool | None = None
    ad_prefix: bool | None = None
    kakao_url: str | None = None
    sender_info: str | None = None
    influencer_subject: str | None = None
    agency_subject: str | None = None
    unsubscribe_base_url: str | None = None
    keywords_youtube: list[str] | None = None
    keywords_naver: list[str] | None = None


@router.put("/config")
def update_outreach_config(body: OutreachConfigPatch, user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트 영업 설정 저장 (cap/등급/업무시간/타임존/키워드 등)."""
    from app.services.tenant_config import save_config
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if patch:
        save_config(_require_tid(user), patch)
    return {"ok": True}


class GmailSecretsPatch(BaseModel):
    client_id: str | None = None
    client_secret: str | None = None
    from_addr: str | None = None


class PlatformKeysPatch(BaseModel):
    youtube_api_key: str | None = None
    youtube_api_key_2: str | None = None
    youtube_api_key_3: str | None = None
    naver_client_id: str | None = None
    naver_client_secret: str | None = None
    anthropic_api_key: str | None = None


@router.get("/platform-keys")
def get_platform_keys_status(user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트 플랫폼 API키 설정 여부(값 미반환)."""
    from app.services.secrets import get_tenant_secret
    tid = _require_tid(user)
    names = ["youtube_api_key", "youtube_api_key_2", "youtube_api_key_3",
             "naver_client_id", "naver_client_secret", "anthropic_api_key"]
    return {n: bool(get_tenant_secret(tid, n)) for n in names}


@router.put("/platform-keys")
def set_platform_keys(body: PlatformKeysPatch, user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트 플랫폼 API키 저장 (YouTube/Naver/Anthropic — 본인 키)."""
    from app.services.secrets import upsert_tenant_secret
    tid = _require_tid(user)
    for name, val in body.model_dump().items():
        if val is not None and val.strip():
            upsert_tenant_secret(tid, name, val.strip(), "api_key")
    return {"ok": True}


@router.get("/gmail-secrets")
def get_gmail_secrets_status(user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트의 Gmail OAuth 시크릿 설정 상태(값은 미반환)."""
    from app.services.secrets import get_tenant_secret
    tid = _require_tid(user)
    def _has(n: str) -> bool:
        return bool(get_tenant_secret(tid, n))
    return {
        "client_id":     _has("outreach_gmail_client_id"),
        "client_secret": _has("outreach_gmail_client_secret"),
        "refresh_token": _has("outreach_gmail_refresh_token"),  # OAuth 연결 완료 여부
        "from_addr":     get_tenant_secret(tid, "outreach_gmail_from") or None,
    }


@router.put("/gmail-secrets")
def set_gmail_secrets(body: GmailSecretsPatch, user: UserContext = Depends(get_current_user)) -> dict:
    """테넌트가 자기 Google Console OAuth 클라이언트 정보 저장(연결 전 단계).
    refresh_token은 OAuth 연결(/api/oauth/gmail/start)로 채워짐."""
    from app.services.secrets import upsert_tenant_secret
    tid = _require_tid(user)
    if body.client_id is not None:
        upsert_tenant_secret(tid, "outreach_gmail_client_id", body.client_id.strip(), "oauth")
    if body.client_secret is not None:
        upsert_tenant_secret(tid, "outreach_gmail_client_secret", body.client_secret.strip(), "oauth")
    if body.from_addr is not None:
        upsert_tenant_secret(tid, "outreach_gmail_from", body.from_addr.strip(), "config")
    return {"ok": True}


@router.post("/suppress")
def suppress_email(body: SuppressRequest, user: UserContext = Depends(get_current_user)) -> dict:
    """관리자 수동 차단(BLOCKED 등). suppression 등록 + 리드 상태 전환."""
    from app.services.outreach_suppression import add_suppression
    if not body.email.strip():
        raise HTTPException(400, "email 필요")
    if add_suppression(_require_tid(user), body.email, reason=body.reason, source="admin", note=body.note):
        return {"ok": True, "email": body.email.strip().lower()}
    raise HTTPException(400, "차단 처리 실패")


class StatusPatch(BaseModel):
    status: str


class GradePatch(BaseModel):
    grade: str


@router.patch("/leads/{lead_id}/grade")
def update_lead_grade(lead_id: str, body: GradePatch, user: UserContext = Depends(get_current_user)) -> dict:
    """등급 수동 변경 (S/A/B/C/D)."""
    if body.grade not in ("S", "A", "B", "C", "D"):
        raise HTTPException(400, "grade는 S/A/B/C/D 중 하나")
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"grade": body.grade, "updated_at": now}).eq("tenant_id", _require_tid(user)).eq("id", lead_id).execute()
    return {"ok": True, "grade": body.grade}


@router.patch("/leads/{lead_id}/status")
def update_lead_status(lead_id: str, body: StatusPatch, user: UserContext = Depends(get_current_user)) -> dict:
    allowed = {"discovered","analyzing","draft_ready","approved","emailed",
               "replied","no_reply","negotiating","deal","rejected","archived"}
    if body.status not in allowed:
        raise HTTPException(400, f"status는 {sorted(allowed)} 중 하나")
    now = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_leads").update({"status": body.status, "updated_at": now}).eq("tenant_id", _require_tid(user)).eq("id", lead_id).execute()
    return {"ok": True, "status": body.status}


# ── 광고대행사 임포트 (공식 인증 명단 큐레이션) ────────────────────────

@router.post("/agencies/import")
def import_official_agencies(
    source: str = "coupang_official",
    enrich: bool = True,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """네이버/쿠팡 공식 광고대행사를 ad_agency 리드로 적재 (발송 안 함, discovered 상태).
    source: 'coupang_official' | 'naver_official'
    enrich: 홈페이지에서 이메일 보강 시도.
    """
    from app.services import outreach_agency_importer as imp
    tid = _require_tid(user)
    if source == "coupang_official":
        return imp.import_coupang_official(tid, enrich=enrich)
    if source == "naver_official":
        return imp.import_naver_official(tid, enrich=enrich)
    raise HTTPException(400, "source는 'coupang_official' 또는 'naver_official'")


# ── 스캔 트리거 ──────────────────────────────────────────────────────

@router.post("/scan")
def trigger_scan(
    platform: str | None = None,
    campaign: str = "partner",
    user: UserContext = Depends(get_current_user),
) -> dict:
    """전체 or 특정 플랫폼 스캔 수동 트리거 (백그라운드).

    campaign: 'partner'(파트너 모집) | 'interview'(인터뷰/출연 채널 수집).
    수집된 새 리드에 해당 campaign 태그가 붙어 목록이 분리됨.
    """
    import threading
    from app.services.outreach_pipeline import run_platform_scan, run_all_platforms
    tid = _require_tid(user)
    camp = campaign if campaign in ("partner", "interview") else "partner"

    def _run():
        try:
            result = (run_platform_scan(tid, platform, campaign=camp) if platform
                      else run_all_platforms(tid, campaign=camp))
            logger.info("[manual-scan] 완료 (%s): %s", camp, result)
        except Exception as e:
            logger.error("[manual-scan] 실패: %s", e)

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True, "message": f"스캔 시작됨 ({platform or '전체'} · {camp}, 백그라운드)"}


@router.post("/scan/debug")
def trigger_scan_debug(
    platform: str | None = None,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """동기 스캔 — 에러 즉시 반환 (디버그용)."""
    import traceback
    tid = _require_tid(user)
    try:
        from app.services.outreach_pipeline import run_platform_scan, run_all_platforms
        result = run_platform_scan(tid, platform) if platform else run_all_platforms(tid)
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e), "traceback": traceback.format_exc()}


@router.get("/scan/stats")
def scan_stats(user: UserContext = Depends(get_current_user)) -> dict:
    """통계: 플랫폼별 리드 수 + 상태별 집계 + 등급별 집계 + KPI — RPC."""
    try:
        resp = _db().rpc("get_outreach_stats", {"p_tenant_id": _require_tid(user)}).execute()
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


@router.get("/cold-drip/diagnostics")
def cold_drip_diagnostics(user: UserContext = Depends(get_current_user)) -> dict:
    """cold_drip 발송이 '왜 적은지' 펀넬로 진단.

    게이트(활성·Gmail·업무시간) + 공급 펀넬(상태별·자격·이메일 누락·분석 백로그)
    + 오늘 예약/발송 수를 한 번에 반환. 발송이 적으면 어느 단계에서 막히는지 즉시 식별.
    """
    from datetime import timedelta
    from app.services import outreach_gmail_sender as gm
    from app.services.tenant_config import load_config

    db = _db()
    tid = _require_tid(user)
    cfg = load_config(tid)
    _KST = cfg.tz
    now_kst = datetime.now(_KST)

    grades = cfg.grade_list
    plats = ["youtube", "naver_blog"]

    def _lead_count(build) -> int:
        try:
            q = db.table("outreach_leads").select("id", count="exact").eq("tenant_id", tid)
            return build(q).execute().count or 0
        except Exception:
            return -1

    eligible_now = _lead_count(lambda q: q
        .in_("platform", plats).eq("status", "approved").in_("grade", grades)
        .is_("emailed_at", "null").not_.is_("contact_email", "null").neq("contact_email", ""))
    d_eligible = _lead_count(lambda q: q
        .in_("platform", plats).eq("status", "approved").in_("grade", ["D"])
        .is_("emailed_at", "null").not_.is_("contact_email", "null").neq("contact_email", ""))
    approved_total    = _lead_count(lambda q: q.eq("status", "approved"))
    approved_no_email = _lead_count(lambda q: q.eq("status", "approved").is_("contact_email", "null"))
    approved_unsent   = _lead_count(lambda q: q.eq("status", "approved").is_("emailed_at", "null"))
    approved_onplat   = _lead_count(lambda q: q.eq("status", "approved").in_("platform", plats))
    approved_offplat  = (approved_total - approved_onplat) if (approved_total >= 0 and approved_onplat >= 0) else -1
    discovered_backlog = _lead_count(lambda q: q.eq("status", "discovered"))
    analyzing_backlog  = _lead_count(lambda q: q.eq("status", "analyzing"))

    # 오늘(KST) seq=1 예약/발송 수
    today_start = datetime(now_kst.year, now_kst.month, now_kst.day, tzinfo=_KST)
    today_a = today_start.astimezone(timezone.utc).isoformat()
    today_b = (today_start + timedelta(days=1)).astimezone(timezone.utc).isoformat()

    def _touch_count(statuses) -> int:
        try:
            return (db.table("outreach_touchpoints").select("id", count="exact")
                .eq("tenant_id", tid)
                .eq("touch_sequence", 1).eq("channel", "email").in_("status", statuses)
                .gte("scheduled_for", today_a).lt("scheduled_for", today_b)
                .execute().count) or 0
        except Exception:
            return -1

    scheduled_today = _touch_count(["pending", "sent"])
    sent_today = _touch_count(["sent"])

    return {
        "gates": {
            "enabled":          cfg.cold_drip_enabled,
            "gmail_configured": gm.is_configured(tid),
            "now_kst":          now_kst.isoformat(timespec="seconds"),
            "weekend":          now_kst.weekday() >= 5,
            "business_hours":   cfg.send_start_hour <= now_kst.hour < cfg.send_end_hour,
            "daily_cap":        cfg.daily_cap,
            "drip_grades":      cfg.drip_grades,
            "platforms":        plats,
        },
        "today": {
            "scheduled_seq1": scheduled_today,
            "sent_seq1":      sent_today,
            "room":           max(0, cfg.daily_cap - scheduled_today),
        },
        "supply": {
            "eligible_now":       eligible_now,        # S/A/B/C급 지금 즉시 발송 가능한 리드 수
            "d_eligible":         d_eligible,           # D급 fallback 발송가능 리드 수
            "approved_total":     approved_total,
            "approved_unsent":    approved_unsent,
            "approved_no_email":  approved_no_email,   # 승인됐지만 이메일 없어 발송 불가
            "approved_off_platform": approved_offplat, # 승인됐지만 youtube/naver 아님
            "discovered_backlog": discovered_backlog,  # 분석 대기 (approved 공급원)
            "analyzing_backlog":  analyzing_backlog,   # 분석 중/고착 가능
        },
        "hint": (
            "eligible_now가 작고 d_eligible도 작으면 → 이메일 있는 approved 리드 고갈. "
            "d_eligible이 큰데 scheduled_today가 0이면 → 스케줄러 미실행 또는 배포 확인. "
            "approved_no_email가 크면 → 연락처 수집 실패로 발송 불가. "
            "eligible_now가 큰데 scheduled_today가 작으면 → 스케줄러/배포 확인."
        ),
    }



@router.post("/cold-drip/schedule-now")
def cold_drip_schedule_now(user: UserContext = Depends(get_current_user)) -> dict:
    """cold_drip 스케줄러를 즉시 수동 실행 (업무시간·주말 체크 무시)."""
    from app.services.outreach_cold_drip import schedule_daily_cold_drip
    tid = _require_tid(user)
    result = schedule_daily_cold_drip(tid, force=True)
    return result


# ── 터치포인트 관리 ──────────────────────────────────────────────────

@router.get("/touchpoints")
def get_all_touchpoints(
    status: str = "",
    channel: str = "",
    limit: int = 200,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    """전체 발송 이력 — 리드 정보 별도 조회 포함.

    PostgREST 응답당 1,000행 상한을 range 페이지네이션으로 우회해 limit까지 조회.
    """
    import logging as _log
    _logger = _log.getLogger(__name__)
    tid = _require_tid(user)
    page = 1000
    rows: list[dict] = []
    while len(rows) < limit:
        take = min(page, limit - len(rows))
        q = (
            _db().table("outreach_touchpoints")
            .select("*")
            .eq("tenant_id", tid)
            .order("created_at", desc=True)
            .range(len(rows), len(rows) + take - 1)
        )
        if status:
            q = q.eq("status", status)
        if channel:
            q = q.eq("channel", channel)
        batch = q.execute().data or []
        rows.extend(batch)
        if len(batch) < take:
            break
    _logger.info("[touchpoints] count=%s", len(rows))

    # lead_id 목록으로 리드 정보 일괄 조회
    lead_ids = list({r["lead_id"] for r in rows if r.get("lead_id")})
    leads_map: dict = {}
    if lead_ids:
        chunk = 100
        for i in range(0, len(lead_ids), chunk):
            try:
                lr = _db().table("outreach_leads")\
                    .select("id, handle_name, contact_email, platform, grade, status")\
                    .eq("tenant_id", tid).in_("id", lead_ids[i:i+chunk]).execute()
                for l in (lr.data or []):
                    leads_map[l["id"]] = l
            except Exception:
                pass

    result = []
    for r in rows:
        lead = leads_map.get(r.get("lead_id") or "", {})
        result.append({**r, **{f"lead_{k}": v for k, v in lead.items() if k != "id"}})
    return result


@router.get("/leads/{lead_id}/touchpoints")
def get_touchpoints(lead_id: str, user: UserContext = Depends(get_current_user)) -> list[dict]:
    resp = (
        _db().table("outreach_touchpoints")
        .select("*")
        .eq("tenant_id", _require_tid(user))
        .eq("lead_id", lead_id)
        .order("touch_sequence")
        .execute()
    )
    return resp.data or []


class TouchStatusPatch(BaseModel):
    status: str


@router.patch("/touchpoints/{touch_id}/status")
def update_touch_status(touch_id: str, body: TouchStatusPatch, user: UserContext = Depends(get_current_user)) -> dict:
    """터치포인트 수동 상태 변경 (담당자가 DM 보냈을 때 'sent' 처리 등)."""
    allowed = {"pending","sent","failed","replied","bounced","skipped"}
    if body.status not in allowed:
        raise HTTPException(400, f"status는 {sorted(allowed)} 중 하나")
    update: dict = {"status": body.status}
    if body.status == "sent":
        update["sent_at"] = datetime.now(timezone.utc).isoformat()
    elif body.status == "replied":
        update["replied_at"] = datetime.now(timezone.utc).isoformat()
    _db().table("outreach_touchpoints").update(update).eq("tenant_id", _require_tid(user)).eq("id", touch_id).execute()
    return {"ok": True}
