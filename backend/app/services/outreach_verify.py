"""outreach_verify — 리드 채널 생존 검증 (YouTube).

오래전 수집분 중 삭제·정지된 채널을 YouTube channels.list로 확인해
channel_dead 표시. channels.list는 호출당 1유닛(최대 50 id) → 저렴.
살아있는 채널은 구독자 수도 최신화.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _youtube_clients(tenant_id: str):
    from googleapiclient.discovery import build
    from app.services.secrets import get_tenant_secret
    keys = [k for k in (
        get_tenant_secret(tenant_id, "youtube_api_key"),
        get_tenant_secret(tenant_id, "youtube_api_key_2"),
        get_tenant_secret(tenant_id, "youtube_api_key_3"),
    ) if k]
    return [build("youtube", "v3", developerKey=k, cache_discovery=False) for k in keys]


def verify_channels(tenant_id: str, campaign: str | None = None,
                    only_candidates: bool = False, limit: int = 3000) -> dict:
    """유튜브 리드의 채널 생존 검증 → channel_dead 표시 + 살아있으면 구독자 최신화.

    campaign / only_candidates 로 범위 좁힘. Naver 블로그는 API 검증 대상 아님(스킵).
    """
    clients = _youtube_clients(tenant_id)
    if not clients:
        return {"ok": False, "error": "youtube_api_key 미설정"}

    q = (_db().table("outreach_leads")
         .select("id, platform_id")
         .eq("tenant_id", tenant_id).eq("platform", "youtube")
         .limit(limit))
    if campaign:
        q = q.eq("campaign", campaign)
    if only_candidates:
        q = q.eq("interview_candidate", True)
    rows = q.execute().data or []
    id_to_lead: dict[str, str] = {r["platform_id"]: r["id"] for r in rows if r.get("platform_id")}
    channel_ids = list(id_to_lead.keys())
    if not channel_ids:
        return {"ok": True, "checked": 0, "dead": 0, "alive": 0}

    alive_stats: dict[str, int] = {}   # channel_id → subscriberCount
    key_idx = 0
    for i in range(0, len(channel_ids), 50):
        batch = channel_ids[i:i + 50]
        for _ in range(len(clients)):
            try:
                resp = (clients[key_idx].channels().list(
                    part="statistics", id=",".join(batch), maxResults=50,
                    fields="items(id,statistics/subscriberCount)").execute())
                for item in resp.get("items", []):
                    subs = int((item.get("statistics") or {}).get("subscriberCount") or 0)
                    alive_stats[item["id"]] = subs
                break
            except Exception as e:
                if any(s in str(e) for s in ("429", "quotaExceeded", "rateLimitExceeded")) and key_idx + 1 < len(clients):
                    key_idx += 1
                    continue
                logger.warning("[verify] channels.list 실패: %s", e)
                break

    now = datetime.now(timezone.utc).isoformat()
    dead_ids = [id_to_lead[cid] for cid in channel_ids if cid not in alive_stats]
    alive_ids = [cid for cid in channel_ids if cid in alive_stats]

    def _bulk_update(lead_ids: list[str], payload: dict):
        for j in range(0, len(lead_ids), 200):
            (_db().table("outreach_leads").update(payload)
             .eq("tenant_id", tenant_id).in_("id", lead_ids[j:j + 200]).execute())

    # 죽은 채널 표시 + 인터뷰 후보에서 즉시 제외
    if dead_ids:
        _bulk_update(dead_ids, {"channel_dead": True, "verified_at": now,
                                "interview_candidate": False})
    # 살아있는 채널: dead 해제 + 구독자 최신화(개별) + verified_at
    for cid in alive_ids:
        try:
            (_db().table("outreach_leads").update({
                "channel_dead": False, "verified_at": now,
                "subscriber_count": alive_stats[cid],
            }).eq("tenant_id", tenant_id).eq("id", id_to_lead[cid]).execute())
        except Exception as e:
            logger.debug("[verify] 구독자 갱신 실패 %s: %s", cid, e)

    logger.info("[verify] 채널 검증: 확인 %d, 생존 %d, 사망 %d (campaign=%s, cand=%s)",
                len(channel_ids), len(alive_ids), len(dead_ids), campaign, only_candidates)
    return {"ok": True, "checked": len(channel_ids),
            "alive": len(alive_ids), "dead": len(dead_ids)}


# ── 심층 검증: 최근 영상 스크립트까지 읽고 Claude가 인터뷰 여부 판정 ──────────

_DEEP_PROMPT = """당신은 매실인사이트/매실K 섭외 담당자입니다.
아래 유튜브 채널이 "매실K 대표가 게스트로 출연해 셀러 시청자에게 이야기할 만한
인터뷰·대담·출연형 채널"인지 엄격하게 판정하세요.

## 인터뷰 채널로 인정 (is_interview=true)
- 진행자가 게스트(셀러·창업가·사업가)를 불러 인터뷰/대담하는 채널
- 창업 스토리·사업 경험을 대화 형식으로 다루는 채널
- 셀러/이커머스 창업자를 실제로 초대해 이야기 나누는 커뮤니티·미디어형 채널
- **채널 소개에 "출연 신청/문의·섭외·게스트 모집·사연 접수"가 있으면 출연자를 받는 진짜 인터뷰 채널** → true
  (게스트의 성과 수치가 다소 커도, 채널이 남을 인터뷰하는 구조면 인정)

## 반드시 제외 (is_interview=false) — 엄격하게
- 본인 강의·클래스·전자책·유료커뮤니티를 파는 강사형(교육·수업 홍보 중심)
- AI로 생성한 영상/쇼츠로 제품·부업·강의 파는 스팸/양산형 채널
- "하루 1000만원·일 6000만원"처럼 비현실적 일 단위 숫자로 후킹하는 낚시 채널
  (단, "월 1억" 같은 월 단위 수치는 실제 가능하므로 그 자체로는 제외 근거 아님)
- "무자본·자동화·클릭 한 번·건물 몇 채" 류의 과장 부업 채널
- 유튜브 자동화/쇼츠 수익화 강의 채널
- 단순 상품 리뷰·언박싱, 정보 나열형(진행자-게스트 대화 없음)
- 최근 영상이 인터뷰와 무관하거나, 실체 없는 채널
※ 판단 우선순위: 출연/게스트 모집 신호 있으면 true. 없고 강의판매·일단위낚시면 false.

## 채널 정보
채널명: {handle}
채널 설명/요약: {summary}
채널 소개(About): {about}
구독자: {subs}명

## 최근 영상 (제목 · 설명 · 스크립트 발췌)
{videos}

아래 JSON으로만 답하세요:
{{"is_interview": true/false, "confidence": 0.0~1.0, "reason": "판정 근거 1-2문장(한국어)"}}"""


def _judge_interview(tenant_id: str, lead: dict, videos: list[dict], about: str = "") -> dict:
    import anthropic
    from app.services.secrets import get_tenant_secret
    key = get_tenant_secret(tenant_id, "anthropic_api_key")
    if not key:
        return {}
    vids_block = "\n\n".join(
        f"- 제목: {v.get('title','')}\n  설명: {(v.get('description') or '')[:200]}\n"
        f"  스크립트: {(v.get('transcript') or '(자막 없음)')[:1200]}"
        for v in videos) or "(최근 영상 없음)"
    prompt = _DEEP_PROMPT.format(
        handle=lead.get("handle_name", ""),
        summary=(lead.get("content_summary") or lead.get("best_content_title") or "")[:400],
        about=(about or "(소개 없음)")[:800],
        subs=lead.get("subscriber_count") or 0,
        videos=vids_block)
    try:
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001", max_tokens=400,
            messages=[{"role": "user", "content": prompt}])
        import json
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.warning("[deep-verify] 판정 실패 %s: %s", lead.get("handle_name"), e)
        return {}


import re

# 자극성·AI강의·낚시성 패턴 — 명백한 건 LLM 없이 즉시 제외
_SCAM_PATTERNS = [
    # 일/하루 단위 비현실적 숫자 = 핵심 사기 시그널 (월 단위는 실제 가능하므로 제외)
    r"하루\s?\d{3,}\s?만원", r"하루\s?\d+\s?천만?\s?원", r"하루\s?\d+\s?억",
    r"일\s?\d{3,}\s?만원", r"일\s?\d+\s?천만?\s?원",
    # 비현실적 성과 후킹
    r"\d+\s?년\s?만에.{0,10}억", r"\d{2,}\s?%\s?(잘\s?)?팔", r"건물\s?\d+\s?채",
    # AI 양산·자동화 부업/강의 (매실K 인터뷰와 무관한 스팸)
    r"자동화", r"무자본", r"돈\s?복사", r"파이프라인", r"방구석", r"클릭\s?(한|몇)\s?번",
    r"ai로\s?(돈|수익|판매|팔|\d|글)", r"ai로\s?\d+\s?분", r"ai\s?부업", r"ai\s?자동",
    r"챗gpt.{0,4}(부업|수익|돈)", r"쇼츠로?\s?(월|수익|돈|부업)",
    r"유튜브\s?(부업|자동|수익화)\s?강의",
    # 코인/한탕 낚시
    r"코인으로.{0,12}(억|월|벌|날)", r"\d+\s?억\s?날리", r"복붙.{0,8}(억|월|벌)",
]
_SCAM_RE = re.compile("|".join(_SCAM_PATTERNS), re.I)

# 출연/게스트를 '모집'하는 신호 = 진짜 인터뷰 채널의 골드 신호.
# 개별 영상이 자극적이어도 채널이 출연자를 받으면 인터뷰 채널로 인정.
_INTERVIEW_INVITE_PATTERNS = [
    r"출연\s?(신청|문의|제안|섭외|자|희망)", r"섭외\s?(문의|신청)", r"게스트\s?(모집|신청|섭외)",
    r"인터뷰\s?(문의|신청|요청|섭외)", r"사연\s?(신청|접수|제보)", r"제보\s?(문의|받)",
    r"출연자\s?모집", r"인터뷰\s?하실", r"인터뷰\s?대상", r"섭외\s?하고",
]
_INVITE_RE = re.compile("|".join(_INTERVIEW_INVITE_PATTERNS), re.I)


def _looks_scam(*texts: str) -> bool:
    blob = " ".join(t for t in texts if t)
    return bool(_SCAM_RE.search(blob))


def _looks_invite(*texts: str) -> bool:
    blob = " ".join(t for t in texts if t)
    return bool(_INVITE_RE.search(blob))


def _set_candidate(tenant_id: str, lead_id: str, value: bool, verdict: str, now: str):
    (_db().table("outreach_leads").update({
        "interview_candidate": value,
        "interview_verdict": verdict[:400] or None,
        "deep_verified_at": now,
    }).eq("tenant_id", tenant_id).eq("id", lead_id).execute())


def deep_verify_interview(tenant_id: str, limit: int = 25) -> dict:
    """인터뷰 후보를 채널 소개(About)까지 읽어 3단계 판정.

    1) 출연/게스트 모집 신호 → 무조건 인터뷰 채널로 유지(자극적 영상이어도).
    2) 신호 없고 일단위 낚시·AI강의 스팸 → 즉시 제외.
    3) 애매 → 최근 영상 스크립트 + About을 Claude가 판정(limit개까지).
    About은 channels.list 배치(50개당 1유닛)로 저렴하게 가져옴.
    """
    from app.services.secrets import get_tenant_secret
    api_key = get_tenant_secret(tenant_id, "youtube_api_key")
    if not api_key:
        return {"ok": False, "error": "youtube_api_key 미설정"}
    if not get_tenant_secret(tenant_id, "anthropic_api_key"):
        return {"ok": False, "error": "anthropic_api_key 미설정"}

    from app.services.scanners.youtube_scanner import YouTubeScanner, _fetch_transcript
    api_keys = [k for k in (
        api_key, get_tenant_secret(tenant_id, "youtube_api_key_2"),
        get_tenant_secret(tenant_id, "youtube_api_key_3")) if k]
    scanner = YouTubeScanner(api_keys)

    # 살아있는 인터뷰 후보 전체 (About 판정은 전량, LLM만 limit)
    cands = (_db().table("outreach_leads")
             .select("id, platform_id, handle_name, subscriber_count, "
                     "content_summary, best_content_title, deep_verified_at")
             .eq("tenant_id", tenant_id).eq("platform", "youtube")
             .eq("interview_candidate", True).neq("channel_dead", True)
             .limit(3000).execute().data or [])
    if not cands:
        return {"ok": True, "checked": 0, "kept": 0, "dropped": 0,
                "invited": 0, "swept": 0}

    # About 배치 조회 (출연 신청 신호는 채널 소개에 있음)
    ch_ids = [c["platform_id"] for c in cands
              if (c.get("platform_id") or "").startswith("UC")]
    about_map: dict[str, str] = {}
    try:
        info = scanner._fetch_channel_info(ch_ids)
        about_map = {cid: (v.get("description") or "") for cid, v in info.items()}
    except Exception as e:
        logger.warning("[deep-verify] About 조회 실패(계속): %s", e)

    now = datetime.now(timezone.utc).isoformat()
    invited = swept = 0
    ambiguous: list[tuple[dict, str]] = []
    for c in cands:
        about = about_map.get(c.get("platform_id") or "", "")
        blob = (c.get("handle_name", ""), c.get("content_summary", ""),
                c.get("best_content_title", ""), about)
        if _looks_invite(*blob):
            _set_candidate(tenant_id, c["id"], True, "출연/게스트 모집 채널 — 인터뷰 인정", now)
            invited += 1
        elif _looks_scam(*blob):
            _set_candidate(tenant_id, c["id"], False, "일단위 낚시·AI강의 스팸 자동 제외", now)
            swept += 1
        else:
            ambiguous.append((c, about))

    # 애매한 것만 LLM (미검증 우선), limit개까지
    ambiguous.sort(key=lambda t: (t[0].get("deep_verified_at") or ""))
    now2 = datetime.now(timezone.utc).isoformat()
    kept = dropped = 0
    for c, about in ambiguous[:limit]:
        cid = c.get("platform_id") or ""
        videos: list[dict] = []
        if cid.startswith("UC"):
            try:
                vids = scanner.fetch_recent_videos(cid, max_results=3)
            except Exception:
                vids = []
            for i, v in enumerate(vids[:3]):
                if i < 2 and v.get("video_id"):
                    v["transcript"] = _fetch_transcript(v["video_id"])
                videos.append(v)

        # 최근 영상 제목에 낚시 신호가 명확하면 LLM 없이 제외 (돈벌쥐류)
        vid_titles = " ".join(v.get("title", "") for v in videos)
        if vid_titles and _looks_scam(vid_titles) and not _looks_invite(about, vid_titles):
            _set_candidate(tenant_id, c["id"], False, "최근 영상 낚시성 자동 제외", now2)
            dropped += 1
            continue

        verdict = _judge_interview(tenant_id, c, videos, about=about)
        if not verdict:   # 판정 실패 → 상태 유지, 근거만 비움
            continue
        is_interview = bool(verdict.get("is_interview"))
        _set_candidate(tenant_id, c["id"], is_interview,
                       (verdict.get("reason") or ""), now2)
        kept += 1 if is_interview else 0
        dropped += 0 if is_interview else 1

    logger.info("[deep-verify] 출연모집 %d, 스팸제외 %d, LLM검증 %d(유지 %d/제외 %d), 애매잔여 %d",
                invited, swept, len(ambiguous[:limit]), kept, dropped,
                max(0, len(ambiguous) - limit))
    return {"ok": True, "invited": invited, "swept": swept,
            "checked": len(ambiguous[:limit]), "kept": kept, "dropped": dropped,
            "remaining": max(0, len(ambiguous) - limit)}
