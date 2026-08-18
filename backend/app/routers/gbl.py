"""
gbl.py — 포켓몬 GO GBL 상대 대전 기록 (개인 도구, 유저 스코프).

배틀 후 상대 트레이너명 + 개체 3종 + 기술 + 턴메모를 저장하고,
다음 배틀 시작 때 이름 몇 글자로 과거 이력을 즉시 조회하기 위한 백엔드.
데이터셋(포켓몬/기술 한글명·스프라이트)은 프론트 번들 → 여기선 speciesId/moveId만 저장.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import UserContext, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gbl", tags=["gbl"])


def _db():
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
