"""gbl_guide_writer — GBL 가이드 초안 자동생성(Claude).

AdSense "가치 있는 콘텐츠" 확충용. 자동 "발행"이 아니라 "초안 생성":
super_admin이 토픽을 고르면 실측 데이터를 근거로 Claude가 4개국어 가이드
초안(프론트 GUIDES 포맷)을 생성 → 검토 후 guides.ts에 붙여넣기.

(저품질 대량 자동발행은 오히려 thin content가 되므로 사람 검토를 강제.)
"""
from __future__ import annotations

import json
import logging
import re
from collections import Counter
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


# 추천 가이드 토픽 — GBL Note 고유성(실측 데이터)을 살리는 주제 우선.
# needs_data=True면 해당 리그 실측 요약을 Claude 컨텍스트로 주입.
GUIDE_TOPICS: list[dict] = [
    {"slug": "great-meta-analysis", "title": "슈퍼리그 실측 메타 분석 — 지금 뭘 대비할까", "league": "great", "needs_data": True,
     "brief": "GBL Note 실측 픽률 기준 슈퍼리그에서 가장 많이 만나는 상대와 대비법. 이론 티어와 실제 등장률 차이 중심."},
    {"slug": "ultra-meta-analysis", "title": "하이퍼리그 실측 메타 분석", "league": "ultra", "needs_data": True,
     "brief": "하이퍼리그 실측 상위 포켓몬과 팀 구성 경향, 카운터 방향."},
    {"slug": "master-meta-analysis", "title": "마스터리그 실측 메타 분석", "league": "master", "needs_data": True,
     "brief": "마스터리그 실측 상위 전설/포켓몬과 실전 대비법."},
    {"slug": "shield-management", "title": "실드 운영법 — 언제 쓰고 언제 아낄까", "league": "", "needs_data": False,
     "brief": "GBL 승패의 핵심인 실드 판단. 실드 유도, 아끼기, 라스트전 실드 계산 실전 예시."},
    {"slug": "switch-timing", "title": "교체 타이밍과 스왑 쿨타임 운영", "league": "", "needs_data": False,
     "brief": "선봉/세이프스왑/피벗 개념, 스왑 쿨타임을 고려한 교체 판단."},
    {"slug": "energy-management", "title": "에너지 관리와 차지 타이밍", "league": "", "needs_data": False,
     "brief": "빠른 기술 에너지 축적, 차지 기술 발동 타이밍, 에너지 손실 최소화."},
    {"slug": "cmp-in-practice", "title": "CMP(공격 우선권) 실전 활용", "league": "", "needs_data": False,
     "brief": "같은 턴 차지 겹칠 때 공격 종족값 우선권. 미러전·라스트전에서 CMP 계산."},
    {"slug": "lead-selection", "title": "선봉 선택법 — 파티 첫 포켓몬 고르기", "league": "", "needs_data": False,
     "brief": "안전한 선봉, 상성 이해, ABB/ABC 구성 등 파티 빌딩 기초."},
    {"slug": "shadow-vs-normal", "title": "그림자 포켓몬, 언제 더 좋은가", "league": "", "needs_data": False,
     "brief": "그림자(공격↑ 방어↓)와 일반의 트레이드오프, GBL에서의 판단."},
    {"slug": "team-building-basics", "title": "팀 구성 기초 — 코어와 상성 커버", "league": "", "needs_data": False,
     "brief": "코어 2마리 + 커버, 약점 분산, 공통 카운터 회피."},
    {"slug": "iv-for-pvp", "title": "PvP IV — 낮은 공격이 좋은 이유", "league": "great", "needs_data": False,
     "brief": "CP 제한 리그에서 방어·체력 우선 IV가 유리한 원리와 예외."},
    {"slug": "raid-dealer-picks", "title": "레이드 딜러 선정법 — 속성별 최강 공격수", "league": "", "needs_data": False,
     "brief": "레이드에서 DPS·내구 균형, 속성 상성으로 딜러 고르기."},
]


def _live_meta_summary(league: str, days: int = 30) -> str:
    """해당 리그 실측 상위 speciesId 요약(Claude 컨텍스트용)."""
    if not league:
        return ""
    try:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows = (_db().table("gbl_matches")
                .select("team_json")
                .eq("league", league)
                .gte("played_at", since)
                .limit(20000).execute().data) or []
        total = len(rows)
        if total == 0:
            return f"(리그 {league}: 최근 {days}일 실측 데이터 없음)"
        counter: Counter = Counter()
        for r in rows:
            for tm in (r.get("team_json") or []):
                sid = tm.get("speciesId")
                if sid:
                    counter[sid] += 1
        top = counter.most_common(15)
        lines = [f"{sid}: {round(c / total * 100)}%" for sid, c in top]
        return (f"League: {league} | Real-battle samples (last {days}d): {total}\n"
                f"Top encountered (speciesId: real pick rate):\n  " + "\n  ".join(lines))
    except Exception as e:
        logger.warning("[guide_writer] 실측 요약 실패 [%s]: %s", league, e)
        return ""


_SYS = """You are an expert Pokémon GO GBL (Go Battle League) content writer for the site "GBL Note".
You write genuinely useful, original guides — concrete, specific, and grounded in real mechanics and data.
Avoid generic filler. Write for players who want actionable insight."""


def generate_guide_draft(slug: str, title: str, brief: str, league: str = "", use_live_data: bool = True) -> dict:
    """Claude로 4개국어 가이드 초안 생성. 반환: {slug, updated, guide(dict), ts_snippet}."""
    from app.services.secrets import get_secret
    api_key = get_secret("anthropic_api_key")
    if not api_key:
        raise RuntimeError("anthropic_api_key 미설정")

    live = _live_meta_summary(league) if (use_live_data and league) else ""
    data_block = f"\n\nLIVE DATA from GBL Note's own user battle records — cite specific numbers where relevant:\n{live}\n" if live else ""

    prompt = f"""Write a complete GBL guide article for GBL Note.

Topic slug: {slug}
Working title (Korean): {title}
Brief: {brief}{data_block}

Write the guide in FOUR languages: Korean (ko), English (en), Japanese (ja), Traditional Chinese (zh-TW).
Each language needs: a title, a meta description (~120 chars), and 5-7 sections.
Each section has an optional heading (h) and a paragraph (p) of 2-5 sentences.
Requirements:
- Original, specific, actionable. No generic filler or restating the obvious.
- Where LIVE DATA is provided, reference concrete pick-rate numbers and name the actual Pokémon (translate species names appropriately per language).
- Natural mention of GBL Note's own tools (실측 메타 / tier list) where it genuinely helps — not forced.
- Keep each language's content equivalent in substance (not word-for-word if idioms differ).
- Also produce 4-6 SEO keywords per language.

Return ONLY valid JSON, no prose, in EXACTLY this shape:
{{
  "keywords": {{"ko": ["..."], "en": ["..."], "ja": ["..."], "zh-TW": ["..."]}},
  "ko": {{"title": "...", "desc": "...", "sections": [{{"h": "...", "p": "..."}}, ...]}},
  "en": {{"title": "...", "desc": "...", "sections": [...]}},
  "ja": {{"title": "...", "desc": "...", "sections": [...]}},
  "zh-TW": {{"title": "...", "desc": "...", "sections": [...]}}
}}
The first section of each language may omit "h" (intro paragraph)."""

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        system=_SYS,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise RuntimeError("가이드 초안 파싱 실패 (JSON 없음)")
    guide = json.loads(m.group(0))

    updated = datetime.now(timezone.utc).date().isoformat()
    ts_snippet = _to_ts_snippet(slug, updated, guide)
    return {"slug": slug, "updated": updated, "guide": guide, "ts_snippet": ts_snippet, "live_context": live}


def _to_ts_snippet(slug: str, updated: str, g: dict) -> str:
    """guides.ts의 GUIDES에 붙여넣을 수 있는 TS 리터럴 문자열 생성."""
    def esc(s: str) -> str:
        return (s or "").replace("\\", "\\\\").replace('"', '\\"')

    def arr(ss: list[str]) -> str:
        return "[" + ", ".join(f'"{esc(x)}"' for x in ss) + "]"

    def sections(secs: list[dict]) -> str:
        out = []
        for s in secs:
            if s.get("h"):
                out.append(f'        {{ h: "{esc(s["h"])}", p: "{esc(s.get("p",""))}" }},')
            else:
                out.append(f'        {{ p: "{esc(s.get("p",""))}" }},')
        return "\n".join(out)

    def lang_block(code: str) -> str:
        c = g.get(code, {})
        return (f'    "{code}": {{\n'
                f'      title: "{esc(c.get("title",""))}",\n'
                f'      desc: "{esc(c.get("desc",""))}",\n'
                f'      sections: [\n{sections(c.get("sections", []))}\n      ],\n'
                f'    }},') if code != "ko" else (
                f'    ko: {{\n'
                f'      title: "{esc(c.get("title",""))}",\n'
                f'      desc: "{esc(c.get("desc",""))}",\n'
                f'      sections: [\n{sections(c.get("sections", []))}\n      ],\n'
                f'    }},')

    kw = g.get("keywords", {})
    return (f'  "{slug}": {{\n'
            f'    updated: "{updated}",\n'
            f'    keywords: {{\n'
            f'      ko: {arr(kw.get("ko", []))},\n'
            f'      en: {arr(kw.get("en", []))},\n'
            f'      ja: {arr(kw.get("ja", []))},\n'
            f'      "zh-TW": {arr(kw.get("zh-TW", []))},\n'
            f'    }},\n'
            f'{lang_block("ko")}\n{lang_block("en")}\n{lang_block("ja")}\n{lang_block("zh-TW")}\n'
            f'  }},')
