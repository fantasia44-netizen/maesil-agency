"""
outreach_agency_importer.py — 네이버/쿠팡 공식 광고대행사를 영업 리드로 적재.

인플루언서 스캐너와 달리 '대량 발굴'이 아니라 '공식 명단 큐레이션'이다.
명단은 플랫폼이 공개하는 유한한 인증 대행사 목록에서 시드한다.

흐름:
  curated list → (선택) 홈페이지에서 이메일 보강 → outreach_leads upsert (platform='ad_agency')

발송은 하지 않는다 — 리드는 'discovered' 상태로만 적재되고,
실제 발송은 기존 /api/outreach/leads/{id}/send (수동) 로 담당자가 검토 후 진행.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PLATFORM = "ad_agency"


# ── 공식 인증 대행사 시드 ──────────────────────────────────────────────
# 쿠팡 광고 인증 파트너사 (출처: https://ads.coupang.com/partner)
COUPANG_OFFICIAL: list[dict] = [
    {"name": "그로스인터랙티브",   "website": "gicorp.co.kr",        "phone": "02-2039-2231"},
    {"name": "광고명가",          "website": "adhaus.co.kr",        "phone": "070-4215-0501"},
    {"name": "WPP Media",        "website": "wppmedia.com",        "phone": "02-6200-1500"},
    {"name": "링크프라이스",       "website": "linkprice.com",       "phone": "02-3440-4960"},
    {"name": "메타애드",          "website": "meta-ad.com",         "phone": "02-854-5077"},
    {"name": "미래아이엔씨",       "website": "toup.net",            "phone": "02-6233-4700"},
    {"name": "아인스미디어",       "website": "einsmedia.co.kr",     "phone": "02-2088-8844"},
    {"name": "애드이피션시",       "website": "adef.co.kr",          "phone": "02-2038-0056"},
    {"name": "엠피인터랙티브",     "website": "mpinteractive.co.kr", "phone": "1599-1265"},
    {"name": "예지솔루션",         "website": "ye-ji.com",           "phone": "02-3446-0780"},
    {"name": "트리플하이엠",       "website": "hmcorp.co.kr",        "phone": "02-2039-3800"},
    {"name": "프로그레스미디어",   "website": "my-progress.co.kr",   "phone": "02-6261-5102"},
]

# 네이버 공식대행사 — saedu.naver.com/adbiz/agency 에서 수집 필요(JS 페이지).
# Chrome MCP 또는 수동 큐레이션으로 채운다. [{name, website, phone?}]
NAVER_OFFICIAL: list[dict] = []


_SOURCE_LABEL = {
    "coupang_official": "쿠팡 공식 인증",
    "naver_official": "네이버 공식",
}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _domain(website: str) -> str:
    """URL/도메인 문자열에서 호스트만 추출 (platform_id 용)."""
    w = (website or "").strip().lower()
    w = re.sub(r"^https?://", "", w)
    w = w.split("/")[0]
    return w.lstrip("www.") if w.startswith("www.") else w


def _enrich_email(website: str) -> str | None:
    """대행사 홈페이지에서 대표 이메일 best-effort 추출. 실패해도 무방."""
    from app.services.scanners.base import extract_contact
    import httpx
    domain = _domain(website)
    if not domain:
        return None
    for url in (f"https://{domain}", f"https://{domain}/contact", f"https://{domain}/company"):
        try:
            r = httpx.get(url, timeout=8, follow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0 (compatible; maesil-agency/1.0)"})
            if r.status_code == 200 and r.text:
                info = extract_contact(r.text)
                if info.email:
                    return info.email
        except Exception:
            continue
    return None


def import_agencies(tenant_id: str, entries: list[dict], source: str, enrich: bool = True) -> dict:
    """공식 대행사 목록을 outreach_leads에 upsert.

    entries: [{name, website, phone?}]
    source:  'coupang_official' | 'naver_official'
    enrich:  True면 홈페이지에서 이메일 보강 시도(없어도 적재됨).
    """
    label = _SOURCE_LABEL.get(source, source)
    now = datetime.now(timezone.utc).isoformat()
    upserted = 0
    enriched = 0
    rows_out = []

    for e in entries:
        name = (e.get("name") or "").strip()
        website = (e.get("website") or "").strip()
        if not name or not website:
            continue
        domain = _domain(website)
        phone = (e.get("phone") or "").strip()

        email = e.get("email")
        if enrich and not email:
            email = _enrich_email(website)
            if email:
                enriched += 1

        summary_bits = [f"{label} 광고대행사"]
        if phone:
            summary_bits.append(f"☎ {phone}")
        content_summary = " · ".join(summary_bits)

        payload = {
            "tenant_id": tenant_id,
            "platform": PLATFORM,
            "platform_id": domain,
            "platform_url": f"https://{domain}",
            "primary_platform": PLATFORM,
            "handle_name": name,
            # 출처를 구조화 → 쿠팡/네이버 대행사 필터 가능
            # (전체 대행사 = platform='ad_agency', 쿠팡만 = channel_type='coupang_official')
            "channel_type": source,
            "contact_email": email,
            "content_summary": content_summary,
            "is_seller_content": False,
            "ai_confidence": "high",          # 공식 인증 명단 → 신뢰 높음
            "score": 80,
            "grade": "A",                      # 공식 인증 = 고가치 리드
            "status": "discovered",
            "last_scanned_at": now,
            "updated_at": now,
        }
        try:
            resp = _db().table("outreach_leads").upsert(
                payload, on_conflict="tenant_id,platform,platform_id"
            ).execute()
            if resp.data:
                upserted += 1
                rows_out.append({"name": name, "domain": domain, "email": email})
        except Exception as ex:
            logger.warning("agency import 실패 [%s]: %s", name, ex)

    logger.info("[agency_import] %s: upserted=%d enriched_email=%d", source, upserted, enriched)
    return {"ok": True, "source": source, "upserted": upserted,
            "email_enriched": enriched, "leads": rows_out}


def import_coupang_official(tenant_id: str, enrich: bool = True) -> dict:
    return import_agencies(tenant_id, COUPANG_OFFICIAL, "coupang_official", enrich=enrich)


def import_naver_official(tenant_id: str, enrich: bool = True) -> dict:
    if not NAVER_OFFICIAL:
        return {"ok": False, "error": "NAVER_OFFICIAL 목록이 비어 있습니다 "
                "(saedu.naver.com 공식대행사 명단을 채워주세요)."}
    return import_agencies(tenant_id, NAVER_OFFICIAL, "naver_official", enrich=enrich)
