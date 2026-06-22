"""브랜드 관리 API.

GET    /api/brand/profiles              — 브랜드 목록
POST   /api/brand/profiles              — 브랜드 등록
PATCH  /api/brand/profiles/{id}         — 수정
DELETE /api/brand/profiles/{id}         — 삭제
POST   /api/brand/profiles/{id}/discover — 현지어 바이어 발굴 실행
GET    /api/brand/profiles/{id}/keywords — 키워드 번역 목록
GET    /api/brand/profiles/{id}/results  — 발굴 결과 (한/현지어)
POST   /api/brand/results/{id}/save-to-buyers — buyer_leads로 복사
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import UserContext, get_current_user, require_admin
from app.services.brand_discovery import COUNTRY_LANG

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/brand", tags=["brand"])


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _require_admin(user: UserContext = Depends(get_current_user)) -> UserContext:
    require_admin(user)
    return user


def _anthropic_key() -> str:
    from app.services.secrets import get_secret
    return get_secret("anthropic_api_key") or ""


# ── 브랜드 프로필 CRUD ────────────────────────────────────────────────────────

@router.get("/profiles")
def list_profiles(user: UserContext = Depends(_require_admin)) -> list[dict]:
    return _db().table("brand_profiles").select("*").order("created_at", desc=True).execute().data or []


class ProfileCreate(BaseModel):
    company_name: str
    brand_name: str | None = None
    product_categories: list[str] = []
    description: str | None = None
    target_countries: list[str] = []


@router.post("/profiles", status_code=201)
def create_profile(body: ProfileCreate, user: UserContext = Depends(_require_admin)) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    row = {**body.model_dump(), "is_active": True, "created_at": now, "updated_at": now}
    resp = _db().table("brand_profiles").insert(row).execute()
    return (resp.data or [{}])[0]


@router.patch("/profiles/{profile_id}")
def patch_profile(profile_id: str, body: ProfileCreate,
                  user: UserContext = Depends(_require_admin)) -> dict:
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    _db().table("brand_profiles").update(upd).eq("id", profile_id).execute()
    return {"ok": True}


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: str, user: UserContext = Depends(_require_admin)) -> None:
    _db().table("brand_profiles").delete().eq("id", profile_id).execute()


# ── 발굴 실행 ─────────────────────────────────────────────────────────────────

_running: dict[str, bool] = {}  # brand_id → 실행중 여부


@router.post("/profiles/{profile_id}/discover")
def run_discover(profile_id: str, user: UserContext = Depends(_require_admin)) -> dict:
    """현지어 키워드 번역 → 국가별 바이어 발굴 → 한글 번역 정리."""
    if _running.get(profile_id):
        return {"status": "already_running", "message": "이미 발굴 실행 중입니다"}

    key = _anthropic_key()
    if not key:
        raise HTTPException(400, "anthropic_api_key 미설정 (Settings에서 등록)")

    result_holder: dict = {}
    _running[profile_id] = True

    def run():
        from app.services.brand_discovery import run_brand_discovery
        try:
            result_holder.update(run_brand_discovery(profile_id, key))
        except Exception as e:
            result_holder["error"] = str(e)
            logger.error("[brand_discover] %s", e)
        finally:
            _running.pop(profile_id, None)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout=300)  # 최대 5분

    return result_holder if result_holder else {"status": "running", "message": "백그라운드 발굴 중"}


# ── 키워드 번역 목록 ──────────────────────────────────────────────────────────

@router.get("/profiles/{profile_id}/keywords")
def list_keywords(profile_id: str, user: UserContext = Depends(_require_admin)) -> list[dict]:
    return (_db().table("brand_keywords")
            .select("*").eq("brand_id", profile_id)
            .order("country").execute().data or [])


# ── 발굴 결과 ─────────────────────────────────────────────────────────────────

@router.get("/profiles/{profile_id}/results")
def list_results(
    profile_id: str,
    country: str | None = None,
    limit: int = Query(200, le=500),
    user: UserContext = Depends(_require_admin),
) -> dict:
    q = (_db().table("brand_discovery_results")
         .select("*").eq("brand_id", profile_id).order("created_at", desc=True))
    if country:
        q = q.eq("country", country)
    rows = q.limit(limit).execute().data or []

    # 국가별 집계
    by_country: dict[str, int] = {}
    for r in rows:
        c = r.get("country", "Unknown")
        by_country[c] = by_country.get(c, 0) + 1

    return {"rows": rows, "total": len(rows), "by_country": by_country}


# ── 결과 → buyer_leads 저장 ──────────────────────────────────────────────────

@router.post("/results/{result_id}/save-to-buyers")
def save_to_buyers(result_id: str, user: UserContext = Depends(_require_admin)) -> dict:
    rows = (_db().table("brand_discovery_results")
            .select("*").eq("id", result_id).limit(1).execute().data or [])
    if not rows:
        raise HTTPException(404, "결과 없음")
    r = rows[0]

    now = datetime.now(timezone.utc).isoformat()
    _db().table("buyer_leads").insert({
        "company_name": r.get("company_name_ko") or r.get("company_name"),
        "country": r.get("country"),
        "contact_email": r.get("contact_email"),
        "contact_name": r.get("contact_name_ko") or r.get("contact_name"),
        "industry": "Import/Distribution",
        "product_interest": r.get("product_interest_ko") or r.get("product_interest"),
        "source": f"brand:{r.get('source', '')}",
        "status": "discovered",
        "notes": f"원문: {r.get('company_name')} ({r.get('language', '')})",
        "created_at": now, "updated_at": now,
    }).execute()

    _db().table("brand_discovery_results").update({"saved_to_buyers": True}).eq("id", result_id).execute()
    return {"ok": True}


@router.post("/profiles/{profile_id}/results/save-all")
def save_all_to_buyers(profile_id: str, country: str | None = None,
                       user: UserContext = Depends(_require_admin)) -> dict:
    """발굴 결과 전체(또는 특정 국가) → buyer_leads에 일괄 저장."""
    q = (_db().table("brand_discovery_results")
         .select("*").eq("brand_id", profile_id).eq("saved_to_buyers", False))
    if country:
        q = q.eq("country", country)
    rows = q.execute().data or []

    now = datetime.now(timezone.utc).isoformat()
    saved = 0
    for r in rows:
        try:
            _db().table("buyer_leads").insert({
                "company_name": r.get("company_name_ko") or r.get("company_name"),
                "country": r.get("country"),
                "contact_email": r.get("contact_email"),
                "product_interest": r.get("product_interest_ko") or r.get("product_interest"),
                "source": f"brand:{r.get('source', '')}",
                "status": "discovered",
                "notes": f"원문: {r.get('company_name')} ({r.get('language', '')})",
                "created_at": now, "updated_at": now,
            }).execute()
            _db().table("brand_discovery_results").update({"saved_to_buyers": True}).eq("id", r["id"]).execute()
            saved += 1
        except Exception:
            pass
    return {"saved": saved}


# ── 지원 국가/언어 목록 ───────────────────────────────────────────────────────

@router.get("/languages")
def list_languages(user: UserContext = Depends(_require_admin)) -> list[dict]:
    return [{"country": c, **v} for c, v in COUNTRY_LANG.items()]
