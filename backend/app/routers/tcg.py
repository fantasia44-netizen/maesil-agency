"""TCG Note(tcgnote.net) 자체 트래픽·도구사용 계측 — gbl과 분리된 1st-party 분석.

프론트 lib/track.ts(site="tcg") → POST /api/tcg/track → public.tcg_visits 저장.
관리자 대시보드(/tcg-admin)가 GET /api/tcg/admin/traffic 로 집계 조회.
gbl은 Postgres RPC 함수로 집계하지만, tcg는 신규·저트래픽이라 Python 집계로 단순화(테이블 하나·SQL 077만).
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import UserContext, require_admin
from app.services.ratelimit import rate_limit as _rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tcg", tags=["tcg"])

# 도구사용 이벤트(tcg 특화) — "계산기를 실제로 쓴다"는 신호(pageview·share·download에 더해).
_TOOL_EVENTS = ("sim_run", "pack_open", "deck_build", "counter_search")
_EVENTS = ("pageview", "share", "download") + _TOOL_EVENTS

_LOCALES = ("en", "ja", "zh-TW")

_BOT_UA = ("bot", "crawler", "spider", "slurp", "bingpreview", "facebookexternalhit",
           "embedly", "quora link preview", "yeti", "headless", "python-requests", "curl")


def _db():
    """gbl과 동일 — maesil-hub(public) 우선, 미설정 시 maesil-total(agent_work) 폴백."""
    from app.db.maesil_total_client import get_maesil_hub_client, hub_configured
    client = get_maesil_hub_client()
    return client if hub_configured() else client.schema("agent_work")


# ── 경로 → 언어·페이지유형 (로케일 프리픽스 파싱) ──────────────────────────
def _lang_of(path: str) -> str:
    p = path or "/"
    for lc in _LOCALES:
        if p == f"/{lc}" or p.startswith(f"/{lc}/"):
            return lc
    return "ko"


def _strip_locale(path: str) -> str:
    p = path or "/"
    for lc in _LOCALES:
        if p == f"/{lc}":
            return "/"
        if p.startswith(f"/{lc}/"):
            return p[len(lc) + 1:]
    return p


def _page_type(path: str) -> str:
    p = (_strip_locale(path or "/").rstrip("/") or "/")
    if p in ("/", "/tcg"):
        return "home"
    seg = p[len("/tcg"):] if p.startswith("/tcg") else p
    seg = seg.lstrip("/")
    if seg == "decks":
        return "decks"
    if seg.startswith("decks/"):
        return "deck-detail"
    if seg == "guides":
        return "guides"
    if seg.startswith("guides/"):
        return "guide"
    if seg.startswith("cards"):
        return "cards"
    for k in ("tier", "meta", "hand-sim", "pack-sim", "deck-builder", "counters"):
        if seg == k:
            return k
    return "other"


def _parse_ts(v) -> datetime | None:
    if not v:
        return None
    try:
        s = str(v).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


# ── 비콘 수집 ────────────────────────────────────────────────────────────
class TrackIn(BaseModel):
    visitor: str | None = None
    session: str | None = None
    path: str | None = None
    ref: str | None = None
    event: str | None = None  # pageview(기본) | share | download | sim_run | pack_open | deck_build | counter_search
    label: str | None = None


@router.post("/track", status_code=204)
def track(body: TrackIn, request: Request):
    """방문/도구사용 1건 기록(비로그인·익명). 봇은 UA로 스킵. fire-and-forget."""
    ua = (request.headers.get("user-agent") or "").lower()
    if not ua or any(b in ua for b in _BOT_UA):
        return
    try:  # 과다 삽입(스팸/봇) 방지 — 초과 시 조용히 드롭
        _rate_limit(request, "tcg_track", limit=120, window=60)
    except HTTPException:
        return
    ev = body.event or "pageview"
    if ev not in _EVENTS:
        ev = "pageview"
    try:
        _db().table("tcg_visits").insert({
            "event": ev,
            "visitor": (body.visitor or "")[:40] or None,
            "session": (body.session or "")[:40] or None,
            "path": (body.path or "")[:200] or None,
            "ref": (body.ref or "")[:200] or None,
            "label": (body.label or "")[:60] or None,
        }).execute()
    except Exception as e:  # 통계 실패가 페이지를 막지 않도록
        logger.warning("tcg track 실패: %s", e)
    return


# ── 집계(관리자) ─────────────────────────────────────────────────────────
def _aggregate(rows: list[dict], days: int) -> dict:
    now = datetime.now(timezone.utc)
    active_cut = now - timedelta(minutes=30)

    daily_pv: dict[str, int] = defaultdict(int)
    daily_vis: dict[str, set] = defaultdict(set)
    daily_sess: dict[str, set] = defaultdict(set)
    lang_pv: dict[str, int] = defaultdict(int)
    lang_vis: dict[str, set] = defaultdict(set)
    lang_sess: dict[str, set] = defaultdict(set)
    page_pv: dict[str, int] = defaultdict(int)
    page_vis: dict[str, set] = defaultdict(set)
    paths = Counter()
    refs = Counter()
    tools: dict[str, int] = defaultdict(int)
    share_c: dict[str, int] = defaultdict(int)
    dl_c: dict[str, int] = defaultdict(int)

    all_visitors: set = set()
    all_sessions: set = set()
    active_visitors: set = set()
    total_pv = 0

    for r in rows:
        ev = r.get("event") or "pageview"
        vis = r.get("visitor")
        sess = r.get("session")
        day = str(r.get("day") or "")
        path = r.get("path") or "/"
        if vis:
            all_visitors.add(vis)
        if sess:
            all_sessions.add(sess)
        ts = _parse_ts(r.get("created_at"))
        if ts and ts >= active_cut and vis:
            active_visitors.add(vis)

        if ev == "pageview":
            total_pv += 1
            lang = _lang_of(path)
            pt = _page_type(path)
            if day:
                daily_pv[day] += 1
                if vis:
                    daily_vis[day].add(vis)
                if sess:
                    daily_sess[day].add(sess)
            lang_pv[lang] += 1
            if vis:
                lang_vis[lang].add(vis)
            if sess:
                lang_sess[lang].add(sess)
            page_pv[pt] += 1
            if vis:
                page_vis[pt].add(vis)
            paths[path] += 1
            ref = r.get("ref")
            if ref:
                refs[ref] += 1
        elif ev in _TOOL_EVENTS:
            tools[ev] += 1
        elif ev == "share":
            share_c[r.get("label") or "(기타)"] += 1
        elif ev == "download":
            dl_c[r.get("label") or "(기타)"] += 1

    daily = [{
        "day": d,
        "pageviews": daily_pv[d],
        "uniques": len(daily_vis[d]),
        "sessions": len(daily_sess[d]),
    } for d in sorted(daily_pv.keys())]

    langs = [{
        "lang": lg,
        "pageviews": lang_pv[lg],
        "uniques": len(lang_vis[lg]),
        "sessions": len(lang_sess[lg]),
    } for lg in sorted(lang_pv, key=lambda x: -lang_pv[x])]

    pages = [{
        "type": pt,
        "pageviews": page_pv[pt],
        "uniques": len(page_vis[pt]),
    } for pt in sorted(page_pv, key=lambda x: -page_pv[x])]

    tool_rows = [{"event": e, "count": tools.get(e, 0)} for e in _TOOL_EVENTS]

    labels = set(share_c) | set(dl_c)
    shares = sorted(
        [{"label": lb, "shares": share_c.get(lb, 0), "downloads": dl_c.get(lb, 0),
          "total": share_c.get(lb, 0) + dl_c.get(lb, 0)} for lb in labels],
        key=lambda x: -x["total"],
    )

    return {
        "days": days,
        "summary": {
            "pageviews": total_pv,
            "uniques": len(all_visitors),
            "sessions": len(all_sessions),
            "shares": sum(share_c.values()),
            "downloads": sum(dl_c.values()),
            "tool_events": sum(tools.values()),
        },
        "active": {"active_30m": len(active_visitors)},
        "daily": daily,
        "langs": langs,
        "pages": pages,
        "tools": tool_rows,
        "paths": [{"path": p, "views": c} for p, c in paths.most_common(300)],
        "refs": [{"ref": r, "views": c} for r, c in refs.most_common(100)],
        "shares": shares,
    }


def _fetch_window(db, days: int) -> list[dict]:
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    return (db.table("tcg_visits")
            .select("event,visitor,session,path,ref,label,day,created_at")
            .gte("day", cutoff)
            .order("created_at", desc=True)
            .limit(50000).execute().data) or []


@router.get("/admin/traffic")
def admin_traffic(days: int = 30, admin: UserContext = Depends(require_admin)) -> dict:
    """방문·순방문자·세션·언어별·페이지유형별·도구사용 통계. super_admin 전용."""
    days = max(1, min(days, 90))
    try:
        rows = _fetch_window(_db(), days)
    except Exception as e:
        logger.error("tcg traffic 조회 실패: %s", e)
        raise HTTPException(500, "트래픽 조회 실패 (SQL 077_tcg_visits 실행 여부 확인)")
    return _aggregate(rows, days)


@router.get("/admin/traffic/export")
def admin_traffic_export(days: int = 30, admin: UserContext = Depends(require_admin)):
    """트래픽·도구사용 상세를 멀티시트 XLSX로. super_admin 전용."""
    import io
    from fastapi.responses import Response
    from openpyxl import Workbook

    days = max(1, min(days, 90))
    try:
        agg = _aggregate(_fetch_window(_db(), days), days)
    except Exception as e:
        logger.error("tcg traffic export 실패: %s", e)
        raise HTTPException(500, "export 실패 (SQL 077 실행 여부 확인)")

    wb = Workbook()
    ws = wb.active
    ws.title = "요약"
    ws.append(["항목", "값"])
    for k, v in agg["summary"].items():
        ws.append([k, v])
    ws.append(["실시간 활성(30분)", agg["active"]["active_30m"]])

    def add_sheet(title, rows, cols):
        s = wb.create_sheet(title)
        s.append(cols)
        for r in rows:
            s.append([r.get(c) for c in cols])

    add_sheet("일별", agg["daily"], ["day", "pageviews", "uniques", "sessions"])
    add_sheet("언어별", agg["langs"], ["lang", "pageviews", "uniques", "sessions"])
    add_sheet("페이지유형", agg["pages"], ["type", "pageviews", "uniques"])
    add_sheet("도구사용", agg["tools"], ["event", "count"])
    add_sheet("페이지", agg["paths"], ["path", "views"])
    add_sheet("유입경로", agg["refs"], ["ref", "views"])
    add_sheet("공유·다운로드", agg["shares"], ["label", "shares", "downloads", "total"])

    buf = io.BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="tcg-traffic-{days}d.xlsx"'},
    )
