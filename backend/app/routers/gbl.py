"""
gbl.py — 포켓몬 GO GBL 상대 대전 기록 (개인 도구, 유저 스코프).

배틀 후 상대 트레이너명 + 개체 3종 + 기술 + 턴메모를 저장하고,
다음 배틀 시작 때 이름 몇 글자로 과거 이력을 즉시 조회하기 위한 백엔드.
데이터셋(포켓몬/기술 한글명·스프라이트)은 프론트 번들 → 여기선 speciesId/moveId만 저장.
"""
from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import UserContext, get_current_user, require_admin, invalidate_revalidate_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gbl", tags=["gbl"])


def _db():
    """gbl_matches → maesil-hub(public 스키마). 미설정 시 maesil-total(agent_work) 폴백."""
    from app.db.maesil_total_client import get_maesil_hub_client, hub_configured
    client = get_maesil_hub_client()
    return client if hub_configured() else client.schema("agent_work")


def _users_db():
    """users(인증) → maesil-total (에이전시 공유)."""
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


# ── 모델 ──────────────────────────────────────────────────────────────
class TeamMon(BaseModel):
    speciesId: str | None = None       # 데이터셋 매칭 개체
    manual: str | None = None          # 목록에 없을 때 직접 입력한 이름
    fast: str | None = None            # 빠른 기술 moveId
    charged: list[str] = Field(default_factory=list)  # 차지 기술 moveId (최대 2)
    note: str | None = None            # 개체별 메모("3타에 지진" 등)


class MatchIn(BaseModel):
    opponent_name: str
    league: str = "master"
    team: list[TeamMon] = Field(default_factory=list)
    memo: str | None = None
    result: str | None = None          # 'win' | 'loss' | None
    played_at: str | None = None       # ISO, 미지정 시 서버 now


class MatchPatch(BaseModel):
    opponent_name: str | None = None
    team: list[TeamMon] | None = None
    memo: str | None = None
    result: str | None = None


# ── 라우트 ────────────────────────────────────────────────────────────
@router.get("/matches")
def list_matches(league: str | None = None,
                 user: UserContext = Depends(get_current_user)) -> list[dict]:
    """내 전체 대전 기록(최근순). 프론트에서 이름으로 즉시 필터."""
    q = (_db().table("gbl_matches").select("*")
         .eq("user_id", user.id).order("played_at", desc=True).limit(5000))
    if league:
        q = q.eq("league", league)
    try:
        return q.execute().data or []
    except Exception as e:
        logger.error("gbl list 실패 [%s]: %s", user.id, e)
        raise HTTPException(500, "기록 조회 실패")


@router.post("/matches")
def create_match(body: MatchIn, user: UserContext = Depends(get_current_user)) -> dict:
    if not body.opponent_name.strip():
        raise HTTPException(400, "상대 이름을 입력하세요.")
    row = {
        "user_id": user.id,
        "league": body.league or "master",
        "opponent_name": body.opponent_name.strip(),
        "team_json": [m.model_dump() for m in body.team],
        "memo": body.memo,
        "result": body.result,
        "played_at": body.played_at or datetime.now(timezone.utc).isoformat(),
    }
    try:
        resp = _db().table("gbl_matches").insert(row).execute()
        return (resp.data or [row])[0]
    except Exception as e:
        logger.error("gbl create 실패 [%s]: %s", user.id, e)
        raise HTTPException(500, "기록 저장 실패")


@router.patch("/matches/{match_id}")
def update_match(match_id: str, body: MatchPatch,
                 user: UserContext = Depends(get_current_user)) -> dict:
    patch: dict = {}
    if body.opponent_name is not None:
        patch["opponent_name"] = body.opponent_name.strip()
    if body.team is not None:
        patch["team_json"] = [m.model_dump() for m in body.team]
    if body.memo is not None:
        patch["memo"] = body.memo
    if body.result is not None:
        patch["result"] = body.result
    if not patch:
        raise HTTPException(400, "변경할 내용이 없습니다.")
    try:
        resp = (_db().table("gbl_matches").update(patch)
                .eq("user_id", user.id).eq("id", match_id).execute())
        if not resp.data:
            raise HTTPException(404, "기록을 찾을 수 없습니다.")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("gbl update 실패 [%s]: %s", match_id, e)
        raise HTTPException(500, "기록 수정 실패")


@router.delete("/matches/{match_id}")
def delete_match(match_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    try:
        _db().table("gbl_matches").delete().eq("user_id", user.id).eq("id", match_id).execute()
        return {"ok": True}
    except Exception as e:
        logger.error("gbl delete 실패 [%s]: %s", match_id, e)
        raise HTTPException(500, "기록 삭제 실패")


# ── 레이팅 기록 (유저 스코프, 계정별 profile — 다계정 대응) ──────────────
class RatingIn(BaseModel):
    rating: int
    league: str = "master"
    profile: str | None = None   # 본계/부계 라벨(없으면 기본)


@router.get("/ratings")
def list_ratings(league: str | None = None,
                 user: UserContext = Depends(get_current_user)) -> list[dict]:
    """내 레이팅 기록(오래된→최신). 프론트에서 계정(profile)별로 그룹핑/그래프."""
    q = (_db().table("gbl_ratings").select("*")
         .eq("user_id", user.id).order("recorded_at", desc=False).limit(2000))
    if league:
        q = q.eq("league", league)
    try:
        return q.execute().data or []
    except Exception as e:
        logger.error("gbl ratings list 실패 [%s]: %s", user.id, e)
        raise HTTPException(500, "레이팅 조회 실패")


@router.post("/ratings")
def create_rating(body: RatingIn, user: UserContext = Depends(get_current_user)) -> dict:
    if body.rating < 0 or body.rating > 6000:
        raise HTTPException(400, "레이팅 값이 올바르지 않습니다.")
    prof = (body.profile or "").strip() or None
    row = {"user_id": user.id, "league": body.league or "master", "profile": prof, "rating": body.rating}
    try:
        return (_db().table("gbl_ratings").insert(row).execute().data or [row])[0]
    except Exception as e:
        logger.error("gbl rating 저장 실패 [%s]: %s", user.id, e)
        raise HTTPException(500, "레이팅 저장 실패")


@router.delete("/ratings/{rating_id}")
def delete_rating(rating_id: str, user: UserContext = Depends(get_current_user)) -> dict:
    try:
        _db().table("gbl_ratings").delete().eq("user_id", user.id).eq("id", rating_id).execute()
        return {"ok": True}
    except Exception as e:
        logger.error("gbl rating 삭제 실패 [%s]: %s", rating_id, e)
        raise HTTPException(500, "레이팅 삭제 실패")


# ── 공개 실측 메타 (로그인 불필요, 익명 집계) ──────────────────────────
@router.get("/meta")
def public_meta(league: str = "master", days: int = 30,
                start: str | None = None, end: str | None = None) -> dict:
    """전체 유저가 만난 상대 덱/포켓몬 집계. 개인 식별정보 없음(익명).
    start/end(ISO) 주면 그 구간(시즌·커스텀), 없으면 days(최근 N일, 0=전체)."""
    db = _db()
    try:
        q = db.table("gbl_matches").select("team_json, result, played_at").eq("league", league)
        if start:
            q = q.gte("played_at", start)
        if end:
            q = q.lt("played_at", end)
        if not start and not end and days and days > 0:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            q = q.gte("played_at", since)
        rows = q.limit(20000).execute().data or []
    except Exception as e:
        logger.error("gbl meta 실패: %s", e)
        raise HTTPException(500, "메타 조회 실패")

    total = len(rows)
    wins = sum(1 for r in rows if r.get("result") == "win")
    losses = sum(1 for r in rows if r.get("result") == "loss")
    mon_count: Counter = Counter()
    deck_count: Counter = Counter()
    deck_wl: dict = {}
    for r in rows:
        ids = [t.get("speciesId") for t in (r.get("team_json") or []) if t.get("speciesId")]
        for sid in ids:
            mon_count[sid] += 1
        key = "|".join(sorted(ids)) if ids else ""
        if key:
            deck_count[key] += 1
            wl = deck_wl.setdefault(key, [0, 0])
            if r.get("result") == "win": wl[0] += 1
            elif r.get("result") == "loss": wl[1] += 1
    top_mons = [{"speciesId": s, "count": c} for s, c in mon_count.most_common(200)]
    top_decks = [{"deck": k.split("|"), "count": c,
                  "wins": deck_wl.get(k, [0, 0])[0], "losses": deck_wl.get(k, [0, 0])[1]}
                 for k, c in deck_count.most_common(200)]
    return {"league": league, "days": days, "total": total, "wins": wins, "losses": losses,
            "top_mons": top_mons, "top_decks": top_decks}


# ── 관리자(super_admin) 전용 — GBL 서비스 현황 ──────────────────────────
@router.get("/admin/stats")
def admin_stats(admin: UserContext = Depends(require_admin)) -> dict:
    """gbl 유저·기록 현황 대시보드용. super_admin 전용."""
    db = _db()
    try:
        urows = (_users_db().table("users")
                 .select("id, email, display_name, is_active, last_login_at, created_at")
                 .eq("role", "gbl").execute().data) or []
        mrows = (db.table("gbl_matches")
                 .select("id, user_id, league, created_at").execute().data) or []
    except Exception as e:
        logger.error("gbl admin stats 실패: %s", e)
        raise HTTPException(500, "현황 조회 실패")

    per_user = Counter(m["user_id"] for m in mrows if m.get("user_id"))
    by_league = Counter((m.get("league") or "master") for m in mrows)
    wk = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    users = [{
        "id": u["id"], "email": u["email"], "display_name": u.get("display_name"),
        "matches": per_user.get(u["id"], 0),
        "last_login_at": u.get("last_login_at"), "created_at": u.get("created_at"),
        "is_active": u.get("is_active", True),
    } for u in urows]
    users.sort(key=lambda x: x["matches"], reverse=True)

    return {
        "users_total": len(urows),
        "new_7d": sum(1 for u in urows if (u.get("created_at") or "") >= wk),
        "active_7d": sum(1 for u in urows if (u.get("last_login_at") or "") >= wk),
        "matches_total": len(mrows),
        "by_league": dict(by_league),
        "users": users,
    }


# ── 자체 방문 통계(1st-party analytics) ──────────────────────────
_BOT_UA = ("bot", "crawler", "spider", "slurp", "bingpreview", "facebookexternalhit",
           "embedly", "quora link preview", "yeti", "headless", "python-requests", "curl")


class TrackIn(BaseModel):
    visitor: str | None = None
    session: str | None = None
    path: str | None = None
    ref: str | None = None
    event: str | None = None  # pageview(기본) | share | download


@router.post("/track", status_code=204)
def track(body: TrackIn, request: Request):
    """방문/이벤트 1건 기록(비로그인 포함, 익명). 봇은 UA로 스킵. fire-and-forget."""
    ua = (request.headers.get("user-agent") or "").lower()
    if not ua or any(b in ua for b in _BOT_UA):
        return
    ev = (body.event or "pageview")
    if ev not in ("pageview", "share", "download"):
        ev = "pageview"
    try:
        _db().table("gbl_visits").insert({
            "event": ev,
            "visitor": (body.visitor or "")[:40] or None,
            "session": (body.session or "")[:40] or None,
            "path": (body.path or "")[:200] or None,
            "ref": (body.ref or "")[:200] or None,
        }).execute()
    except Exception as e:  # 통계 실패가 페이지를 막지 않도록
        logger.warning("gbl track 실패: %s", e)
    return


@router.get("/admin/traffic")
def admin_traffic(days: int = 30, admin: UserContext = Depends(require_admin)) -> dict:
    """방문/순방문자/세션/체류/이탈/유입 통계. super_admin 전용."""
    db = _db()
    days = max(1, min(days, 90))
    try:
        daily = db.rpc("gbl_traffic_daily", {"days": days}).execute().data or []
        summ = db.rpc("gbl_traffic_summary", {"days": days}).execute().data or []
        active = db.rpc("gbl_traffic_active", {}).execute().data or []
        paths = db.rpc("gbl_traffic_paths", {"days": 7, "lim": 15}).execute().data or []
        refs = db.rpc("gbl_traffic_refs", {"days": 7, "lim": 15}).execute().data or []
    except Exception as e:
        logger.error("gbl traffic 실패: %s", e)
        raise HTTPException(500, "트래픽 조회 실패 (SQL 068 실행 여부 확인)")
    return {
        "days": days,
        "daily": daily,
        "summary": (summ[0] if summ else {}),
        "active": (active[0] if active else {}),
        "paths": paths,
        "refs": refs,
    }


@router.get("/admin/matches")
def admin_matches(league: str | None = None, q: str | None = None,
                  admin: UserContext = Depends(require_admin)) -> list[dict]:
    """전체 유저 기록 검색(super_admin). 각 기록에 작성자(email/닉네임) 부착.
    내 기록 + 모든 gbl 유저 기록을 합쳐 상대 이름으로 통합 조회하는 용도."""
    db = _db()
    try:
        query = db.table("gbl_matches").select("*").order("played_at", desc=True).limit(3000)
        if league:
            query = query.eq("league", league)
        if q and q.strip():
            query = query.ilike("opponent_name", f"%{q.strip()}%")
        rows = query.execute().data or []
    except Exception as e:
        logger.error("gbl admin matches 실패: %s", e)
        raise HTTPException(500, "기록 조회 실패")

    uids = list({r["user_id"] for r in rows if r.get("user_id")})
    umap: dict = {}
    if uids:
        try:
            urows = _users_db().table("users").select("id, email, display_name").in_("id", uids).execute().data or []
            umap = {u["id"]: u for u in urows}
        except Exception:
            umap = {}
    for r in rows:
        u = umap.get(r.get("user_id")) or {}
        r["user_email"] = u.get("email")
        r["user_display_name"] = u.get("display_name")
    return rows


class AdminUserAction(BaseModel):
    is_active: bool


@router.patch("/admin/users/{user_id}")
def admin_set_user(user_id: str, body: AdminUserAction,
                   admin: UserContext = Depends(require_admin)) -> dict:
    """gbl 유저 활성/비활성 (남용 대응). role='gbl'만 대상 — 에이전시 계정 보호."""
    try:
        resp = (_users_db().table("users")
                .update({"is_active": body.is_active,
                         "updated_at": datetime.now(timezone.utc).isoformat()})
                .eq("id", user_id).eq("role", "gbl").execute())
    except Exception as e:
        logger.error("gbl admin user 업데이트 실패 [%s]: %s", user_id, e)
        raise HTTPException(500, "업데이트 실패")
    if not resp.data:
        raise HTTPException(404, "gbl 유저를 찾을 수 없습니다.")
    invalidate_revalidate_cache(user_id)
    return {"ok": True, "is_active": body.is_active}


@router.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: str, admin: UserContext = Depends(require_admin)) -> dict:
    """gbl 유저 영구 삭제(기록 포함). role='gbl'만 — 에이전시 계정 보호."""
    db = _db()
    try:
        urow = (_users_db().table("users").select("id, role").eq("id", user_id).limit(1).execute().data) or []
    except Exception as e:
        logger.error("gbl admin delete 조회 실패 [%s]: %s", user_id, e)
        raise HTTPException(500, "삭제 실패")
    if not urow:
        raise HTTPException(404, "유저를 찾을 수 없습니다.")
    if urow[0].get("role") != "gbl":
        raise HTTPException(403, "gbl 유저만 삭제할 수 있습니다.")
    try:
        db.table("gbl_matches").delete().eq("user_id", user_id).execute()
        _users_db().table("users").delete().eq("id", user_id).eq("role", "gbl").execute()
    except Exception as e:
        logger.error("gbl admin delete 실패 [%s]: %s", user_id, e)
        raise HTTPException(500, "삭제 실패")
    invalidate_revalidate_cache(user_id)
    return {"ok": True}


# ── DB 이전(maesil-total → maesil-hub) 유틸 ─────────────────────────────
def _total_matches_db():
    """소스: maesil-total agent_work.gbl_matches (이전용)."""
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


@router.get("/admin/db-status")
def admin_db_status(admin: UserContext = Depends(require_admin)) -> dict:
    """양쪽 DB의 gbl_matches 건수 조회."""
    from app.db.maesil_total_client import hub_configured
    def _count(tbl):
        try:
            return tbl.table("gbl_matches").select("id", count="exact").limit(1).execute().count or 0
        except Exception:
            return None
    return {
        "hub_configured": hub_configured(),
        "maesil_total": _count(_total_matches_db()),
        "maesil_hub": _count(_db()),
    }


@router.post("/admin/migrate-to-hub")
def admin_migrate_to_hub(admin: UserContext = Depends(require_admin)) -> dict:
    """maesil-total의 gbl_matches를 maesil-hub로 복사(id 유지, 재실행 안전)."""
    from app.db.maesil_total_client import hub_configured
    if not hub_configured():
        raise HTTPException(400, "maesil-hub 미설정 — 옮길 대상 없음")
    try:
        rows = _total_matches_db().table("gbl_matches").select("*").limit(50000).execute().data or []
    except Exception as e:
        logger.error("gbl migrate 소스조회 실패: %s", e)
        raise HTTPException(500, "소스(maesil-total) 조회 실패")
    if not rows:
        return {"copied": 0, "source": 0, "message": "이전할 데이터 없음"}
    dest = _db()
    copied = 0
    try:
        for i in range(0, len(rows), 100):
            resp = dest.table("gbl_matches").upsert(rows[i:i + 100], on_conflict="id").execute()
            copied += len(resp.data or [])
    except Exception as e:
        logger.error("gbl migrate 삽입 실패: %s", e)
        raise HTTPException(500, f"hub 삽입 실패: {e}")
    return {"copied": copied, "source": len(rows)}
