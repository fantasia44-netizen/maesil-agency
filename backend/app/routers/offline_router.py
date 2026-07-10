"""오프라인 B2B 영업 파이프라인 API — super_admin 전용.

GET    /api/offline/leads                 — 리드 목록 (stage/검색 필터)
POST   /api/offline/leads                 — 리드 추가
PATCH  /api/offline/leads/{id}            — 리드 수정 (단계·다음액션·체험일 등)
DELETE /api/offline/leads/{id}            — 리드 삭제
GET    /api/offline/leads/{id}/activities — 활동 이력
POST   /api/offline/leads/{id}/activities — 활동 기록 (last_contact_at 자동 갱신)
GET    /api/offline/summary               — 단계별 카운트 + 임박/초과 알림 목록
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/offline", tags=["offline"])

STAGES = ["contacted", "meeting", "trial", "coaching", "subscribed", "partner", "stalled", "churned"]
ACTIVITY_KINDS = {"visit", "call", "kakao", "coaching", "meeting", "note"}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


# ── 리드 CRUD ─────────────────────────────────────────────────────────

@router.get("/leads")
def list_leads(
    stage: Optional[str] = None,
    q: Optional[str] = None,
    user: UserContext = Depends(_require_admin),
) -> list[dict]:
    query = _db().table("offline_leads").select("*").order("updated_at", desc=True)
    if stage:
        query = query.eq("stage", stage)
    if q:
        query = query.ilike("company_name", f"%{q}%")
    return query.limit(500).execute().data or []


class LeadCreate(BaseModel):
    company_name: str
    industry: Optional[str] = None
    stage: str = "contacted"
    owner_engagement: Optional[str] = None
    has_dedicated_staff: Optional[bool] = None
    staff_capability: Optional[str] = None
    trial_started_at: Optional[str] = None
    trial_ends_at: Optional[str] = None
    coaching_cadence_days: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    last_contact_at: Optional[str] = None
    notes: Optional[str] = None


@router.post("/leads")
def create_lead(body: LeadCreate, user: UserContext = Depends(_require_admin)) -> dict:
    if body.stage not in STAGES:
        raise HTTPException(400, f"stage는 {STAGES} 중 하나")
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        resp = _db().table("offline_leads").insert(payload).execute()
    except Exception as e:
        if "duplicate" in str(e).lower() or "23505" in str(e):
            raise HTTPException(409, "이미 등록된 업체명입니다.")
        raise HTTPException(500, f"리드 생성 실패: {e}")
    return (resp.data or [{}])[0]


class LeadPatch(BaseModel):
    industry: Optional[str] = None
    stage: Optional[str] = None
    owner_engagement: Optional[str] = None
    has_dedicated_staff: Optional[bool] = None
    staff_capability: Optional[str] = None
    trial_started_at: Optional[str] = None
    trial_ends_at: Optional[str] = None
    subscribed_at: Optional[str] = None
    coaching_cadence_days: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    last_contact_at: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/leads/{lead_id}")
def update_lead(lead_id: str, body: LeadPatch, user: UserContext = Depends(_require_admin)) -> dict:
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "수정할 필드가 없습니다.")
    if "stage" in update and update["stage"] not in STAGES:
        raise HTTPException(400, f"stage는 {STAGES} 중 하나")
    # 유료전환 시 subscribed_at 자동 스탬프
    if update.get("stage") == "subscribed" and "subscribed_at" not in update:
        update["subscribed_at"] = date.today().isoformat()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = _db().table("offline_leads").update(update).eq("id", lead_id).execute()
    if not resp.data:
        raise HTTPException(404, "리드를 찾을 수 없습니다.")
    return resp.data[0]


@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: str, user: UserContext = Depends(_require_admin)) -> dict:
    _db().table("offline_leads").delete().eq("id", lead_id).execute()
    return {"ok": True}


# ── 활동 이력 ─────────────────────────────────────────────────────────

@router.get("/leads/{lead_id}/activities")
def list_activities(lead_id: str, user: UserContext = Depends(_require_admin)) -> list[dict]:
    return (_db().table("offline_activities").select("*")
            .eq("lead_id", lead_id)
            .order("happened_at", desc=True).order("created_at", desc=True)
            .limit(200).execute().data) or []


class ActivityCreate(BaseModel):
    kind: str = "note"
    summary: str
    happened_at: Optional[str] = None  # YYYY-MM-DD, 기본 오늘


@router.post("/leads/{lead_id}/activities")
def add_activity(lead_id: str, body: ActivityCreate, user: UserContext = Depends(_require_admin)) -> dict:
    if body.kind not in ACTIVITY_KINDS:
        raise HTTPException(400, f"kind는 {sorted(ACTIVITY_KINDS)} 중 하나")
    happened = body.happened_at or date.today().isoformat()
    resp = _db().table("offline_activities").insert({
        "lead_id": lead_id, "kind": body.kind,
        "summary": body.summary, "happened_at": happened,
    }).execute()
    # 접촉성 활동이면 last_contact_at 자동 갱신 (코칭주기·정체 알림의 기준일)
    if body.kind in ("visit", "call", "kakao", "coaching", "meeting"):
        try:
            cur = (_db().table("offline_leads").select("last_contact_at")
                   .eq("id", lead_id).limit(1).execute().data) or [{}]
            prev = cur[0].get("last_contact_at")
            if not prev or prev < happened:
                _db().table("offline_leads").update({
                    "last_contact_at": happened,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", lead_id).execute()
        except Exception as e:
            logger.warning("[offline] last_contact_at 갱신 실패 [%s]: %s", lead_id, e)
    return (resp.data or [{}])[0]


# ── 요약 ─────────────────────────────────────────────────────────────

@router.get("/summary")
def summary(user: UserContext = Depends(_require_admin)) -> dict:
    rows = (_db().table("offline_leads")
            .select("id, company_name, stage, trial_ends_at, next_action, next_action_due, last_contact_at")
            .execute().data) or []
    today = date.today().isoformat()
    by_stage: dict = {}
    for r in rows:
        by_stage[r["stage"]] = by_stage.get(r["stage"], 0) + 1
    attention = []
    for r in rows:
        if r["stage"] in ("subscribed", "churned"):
            continue
        if r.get("trial_ends_at") and r["stage"] == "trial" and r["trial_ends_at"] <= today:
            attention.append({**r, "reason": "체험 만료"})
        elif r.get("next_action_due") and r["next_action_due"] < today:
            attention.append({**r, "reason": "액션 기한 초과"})
    return {"total": len(rows), "by_stage": by_stage, "attention": attention}
