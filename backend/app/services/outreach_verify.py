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
- 창업 스토리·월매출·사업 경험을 대화 형식으로 다루는 채널
- 셀러/이커머스 창업자를 실제로 초대해 이야기 나누는 커뮤니티·미디어형 채널

## 반드시 제외 (is_interview=false)
- 본인 강의만 파는 강사형(교육 콘텐츠·수업 홍보 중심)
- AI로 생성한 영상으로 제품·부업 파는 스팸/양산형 채널
- 드롭십·부업 과장 광고, "월 1000만원" 자동화 낚시성 채널
- 단순 상품 리뷰·언박싱, 정보 나열형(진행자-게스트 대화 없음)
- 최근 영상이 인터뷰와 무관하거나, 실체 없는 채널

## 채널 정보
채널명: {handle}
채널 설명/요약: {summary}
구독자: {subs}명

## 최근 영상 (제목 · 설명 · 스크립트 발췌)
{videos}

아래 JSON으로만 답하세요:
{{"is_interview": true/false, "confidence": 0.0~1.0, "reason": "판정 근거 1-2문장(한국어)"}}"""


def _judge_interview(tenant_id: str, lead: dict, videos: list[dict]) -> dict:
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


def deep_verify_interview(tenant_id: str, limit: int = 25) -> dict:
    """인터뷰 후보의 최근 영상 스크립트까지 읽고 Claude가 인터뷰 여부 재판정.

    강사·AI스팸·낚시성으로 판정되면 interview_candidate=false로 내림.
    영상 3개 조회(playlistItems 저렴) + 자막 2개 + Haiku 1회 / 채널.
    비용 때문에 limit로 제한(오래된 미검증 후보 우선).
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

    # 미검증(deep_verified_at NULL) 후보 우선, 살아있는 채널만
    rows = (_db().table("outreach_leads")
            .select("id, platform_id, handle_name, subscriber_count, "
                    "content_summary, best_content_title")
            .eq("tenant_id", tenant_id).eq("platform", "youtube")
            .eq("interview_candidate", True).neq("channel_dead", True)
            .order("deep_verified_at", desc=False, nullsfirst=True)
            .limit(limit).execute().data or [])
    if not rows:
        return {"ok": True, "checked": 0, "kept": 0, "dropped": 0}

    now = datetime.now(timezone.utc).isoformat()
    kept = dropped = 0
    for lead in rows:
        cid = lead.get("platform_id") or ""
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

        verdict = _judge_interview(tenant_id, lead, videos)
        is_interview = bool(verdict.get("is_interview"))
        reason = (verdict.get("reason") or "")[:400]
        payload = {"interview_verdict": reason or None, "deep_verified_at": now}
        if verdict:  # 판정 성공했을 때만 후보 상태 조정 (실패 시 유지)
            payload["interview_candidate"] = is_interview
            kept += 1 if is_interview else 0
            dropped += 0 if is_interview else 1
        try:
            (_db().table("outreach_leads").update(payload)
             .eq("tenant_id", tenant_id).eq("id", lead["id"]).execute())
        except Exception as e:
            logger.debug("[deep-verify] 저장 실패 %s: %s", lead.get("handle_name"), e)

    logger.info("[deep-verify] 심층검증 %d건: 유지 %d, 제외 %d", len(rows), kept, dropped)
    return {"ok": True, "checked": len(rows), "kept": kept, "dropped": dropped}
