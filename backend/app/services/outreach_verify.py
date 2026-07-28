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
