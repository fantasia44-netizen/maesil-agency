"""
매실인사이트 영업 에이전시 브리핑 — outreach CRM 진행 현황 AI 보고.

run_briefing() → {ok, headline, sections, alerts, raw_data}
  1. agent_work.outreach_leads 직접 조회 (maesil-total)
     - 전체 리드 퍼널 (등급별/플랫폼별/상태별 집계)
     - 이메일 발송/오픈/클릭/회신 지표
     - 최근 30일 활동 리드
     - 액션 필요 리드 (협상 중, 장기 미회신)
  2. Claude Sonnet → 영업 진행 브리핑
  3. agency_briefings 저장 (agency_type='outreach')
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

logger = logging.getLogger(__name__)

AGENT_TYPE = "outreach"


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _get_anthropic_key() -> str:
    from app.services.secrets import get_secret
    return get_secret("anthropic_api_key") or ""


def _collect_data() -> dict:
    db = _db()
    today = date.today()
    d30_from = (today - timedelta(days=30)).isoformat()

    raw: dict = {}

    try:
        # 전체 리드 상태별 집계
        resp = db.table("outreach_leads").select(
            "status, grade, platform, channel_type, "
            "open_count, opened_at, click_count, clicked_at, "
            "contact_email, contact_name, channel_name, "
            "created_at, updated_at"
        ).execute()
        leads = resp.data or []
    except Exception as e:
        logger.warning("[outreach_briefing] 리드 조회 실패: %s", e)
        leads = []

    # ── 집계 ──────────────────────────────────────────────────────
    total = len(leads)
    by_status: dict[str, int] = {}
    by_grade: dict[str, int] = {}
    by_platform: dict[str, int] = {}

    emailed = 0
    opened = 0
    clicked = 0
    replied = 0
    negotiating = 0
    deal = 0
    unsub = 0

    action_needed: list[dict] = []  # 협상 중 / 장기 미회신
    recent_opens: list[dict] = []    # 최근 7일 오픈

    for l in leads:
        st = l.get("status") or "unknown"
        gr = l.get("grade") or "-"
        pl = l.get("platform") or "-"
        by_status[st] = by_status.get(st, 0) + 1
        by_grade[gr] = by_grade.get(gr, 0) + 1
        by_platform[pl] = by_platform.get(pl, 0) + 1

        if st in ("emailed", "replied", "no_reply", "negotiating", "deal", "unsubscribe"):
            emailed += 1
        if (l.get("open_count") or 0) > 0:
            opened += 1
        if (l.get("click_count") or 0) > 0:
            clicked += 1
        if st == "replied":
            replied += 1
        if st == "negotiating":
            negotiating += 1
        if st == "deal":
            deal += 1
        if st == "unsubscribe":
            unsub += 1

        # 협상 중 / no_reply 7일 이상
        if st == "negotiating":
            action_needed.append({
                "name": l.get("channel_name") or l.get("contact_name"),
                "email": l.get("contact_email"),
                "status": st,
                "updated": l.get("updated_at"),
            })
        elif st == "no_reply":
            upd = l.get("updated_at") or ""
            if upd and upd[:10] <= (today - timedelta(days=7)).isoformat():
                action_needed.append({
                    "name": l.get("channel_name") or l.get("contact_name"),
                    "email": l.get("contact_email"),
                    "status": "no_reply_7d+",
                    "updated": upd,
                })

        # 최근 7일 오픈
        oa = l.get("opened_at") or ""
        if oa and oa[:10] >= (today - timedelta(days=7)).isoformat():
            recent_opens.append({
                "name": l.get("channel_name") or l.get("contact_name"),
                "open_count": l.get("open_count"),
                "opened_at": oa,
                "status": st,
            })

    # 이메일 지표 (비율)
    open_rate   = round(opened  / emailed * 100, 1) if emailed else 0
    click_rate  = round(clicked / emailed * 100, 1) if emailed else 0
    reply_rate  = round(replied / emailed * 100, 1) if emailed else 0
    unsub_rate  = round(unsub   / emailed * 100, 1) if emailed else 0

    raw["funnel"] = {
        "total_leads": total,
        "emailed": emailed,
        "opened": opened,
        "clicked": clicked,
        "replied": replied,
        "negotiating": negotiating,
        "deal": deal,
        "unsubscribe": unsub,
        "open_rate_pct": open_rate,
        "click_rate_pct": click_rate,
        "reply_rate_pct": reply_rate,
        "unsub_rate_pct": unsub_rate,
    }
    raw["by_status"]   = by_status
    raw["by_grade"]    = by_grade
    raw["by_platform"] = by_platform
    raw["action_needed"] = sorted(action_needed, key=lambda x: x.get("updated") or "", reverse=True)[:10]
    raw["recent_opens"]  = sorted(recent_opens, key=lambda x: x.get("opened_at") or "", reverse=True)[:10]

    return raw


def _sonnet_briefing(raw: dict) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=_get_anthropic_key())
    today_str = date.today().isoformat()

    def _s(obj, max_rows=20) -> str:
        if isinstance(obj, list):
            return json.dumps(obj[:max_rows], ensure_ascii=False, default=str)
        return json.dumps(obj, ensure_ascii=False, default=str)

    funnel = raw.get("funnel", {})

    prompt = f"""당신은 매실인사이트 B2B 영업팀의 영업 에이전시입니다.
매실인사이트는 이커머스 셀러·유튜버·광고대행사 대상 SaaS 수익 분석 솔루션입니다.
아래 CRM 영업 데이터를 분석해 **매실인사이트 영업 진행 현황 브리핑**을 작성하세요.
오늘 날짜: {today_str}

## 퍼널 지표
{_s(funnel)}

## 상태별 리드 분포
{_s(raw.get("by_status", {}))}

## 등급별 리드 분포
{_s(raw.get("by_grade", {}))}

## 플랫폼별 리드 분포
{_s(raw.get("by_platform", {}))}

## 즉시 액션 필요 리드 (협상 중 / 7일+ 미회신)
{_s(raw.get("action_needed", []))}

## 최근 7일 이메일 오픈 리드
{_s(raw.get("recent_opens", []))}

## 브리핑 요구사항
1. **headline**: 영업 진행 현황 1줄 요약 (40자 이내, 핵심 숫자 포함)
2. **sections**: 5개 섹션
   - 퍼널 현황 (총 리드→발송→오픈→회신→협상→계약 수치, 각 전환율)
   - 이메일 성과 (오픈율, 클릭율, 회신율, 수신거부율 — 업계 평균 대비 평가)
   - 즉시 팔로업 필요 (협상 중 리드 이름/상태, 7일+ 미회신 리드 리스트)
   - 관심 신호 포착 (최근 7일 오픈 리드 — 재접촉 우선순위)
   - 등급·플랫폼 분석 (어떤 등급/플랫폼에서 전환율이 높은지, 집중 방향 제안)
3. **alerts**: 즉시 조치 항목
   - critical: 협상 중 리드 3일+ 무응답, 오픈 후 클릭 없음 고관심 리드
   - warning: 오픈율 20% 미만, 회신 없음 장기화 리드

숫자가 0인 항목은 "아직 없음"으로 표기하되 계속 진행하세요.

JSON으로만 답하세요:
{{
  "headline": "...",
  "sections": [
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}}
  ],
  "alerts": [
    {{"level": "warning|critical", "message": "..."}}
  ]
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error("[outreach_briefing] Sonnet 실패: %s", e)
        return {}


def run_briefing() -> dict:
    """매실인사이트 영업 CRM 브리핑 실행 + DB 저장."""
    today = date.today()
    raw = _collect_data()

    funnel = raw.get("funnel", {})
    if not funnel.get("total_leads"):
        _save(status="no_data", headline="리드 없음",
              sections=[], alerts=[], raw_data=raw,
              period_from=today, period_to=today)
        return {"ok": True, "status": "no_data", "message": "영업 리드 데이터 없음"}

    ai = _sonnet_briefing(raw)
    headline  = ai.get("headline") or "매실인사이트 영업 현황"
    sections  = ai.get("sections") or []
    alerts    = ai.get("alerts") or []

    _save(status="ok", headline=headline, sections=sections,
          alerts=alerts, raw_data=raw,
          period_from=today - timedelta(days=30), period_to=today)

    return {"ok": True, "headline": headline, "sections": sections, "alerts": alerts}


def _save(*, status: str, headline: str, sections: list, alerts: list,
          raw_data: dict, period_from, period_to, error_msg: str | None = None):
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    try:
        db.table("agency_briefings").insert({
            "agency_type": "outreach",
            "operator_id": None,
            "status": status,
            "headline": headline,
            "sections": sections,
            "alerts": alerts,
            "raw_data": raw_data,
            "error_msg": error_msg,
            "period_from": period_from.isoformat() if period_from else None,
            "period_to": period_to.isoformat() if period_to else None,
            "created_at": now,
        }).execute()
    except Exception as e:
        logger.error("[outreach_briefing] DB 저장 실패: %s", e)
