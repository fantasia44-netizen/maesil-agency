"""TCG Note(tcgnote.net) 자체 트래픽·도구사용 계측 — gbl과 분리된 1st-party 분석.

프론트 lib/track.ts(site="tcg") → POST /api/tcg/track → public.tcg_visits 저장.
관리자 대시보드(/tcg-admin)가 GET /api/tcg/admin/traffic 로 집계 조회.
gbl은 Postgres RPC 함수로 집계하지만, tcg는 신규·저트래픽이라 Python 집계로 단순화(테이블 하나·SQL 077만).
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")  # 일별 집계·"오늘" 기준 — gbl(SQL 068)과 동일하게 한국시간

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth import UserContext, require_admin
from app.services.ratelimit import rate_limit as _rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tcg", tags=["tcg"])

# 도구사용 이벤트(tcg 특화) — "계산기를 실제로 쓴다"는 신호(pageview·share·download에 더해).
_TOOL_EVENTS = ("sim_run", "pack_open", "deck_build", "counter_search")
_APP_EVENTS = ("install", "installable")  # PWA 설치 지표(gbl과 동일): installable=설치가능 노출(분모), install=설치 완료(분자)
_EVENTS = ("pageview", "share", "download") + _TOOL_EVENTS + _APP_EVENTS

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


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)  # created_at 파싱 실패 시 정렬용 기본값


def _ref_rows(sess_first: dict, sess_pv: Counter, sess_vis: dict) -> list[dict]:
    """유입 경로(방문자 기준) — 세션의 첫 페이지뷰 리퍼러로 귀속.
    visitors=그 경로로 들어온 고유 방문자, views=그 세션들이 본 전체 페이지뷰(gbl SQL 080과 동일 정의)."""
    ref_vis: dict[str, set] = defaultdict(set)
    ref_views: Counter = Counter()
    for sk, (_, ref) in sess_first.items():
        ref_vis[ref].add(sess_vis.get(sk) or sk)
        ref_views[ref] += sess_pv[sk]
    rows = [{"ref": r, "visitors": len(v), "views": ref_views[r]} for r, v in ref_vis.items()]
    rows.sort(key=lambda x: (-x["visitors"], -x["views"]))
    return rows[:100]


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
# gbl-admin(SQL 068)과 같은 지표 정의를 Python으로 재현:
#  신규방문자 = 그날(KST) 처음 방문한 사람(전 기간 첫 방문일 기준) / 재방문 = 전체 − 신규
#  평균 체류 = 세션별 (마지막 이벤트 − 첫 이벤트) 초 평균 / 이탈률 = 페이지뷰 1회 세션 비율
#  일별 = 기간 내 모든 날짜를 0으로 채워 연속(차트 축 정렬).
def _kst_day(ts: datetime | None) -> str:
    return ts.astimezone(KST).date().isoformat() if ts else ""


def _aggregate(rows: list[dict], days: int, first_seen: dict[str, str] | None = None) -> dict:
    now = datetime.now(timezone.utc)
    active_cut = now - timedelta(minutes=30)
    first_seen = first_seen or {}
    today_kst = now.astimezone(KST).date()
    cutoff_day = (today_kst - timedelta(days=days)).isoformat()

    daily_pv: dict[str, int] = defaultdict(int)
    daily_vis: dict[str, set] = defaultdict(set)
    daily_new: dict[str, set] = defaultdict(set)
    daily_sess: dict[str, set] = defaultdict(set)
    sess_cnt: dict[str, int] = defaultdict(int)
    # 체류시간용 세션 시작·끝 시각. ⚠️ 아래 유입경로용 sess_first(세션키→(시각,리퍼러) 튜플)와 이름이 겹치면
    #    datetime과 튜플이 한 dict에 섞여 TypeError → /admin/traffic 500 (2026-09-18 장애). 반드시 별도 이름 유지.
    dwell_start: dict[str, datetime] = {}
    dwell_end: dict[str, datetime] = {}
    lang_pv: dict[str, int] = defaultdict(int)
    lang_vis: dict[str, set] = defaultdict(set)
    lang_sess: dict[str, set] = defaultdict(set)
    page_pv: dict[str, int] = defaultdict(int)
    page_vis: dict[str, set] = defaultdict(set)
    paths = Counter()
    # 유입 경로(방문자 기준) 집계용 — 세션키 → (첫 페이지뷰 시각, 그 리퍼러) / 페이지뷰 수 / 방문자
    sess_first: dict = {}
    sess_pv: Counter = Counter()
    sess_vis: dict = {}
    tools: dict[str, int] = defaultdict(int)
    share_c: dict[str, int] = defaultdict(int)
    dl_c: dict[str, int] = defaultdict(int)
    # 앱 지표(gbl _app_metrics와 동일 의미): 설치 완료·설치가능 노출·설치앱 실행 뷰(ref="(앱)")·순수 직접 뷰(ref 없음)
    app = {"installs": 0, "installable": 0, "app_pageviews": 0, "direct_pageviews": 0}

    all_visitors: set = set()
    all_sessions: set = set()
    active_visitors: set = set()
    total_pv = 0

    for r in rows:
        ev = r.get("event") or "pageview"
        vis = r.get("visitor")
        sess = r.get("session")
        ts = _parse_ts(r.get("created_at"))
        day = _kst_day(ts) or str(r.get("day") or "")
        if day and day < cutoff_day:
            continue  # KST 기준 기간 밖(UTC로 넉넉히 가져온 뒤 여기서 자름)
        path = r.get("path") or "/"
        if vis:
            all_visitors.add(vis)
        if sess:
            all_sessions.add(sess)
        if ts and ts >= active_cut and vis:
            active_visitors.add(vis)

        if ev == "pageview":
            total_pv += 1
            lang = _lang_of(path)
            pt = _page_type(path)
            if sess:
                sess_cnt[sess] += 1
                if ts:
                    if sess not in dwell_start or ts < dwell_start[sess]:
                        dwell_start[sess] = ts
                    if sess not in dwell_end or ts > dwell_end[sess]:
                        dwell_end[sess] = ts
            if day:
                daily_pv[day] += 1
                if vis:
                    daily_vis[day].add(vis)
                    if first_seen.get(vis, day) == day:
                        daily_new[day].add(vis)
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
            # 유입 경로 = 세션의 첫 페이지뷰 리퍼러(방문자 기준). 사이트 내 이동(ref 빈값)이 '직접'으로 부풀지 않게 세션 단위로 귀속.
            sk = sess or vis or f"row{total_pv}"
            sess_pv[sk] += 1
            if vis:
                sess_vis[sk] = vis
            tkey = ts or _EPOCH
            if sk not in sess_first or tkey < sess_first[sk][0]:
                sess_first[sk] = (tkey, ref or "(직접)")
            if ref == "(앱)":
                app["app_pageviews"] += 1
            elif not ref:
                app["direct_pageviews"] += 1
        elif ev == "install":
            app["installs"] += 1
        elif ev == "installable":
            app["installable"] += 1
        elif ev in _TOOL_EVENTS:
            tools[ev] += 1
        elif ev == "share":
            share_c[r.get("label") or "(기타)"] += 1
        elif ev == "download":
            dl_c[r.get("label") or "(기타)"] += 1

    # 기간 내 모든 날짜(KST)를 채움 — 방문 없는 날은 0
    span = [(today_kst - timedelta(days=i)).isoformat() for i in range(days, -1, -1)]
    daily = [{
        "day": d,
        "pageviews": daily_pv.get(d, 0),
        "uniques": len(daily_vis.get(d, ())),
        "new_visitors": len(daily_new.get(d, ())),
        "sessions": len(daily_sess.get(d, ())),
    } for d in span]

    # 세션 체류·이탈 — 페이지뷰 1회 세션은 체류 0초(gbl SQL과 동일 정의)
    durs = [(dwell_end[s] - dwell_start[s]).total_seconds() for s in sess_cnt if s in dwell_start and s in dwell_end]
    avg_dwell = round(sum(durs) / len(durs), 1) if durs else 0
    bounce_rate = round(sum(1 for s in sess_cnt if sess_cnt[s] == 1) / len(sess_cnt), 4) if sess_cnt else 0
    new_total = sum(1 for v in all_visitors if first_seen.get(v, cutoff_day) >= cutoff_day)

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
            "new_visitors": new_total,
            "returning_visitors": max(0, len(all_visitors) - new_total),
            "sessions": len(all_sessions),
            "avg_dwell": avg_dwell,
            "bounce_rate": bounce_rate,
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
        "refs": _ref_rows(sess_first, sess_pv, sess_vis),
        "app": app,
        "shares": shares,
    }


def _fetch_window(db, days: int) -> list[dict]:
    # KST 자정 기준 컷오프(UTC 하루 여유는 _aggregate에서 KST로 다시 자름). days=0 → 오늘(KST)
    cutoff_kst = datetime.combine(datetime.now(KST).date() - timedelta(days=days), datetime.min.time(), tzinfo=KST)
    return (db.table("tcg_visits")
            .select("event,visitor,session,path,ref,label,day,created_at")
            .gte("created_at", cutoff_kst.astimezone(timezone.utc).isoformat())
            .order("created_at", desc=True)
            .limit(50000).execute().data) or []


def _first_seen(db) -> dict[str, str]:
    """방문자별 첫 방문일(KST) — 신규/재방문 판정용. 저트래픽이라 전 기간 스캔(visitor·created_at만)."""
    rows = (db.table("tcg_visits").select("visitor,created_at")
            .eq("event", "pageview").not_.is_("visitor", "null")
            .order("created_at").limit(50000).execute().data) or []
    out: dict[str, str] = {}
    for r in rows:
        v = r.get("visitor")
        if v and v not in out:
            out[v] = _kst_day(_parse_ts(r.get("created_at")))
    return out


def _load(days: int) -> dict:
    days = max(0, min(days, 90))
    db = _db()
    rows = _fetch_window(db, days)
    try:
        fs = _first_seen(db)
    except Exception as e:
        logger.warning("tcg first_seen 실패(신규/재방문 0 처리): %s", e)
        fs = {}
    return _aggregate(rows, days, fs)


@router.get("/admin/traffic")
def admin_traffic(days: int = 30, admin: UserContext = Depends(require_admin)) -> dict:
    """방문·순방문자·신규/재방문·세션·체류·이탈·언어별·페이지유형별·도구사용 통계. super_admin 전용. days=0 → 오늘."""
    try:
        return _load(days)
    except Exception as e:
        logger.error("tcg traffic 조회 실패: %s", e)
        raise HTTPException(500, "트래픽 조회 실패 (SQL 077_tcg_visits 실행 여부 확인)")


@router.get("/admin/traffic/export")
def admin_traffic_export(days: int = 30, admin: UserContext = Depends(require_admin)):
    """트래픽·도구사용 상세를 멀티시트 XLSX로. super_admin 전용."""
    import io
    from fastapi.responses import Response
    from openpyxl import Workbook

    days = max(0, min(days, 90))
    try:
        agg = _load(days)
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

    add_sheet("일별", agg["daily"], ["day", "pageviews", "uniques", "new_visitors", "sessions"])
    add_sheet("언어별", agg["langs"], ["lang", "pageviews", "uniques", "sessions"])
    add_sheet("페이지유형", agg["pages"], ["type", "pageviews", "uniques"])
    _app = agg.get("app") or {}
    _inst, _able = _app.get("installs", 0), _app.get("installable", 0)
    _apv, _dpv = _app.get("app_pageviews", 0), _app.get("direct_pageviews", 0)
    add_sheet("앱·설치", [
        {"항목": "설치 완료 (install)", "값": _inst, "비고": "홈화면/데스크톱 PWA 설치"},
        {"항목": "설치가능 노출 (installable)", "값": _able, "비고": "세션당 1회·주로 Android Chrome"},
        {"항목": "설치율 — 노출 대비 (%)", "값": round(_inst / _able * 100, 1) if _able else 0, "비고": "installs / installable"},
        {"항목": "앱 실행 페이지뷰", "값": _apv, "비고": "설치된 앱(standalone)으로 본 뷰"},
        {"항목": "직접 링크 페이지뷰", "값": _dpv, "비고": "referrer 없는 순수 직접 방문"},
        {"항목": "앱 실행 비중 (%)", "값": round(_apv / (_apv + _dpv) * 100, 1) if (_apv + _dpv) else 0, "비고": "앱 / (앱+직접)"},
    ], ["항목", "값", "비고"])
    add_sheet("도구사용", agg["tools"], ["event", "count"])
    add_sheet("페이지", agg["paths"], ["path", "views"])
    add_sheet("유입경로", agg["refs"], ["ref", "visitors", "views"])
    add_sheet("공유·다운로드", agg["shares"], ["label", "shares", "downloads", "total"])

    buf = io.BytesIO()
    wb.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="tcg-traffic-{days}d.xlsx"'},
    )
