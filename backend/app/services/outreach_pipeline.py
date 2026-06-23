"""
outreach_pipeline.py — 멀티채널 스캔 통합 실행 파이프라인.

플랫폼별 scanner → Haiku 분류 → GATE 필터 → 점수 계산 → DB 업서트 → 멀티터치 예약
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from app.services.scanners.base import (
    ContentItem, extract_contact,
    find_existing_lead_by_contact, mark_scanned,
)
from app.services.outreach_scorer import (
    calculate_score, compute_conversion_signals,
    compute_risk_signals, is_gate_pass, get_activity_level,
)

logger = logging.getLogger(__name__)


# ── 터치포인트 예약 일정 ──────────────────────────────────────────────
TOUCH_SCHEDULE = [
    {"sequence": 1, "channel": "email",                "delay_days": 0},
    {"sequence": 2, "channel": "email",                "delay_days": 7},
    {"sequence": 3, "channel": "email",                "delay_days": 14},
    {"sequence": 4, "channel": "instagram_dm",         "delay_days": 21},
    {"sequence": 5, "channel": "naver_cafe_message",   "delay_days": 28},
    {"sequence": 6, "channel": "youtube_comment",      "delay_days": 35},
]


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _upsert_lead(tenant_id: str, payload: dict) -> str | None:
    """outreach_leads에 업서트(테넌트 스코프). 생성된 id 반환."""
    try:
        payload["tenant_id"] = tenant_id
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        resp = (
            _db().table("outreach_leads")
            .upsert(payload, on_conflict="tenant_id,platform,platform_id")
            .execute()
        )
        rows = resp.data or []
        return rows[0]["id"] if rows else None
    except Exception as e:
        logger.error("lead upsert 실패 [%s/%s]: %s",
                     payload.get("platform"), payload.get("platform_id"), e)
        return None


def _merge_into_existing(tenant_id: str, existing_id: str, new_platform: str, new_url: str,
                         new_subscribers: int | None) -> None:
    """동일인의 새 플랫폼 정보를 기존 리드에 병합(테넌트 스코프)."""
    try:
        resp = _db().table("outreach_leads").select("platforms_json, score").eq("tenant_id", tenant_id).eq("id", existing_id).limit(1).execute()
        if not resp.data:
            return
        lead = resp.data[0]
        platforms = lead.get("platforms_json") or []

        if not any(p.get("platform") == new_platform for p in platforms):
            platforms.append({"platform": new_platform, "url": new_url, "subscribers": new_subscribers})
            bonus = 5 if len(platforms) >= 3 else 3
            new_score = min((lead.get("score") or 0) + bonus, 100)
            _db().table("outreach_leads").update({
                "platforms_json": platforms,
                "score": new_score,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("tenant_id", tenant_id).eq("id", existing_id).execute()
            logger.info("lead 병합 [%s] + %s → score +%d", existing_id, new_platform, bonus)
    except Exception as e:
        logger.warning("lead 병합 실패 [%s]: %s", existing_id, e)


def _schedule_touchpoints(tenant_id: str, lead_id: str, has_email: bool,
                          has_instagram: bool, has_cafe: bool) -> None:
    """터치포인트 시퀀스 예약(테넌트 스탬프). 이미 예약된 리드는 건너뜀."""
    try:
        existing = _db().table("outreach_touchpoints").select("id").eq("tenant_id", tenant_id).eq("lead_id", lead_id).limit(1).execute()
        if existing.data:
            return  # 이미 터치포인트 있음 — 재스캔 시 덮어쓰지 않음
    except Exception:
        return
    now = datetime.now(timezone.utc)
    rows = []
    for t in TOUCH_SCHEDULE:
        ch = t["channel"]
        if ch == "email" and not has_email:
            continue
        if ch == "instagram_dm" and not has_instagram:
            continue
        if ch == "naver_cafe_message" and not has_cafe:
            continue
        rows.append({
            "tenant_id": tenant_id,
            "lead_id": lead_id,
            "touch_sequence": t["sequence"],
            "channel": ch,
            "status": "pending",
            "scheduled_for": (now + timedelta(days=t["delay_days"])).isoformat(),
        })
    if not rows:
        return
    try:
        _db().table("outreach_touchpoints").upsert(
            rows, on_conflict="lead_id,touch_sequence"
        ).execute()
    except Exception as e:
        logger.warning("touchpoints 예약 실패 [%s]: %s", lead_id, e)


# ── 메인 파이프라인 ──────────────────────────────────────────────────

def run_platform_scan(tenant_id: str, platform: str) -> dict:
    """
    특정 플랫폼 스캔 실행(테넌트 스코프).
    platform: 'youtube' | 'naver_blog'
    """
    from app.services.secrets import get_tenant_secret
    from app.services.tenant_config import load_config
    cfg = load_config(tenant_id)
    anthropic_key = get_tenant_secret(tenant_id, "anthropic_api_key") or ""

    if platform == "youtube":
        api_key = get_tenant_secret(tenant_id, "youtube_api_key")
        if not api_key:
            return {"ok": False, "error": "youtube_api_key 미설정"}
        # 키 2·3번 있으면 함께 사용 (429 시 자동 전환)
        api_keys = [k for k in [
            api_key,
            get_tenant_secret(tenant_id, "youtube_api_key_2"),
            get_tenant_secret(tenant_id, "youtube_api_key_3"),
        ] if k]
        from app.services.scanners.youtube_scanner import YouTubeScanner, analyze_items_haiku
        scanner = YouTubeScanner(api_keys, cfg.keywords_youtube)
        analyzer = lambda items: analyze_items_haiku(items, anthropic_key)
    elif platform == "naver_blog":
        client_id = get_tenant_secret(tenant_id, "naver_client_id")
        client_secret = get_tenant_secret(tenant_id, "naver_client_secret")
        if not client_id:
            return {"ok": False, "error": "naver_client_id 미설정"}
        from app.services.scanners.naver_blog_scanner import NaverBlogScanner, analyze_items_haiku
        scanner = NaverBlogScanner(client_id, client_secret, cfg.keywords_naver)
        analyzer = lambda items: analyze_items_haiku(items, anthropic_key)
    else:
        return {"ok": False, "error": f"미지원 플랫폼: {platform}"}

    # 스캔 실행
    scan_result = scanner.run_scan(tenant_id)
    items: list[ContentItem] = scan_result.get("items", [])

    if not items:
        return {**scan_result, "ok": True, "leads_upserted": 0, "gate_passed": 0}

    # Haiku 분류
    ai_results = analyzer(items)

    gate_passed = 0
    leads_upserted = 0
    content_id_to_lead_id: dict[str, str] = {}
    processed_platform_ids: set[str] = set()

    for item, ai_result in zip(items, ai_results):
        if not is_gate_pass(ai_result, platform=platform):
            continue
        gate_passed += 1

        # 동일 채널 중복 방지
        if item.platform_id in processed_platform_ids:
            continue
        processed_platform_ids.add(item.platform_id)

        # 연락처 추출
        contact = extract_contact(item.raw_contact_text)

        # 동일인 타 플랫폼 병합 확인 (테넌트 내)
        existing_id = find_existing_lead_by_contact(tenant_id, contact.email, contact.kakao)
        if existing_id:
            _merge_into_existing(tenant_id, existing_id, platform, item.platform_url, item.subscriber_count)
            content_id_to_lead_id[item.content_id] = existing_id
            continue

        # 점수 계산
        conv = compute_conversion_signals(ai_result)
        risk = compute_risk_signals(ai_result)
        activity = get_activity_level(item.published_at)

        score_input = {
            "platform": platform,
            "contact_email": contact.email,
            "contact_kakao": contact.kakao,
            "contact_naver_cafe": contact.naver_cafe,
            "community_size": item.community_size,
            "activity_level": activity,
            "subscriber_count": item.subscriber_count,
            "platforms_json": [],
            **conv,
            **risk,
        }
        total, grade, breakdown = calculate_score(score_input)

        status = "discovered"

        payload = {
            "platform": platform,
            "platform_id": item.platform_id,
            "platform_url": item.platform_url,
            "primary_platform": platform,
            "platforms_json": [{"platform": platform, "url": item.platform_url, "subscribers": item.subscriber_count}],
            "handle_name": item.handle_name,
            "subscriber_count": item.subscriber_count,
            "avg_views": item.views,
            "avg_comments": item.avg_comments,
            "community_size": item.community_size,
            "activity_level": activity,
            "contact_email": contact.email,
            "contact_kakao": contact.kakao,
            "contact_naver_cafe": contact.naver_cafe,
            "contact_blog": contact.blog,
            "contact_instagram": contact.instagram,
            "contact_youtube": contact.youtube,
            "best_content_id": item.content_id,
            "best_content_title": item.content_title,
            "best_content_views": item.views,
            "best_content_published_at": item.published_at.isoformat() if item.published_at else None,
            "is_seller_content": bool(ai_result.get("is_seller_content")),
            "is_educational": bool(ai_result.get("is_educational")),
            "content_summary": (ai_result.get("content_summary") or "")[:200],
            "ai_confidence": ai_result.get("confidence", "low"),
            **conv,
            **risk,
            "score": total,
            "grade": grade,
            "score_breakdown": breakdown,
            "status": status,
            "last_scanned_at": datetime.now(timezone.utc).isoformat(),
        }

        lead_id = _upsert_lead(tenant_id, payload)
        if lead_id:
            leads_upserted += 1
            content_id_to_lead_id[item.content_id] = lead_id

            # 이메일 없으면 채널 외부 링크 크롤링으로 이메일 수집 시도 (YouTube만)
            if not contact.email and platform == "youtube":
                try:
                    from app.services.email_link_crawler import find_email_from_channel_links
                    channel_id = item.platform_id  # YouTube channel ID
                    crawled_email = find_email_from_channel_links(channel_id, "", delay=0.3)
                    if crawled_email:
                        contact.email = crawled_email
                        _db().table("outreach_leads").update({
                            "contact_email": crawled_email,
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("tenant_id", tenant_id).eq("id", lead_id).execute()
                        logger.info("[pipeline] 링크 크롤링 이메일 수집 [%s] → %s", item.handle_name, crawled_email)
                except Exception as e:
                    logger.debug("[pipeline] 링크 크롤링 실패 [%s]: %s", item.platform_id, e)

            # 터치포인트 예약 (A/S급만, email 있어야 의미 있음)
            if grade in ("S", "A") and contact.email:
                _schedule_touchpoints(
                    tenant_id,
                    lead_id,
                    has_email=bool(contact.email),
                    has_instagram=bool(contact.instagram),
                    has_cafe=bool(contact.naver_cafe),
                )

    # 스캔 기록
    mark_scanned(tenant_id, platform, scan_result.get("new_content_ids", []), content_id_to_lead_id)

    result = {
        "ok": True,
        "platform": platform,
        "total_searched": scan_result.get("total_searched", 0),
        "new_content": scan_result.get("new_items", 0),
        "gate_passed": gate_passed,
        "leads_upserted": leads_upserted,
    }
    logger.info("[pipeline] %s 완료: %s", platform, result)
    return result


def run_all_platforms(tenant_id: str) -> dict:
    """모든 활성 플랫폼 순차 스캔(테넌트 스코프, 테넌트 키 보유 플랫폼만)."""
    from app.services.secrets import get_tenant_secret
    results = []

    if get_tenant_secret(tenant_id, "youtube_api_key"):
        results.append(run_platform_scan(tenant_id, "youtube"))
    if get_tenant_secret(tenant_id, "naver_client_id"):
        results.append(run_platform_scan(tenant_id, "naver_blog"))

    total_leads = sum(r.get("leads_upserted", 0) for r in results)
    logger.info("[pipeline] 전체 스캔 완료 — 총 리드 %d건", total_leads)
    return {"ok": True, "platforms": results, "total_leads_upserted": total_leads}


def auto_analyze_pending(tenant_id: str, limit: int = 5) -> dict:
    """스케줄러용: discovered/stuck-analyzing 리드를 매 사이클 N개씩 자동 분석(테넌트 스코프).

    분석 완료 → channel_analyzer가 grade에 따라 status=approved/draft_ready로 업데이트.
    cold_drip 스케줄러가 approved 리드를 다음 사이클에 자동 픽업.
    """
    import time
    from app.db.maesil_total_client import get_maesil_total_client

    db = get_maesil_total_client().schema("agent_work")
    resp = (
        db.table("outreach_leads")
        .select("id")
        .eq("tenant_id", tenant_id)
        .in_("status", ["discovered", "analyzing"])
        .order("score", desc=True)
        .limit(limit)
        .execute()
    )
    ids = [r["id"] for r in (resp.data or [])]
    if not ids:
        return {"analyzed": 0}

    from app.services.channel_analyzer import analyze_lead
    ok = 0
    for lead_id in ids:
        try:
            analyze_lead(tenant_id, lead_id)
            ok += 1
        except Exception as e:
            logger.warning("[auto-analyze] 실패 [%s]: %s", lead_id, e)
        time.sleep(0.5)

    logger.info("[auto-analyze] %d/%d건 처리 완료", ok, len(ids))
    return {"analyzed": ok}
