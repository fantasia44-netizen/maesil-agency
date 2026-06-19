"""
outreach_agency_analyzer.py — 광고대행사 AI 심층 분석 + 맞춤 브리핑 생성.

analyze_agency_lead(lead_id):
  1. 대행사 웹사이트 크롤링 (홈/서비스/클라이언트 페이지)
  2. Naver Shopping API로 주요 클라이언트 광고 지표 샘플
  3. Claude Sonnet 진단 → 통증 포인트 특정 + 브리핑 HTML 생성
  4. DB 업데이트 (agency_briefing JSONB, email_draft, status=approved)
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_SCRAPE_TIMEOUT = 8  # 초
_SCRAPE_PATHS = ["/", "/about", "/services", "/clients", "/portfolio", "/work", "/company"]

# 직원 수 / 팀 규모 힌트 패턴
_TEAM_RE = re.compile(r"(\d+)\s*(?:명|인|people|employees|staff|팀원|명의\s*전문가)", re.I)
# 클라이언트 수 힌트 패턴
_CLIENT_COUNT_RE = re.compile(r"(\d+)\s*(?:\+?\s*(?:개|곳|사|brands?|clients?|고객|브랜드|파트너))", re.I)
# 운영 연수 패턴
_YEAR_RE = re.compile(r"(20\d{2})\s*년?\s*(?:설립|창업|founded|since|부터)", re.I)
# 인증 배지 키워드
_COUPANG_CERT = re.compile(r"쿠팡\s*(?:공식|인증|파트너|official|certified)", re.I)
_NAVER_CERT = re.compile(r"(?:네이버|naver)\s*(?:공식|인증|파트너|official|certified|saedu)", re.I)
# 클라이언트 사명 힌트 (대문자로 쓰인 브랜드명 리스트)
_BRAND_RE = re.compile(r"[A-Z가-힣][a-z가-힣A-Z]*(?:\s+[A-Z가-힣][a-z가-힣A-Z]*){0,2}", re.U)


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _anthropic_key() -> str:
    from app.services.secrets import get_secret
    return get_secret("anthropic_api_key") or ""


# ── 웹사이트 크롤링 ────────────────────────────────────────────────────

def _fetch_url(url: str) -> str:
    """단일 URL 텍스트 추출 (타임아웃 _SCRAPE_TIMEOUT초)."""
    try:
        import httpx
        r = httpx.get(url, timeout=_SCRAPE_TIMEOUT, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0 (compatible; maesil-outreach-bot/1.0)"})
        if r.status_code != 200:
            return ""
        # HTML 태그 제거 + 정규화
        text = re.sub(r"<style[^>]*>.*?</style>", " ", r.text, flags=re.S)
        text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text[:4000]  # 페이지당 최대 4K
    except Exception as e:
        logger.debug("_fetch_url 실패 [%s]: %s", url, e)
        return ""


def _crawl_agency(domain: str) -> dict:
    """대행사 도메인 크롤링 → 구조화된 정보 반환."""
    base = domain.rstrip("/")
    if not base.startswith("http"):
        base = "https://" + base

    pages: list[str] = []
    for path in _SCRAPE_PATHS:
        text = _fetch_url(base + path)
        if text:
            pages.append(text)
        if len(pages) >= 4:  # 최대 4페이지
            break

    combined = " ".join(pages)[:12000]  # 전체 최대 12K

    # 구조화 추출
    team_size: int | None = None
    m = _TEAM_RE.search(combined)
    if m:
        try:
            team_size = int(m.group(1))
        except ValueError:
            pass

    client_count: int | None = None
    m = _CLIENT_COUNT_RE.search(combined)
    if m:
        try:
            client_count = int(m.group(1))
        except ValueError:
            pass

    founded_year: int | None = None
    m = _YEAR_RE.search(combined)
    if m:
        try:
            founded_year = int(m.group(1))
        except ValueError:
            pass

    coupang_certified = bool(_COUPANG_CERT.search(combined))
    naver_certified = bool(_NAVER_CERT.search(combined))

    return {
        "raw_text": combined,
        "team_size": team_size,
        "client_count": client_count,
        "founded_year": founded_year,
        "coupang_certified": coupang_certified,
        "naver_certified": naver_certified,
        "pages_fetched": len(pages),
    }


# ── Naver Shopping 클라이언트 샘플 조회 ──────────────────────────────

def _sample_client_ads(client_name: str) -> dict | None:
    """Naver Shopping API로 클라이언트 스토어 광고 지표 샘플 조회."""
    try:
        from app.services.secrets import get_secret
        from app.config import settings
        insight_url = (get_secret("maesil_insight_url") or settings.maesil_insight_url or "").rstrip("/")
        token = (get_secret("harness_api_token") or settings.harness_api_token or "")
        if not insight_url or not token:
            return None

        import httpx
        resp = httpx.post(
            f"{insight_url}/api/v1/naver/shopping-search",
            json={"keyword": client_name, "display": 10},
            headers={"Authorization": f"Bearer {token}"},
            timeout=8,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        sellers = data.get("sellers") or []
        if not sellers:
            return None

        # 가장 연관성 높은 seller 반환
        top = sellers[0]
        return {
            "mall_name": top.get("mall_name"),
            "best_rank": top.get("best_rank"),
            "product_count": top.get("product_count"),
            "categories": top.get("categories", [])[:3],
        }
    except Exception as e:
        logger.debug("_sample_client_ads 실패 [%s]: %s", client_name, e)
        return None


# ── Sonnet 진단 ────────────────────────────────────────────────────────

def _sonnet_diagnose(lead: dict, crawl: dict) -> dict:
    """Claude Sonnet으로 대행사 AI 진단 + 맞춤 브리핑 HTML 생성."""
    import anthropic

    client = anthropic.Anthropic(api_key=_anthropic_key())

    company_name = lead.get("handle_name") or "대행사"
    domain = lead.get("platform_url") or ""
    channel_type = lead.get("channel_type") or ""
    email = lead.get("contact_email") or ""

    raw_text = crawl.get("raw_text") or ""
    team_size = crawl.get("team_size")
    client_count = crawl.get("client_count")
    founded_year = crawl.get("founded_year")
    coupang_cert = crawl.get("coupang_certified", False)
    naver_cert = crawl.get("naver_certified", False)
    pages_fetched = crawl.get("pages_fetched", 0)

    cert_str = []
    if coupang_cert:
        cert_str.append("쿠팡 공식 파트너")
    if naver_cert:
        cert_str.append("네이버 공식 파트너")
    cert_text = ", ".join(cert_str) if cert_str else "인증 정보 미확인"

    ch_label = {
        "coupang_official": "쿠팡 공식 광고대행사",
        "naver_official": "네이버 공식 광고대행사",
        "ad_agency": "광고대행사",
    }.get(channel_type, "광고대행사")

    # 웹사이트 텍스트 요약 (최대 3K)
    site_excerpt = raw_text[:3000] if raw_text else "웹사이트 접근 불가"
    site_status = f"{pages_fetched}개 페이지 수집됨" if pages_fetched else "웹사이트 접근 실패"

    prompt = f"""당신은 매실인사이트 Agency 영업 담당자입니다.
아래 광고대행사 정보를 분석해 **현실적인 고통 포인트 진단** + **맞춤 브리핑 HTML**을 생성하세요.

## 대행사 정보
- 회사명: {company_name}
- 분류: {ch_label}
- 도메인: {domain}
- 이메일: {email if email else "미확인"}
- 인증: {cert_text}
- 팀 규모: {f"{team_size}명 추정" if team_size else "미확인"}
- 관리 클라이언트 수: {f"{client_count}개 추정" if client_count else "미확인"}
- 설립 연도: {founded_year if founded_year else "미확인"}

## 웹사이트 수집 ({site_status})
{site_excerpt}

## 매실인사이트 Agency 제품 정보
- 쿠팡·네이버 광고 데이터 자동 수집 → AI 분석 리포트
- 화이트라벨: 대행사 로고 삽입 (Pro) / 매실 흔적 없음 (Elite)
- 고객사별 리포트 10분 자동 생성 (vs 수작업 2-3시간)
- 저성과 캠페인 자동 감지 + 예산 재배분 제안
- API 키 연동만으로 5분 내 시작

## 분석 요청
1. **diagnosis**: 이 대행사가 현재 겪고 있을 **구체적인 운영 고통 3가지** (사이트 내용 기반, 추론 가능 시 클라이언트 수/팀 규모 언급)
2. **agency_profile**: 이 대행사의 특징 2-3문장 (무엇을 잘 하는지, 어떤 클라이언트를 갖는지)
3. **pitch_angle**: 이 대행사에 매실인사이트 Agency를 팔 때 가장 효과적인 각도 (1-2문장, 구체적으로)
4. **email_subject**: 제목 (50자 이내, 담당자 이름 없이 회사명만, 친근하고 구체적)
5. **email_intro**: 첫 접촉 이메일 인사 문단 (3-4문장, 사이트에서 발견한 구체적 내용 1가지 언급, "안녕하세요, {company_name} 담당자님 👋"으로 시작)
6. **briefing_sections**: 브리핑 섹션 3개 — 각 section에 title(string), body(string) 포함

JSON만 반환하세요:
{{
  "diagnosis": ["고통1", "고통2", "고통3"],
  "agency_profile": "...",
  "pitch_angle": "...",
  "email_subject": "...",
  "email_intro": "...",
  "briefing_sections": [
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}},
    {{"title": "...", "body": "..."}}
  ]
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error("Sonnet 진단 실패 [%s]: %s", company_name, e)
        return {}


# ── 브리핑 HTML 생성 ──────────────────────────────────────────────────

def _build_briefing_html(lead: dict, ai: dict, crawl: dict) -> str:
    """진단 결과 → 전송 가능한 브리핑 HTML."""
    import html as _html

    company = _html.escape(lead.get("handle_name") or "대행사")
    domain = lead.get("platform_url") or ""
    cert_badges = []
    if crawl.get("coupang_certified"):
        cert_badges.append('<span style="background:#eb4034;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">쿠팡 공식</span>')
    if crawl.get("naver_certified"):
        cert_badges.append('<span style="background:#03c75a;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">네이버 공식</span>')

    diagnosis = ai.get("diagnosis") or []
    agency_profile = _html.escape(ai.get("agency_profile") or "")
    pitch_angle = _html.escape(ai.get("pitch_angle") or "")
    sections = ai.get("briefing_sections") or []

    diagnosis_html = "".join(
        f'<li style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#374151;font-size:14px">'
        f'<strong style="color:#ef4444">💢</strong> {_html.escape(d)}</li>'
        for d in diagnosis
    )

    sections_html = ""
    for sec in sections:
        sections_html += f"""
<div style="margin-bottom:20px;padding:18px 22px;background:#f8fafc;border-radius:10px;border-left:4px solid #4f46e5">
  <h3 style="margin:0 0 10px;color:#4f46e5;font-size:15px">{_html.escape(sec.get("title",""))}</h3>
  <p style="margin:0;color:#374151;font-size:14px;line-height:1.7">{_html.escape(sec.get("body",""))}</p>
</div>"""

    team_info = ""
    if crawl.get("team_size") or crawl.get("client_count") or crawl.get("founded_year"):
        parts = []
        if crawl.get("founded_year"):
            parts.append(f"설립 {crawl['founded_year']}년")
        if crawl.get("team_size"):
            parts.append(f"팀 규모 약 {crawl['team_size']}명")
        if crawl.get("client_count"):
            parts.append(f"관리 클라이언트 {crawl['client_count']}개")
        team_info = f'<p style="font-size:12px;color:#64748b;margin:4px 0 0">{" · ".join(parts)}</p>'

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{{font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f1f5f9;margin:0;padding:20px}}
  .wrap{{max-width:660px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.10)}}
  .header{{background:linear-gradient(135deg,#0f0c29,#302b63 55%,#24243e);padding:36px 40px;text-align:center}}
  .header h1{{color:#fff;margin:0;font-size:22px;font-weight:800}}
  .header h1 em{{font-style:normal;color:#818cf8}}
  .header p{{color:rgba(255,255,255,.7);margin:8px 0 0;font-size:13px}}
  .body{{padding:34px 40px}}
  .section-title{{font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px}}
  .diagnosis-box{{background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:22px}}
  .profile-box{{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:22px;font-size:14px;color:#374151;line-height:1.7}}
  .pitch-box{{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:28px;font-size:14px;color:#1e40af;line-height:1.7;font-weight:500}}
  .cta{{text-align:center;margin:28px 0 12px}}
  .btn{{display:inline-block;background:#4f46e5;color:#fff!important;padding:14px 36px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:700}}
  .footer{{background:#f8fafc;border-top:1px solid #eee;padding:18px 40px;font-size:11.5px;color:#94a3b8;text-align:center;line-height:1.8}}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>매실인사이트 <em>Agency</em></h1>
    <p>{company} 맞춤 브리핑</p>
  </div>
  <div class="body">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:18px;font-weight:800;color:#0f172a">{company}</div>
        {team_info}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">{"".join(cert_badges)}</div>
    </div>

    <div class="section-title">현재 운영 상의 어려움 (AI 진단)</div>
    <div class="diagnosis-box">
      <ul style="margin:0;padding-left:20px;list-style:none">
        {diagnosis_html}
      </ul>
    </div>

    <div class="section-title">대행사 특징</div>
    <div class="profile-box">{agency_profile}</div>

    <div class="section-title">솔루션 적용 방향</div>
    <div class="pitch-box">💡 {pitch_angle}</div>

    <div class="section-title">매실인사이트 Agency로 해결하는 방법</div>
    {sections_html}

    <div class="cta">
      <a class="btn" href="https://maesil-insight.com/agency/landing?utm_source=outreach&utm_medium=briefing&utm_campaign={company}" target="_blank" rel="noopener">
        무료 데모 신청 →
      </a>
    </div>
    <p style="text-align:center;font-size:13px;color:#94a3b8;margin-top:8px">고객사 5개부터 무료 시작 · 5분 API 연동</p>

  </div>
  <div class="footer">
    매실인사이트 Agency · support@maesil-insight.com<br>
    <a href="{domain}" target="_blank" style="color:#94a3b8">{domain}</a>
  </div>
</div>
</body>
</html>"""


# ── 메인 엔트리포인트 ────────────────────────────────────────────────

def analyze_agency_lead(tenant_id: str, lead_id: str) -> dict:
    """
    광고대행사 리드 심층 분석 + 브리핑 생성(테넌트 스코프).
    outreach 라우터에서 백그라운드 스레드로 호출.
    """
    resp = _db().table("outreach_leads").select("*").eq("tenant_id", tenant_id).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        return {"ok": False, "error": "lead not found"}

    lead = rows[0]
    company = lead.get("handle_name", lead_id)
    domain = (lead.get("platform_url") or "").replace("https://", "").replace("http://", "").split("/")[0]

    logger.info("[agency_analyze] 시작: %s (%s)", company, domain)

    # 1. 웹사이트 크롤링
    crawl: dict = {}
    if domain:
        try:
            crawl = _crawl_agency(domain)
            logger.info("[agency_analyze] 크롤 완료: %s — %d페이지, 팀=%s, 클라이언트=%s",
                        company, crawl.get("pages_fetched", 0),
                        crawl.get("team_size"), crawl.get("client_count"))
        except Exception as e:
            logger.warning("[agency_analyze] 크롤 실패 (계속 진행): %s", e)
            crawl = {}

    # 2. Sonnet 진단
    ai = _sonnet_diagnose(lead, crawl)
    if not ai:
        logger.error("[agency_analyze] Sonnet 실패 [%s]", company)
        return {"ok": False, "error": "AI 진단 실패"}

    # 3. 브리핑 HTML 생성
    briefing_html = _build_briefing_html(lead, ai, crawl)

    # 4. DB 저장
    now = datetime.now(timezone.utc).isoformat()
    _preserve = {"emailed", "no_reply", "replied", "negotiating", "deal", "rejected", "archived"}
    current_status = lead.get("status") or "discovered"
    next_status = current_status if current_status in _preserve else "approved"

    agency_briefing = {
        "diagnosis": ai.get("diagnosis") or [],
        "agency_profile": ai.get("agency_profile") or "",
        "pitch_angle": ai.get("pitch_angle") or "",
        "briefing_sections": ai.get("briefing_sections") or [],
        "crawl_meta": {
            "pages_fetched": crawl.get("pages_fetched", 0),
            "team_size": crawl.get("team_size"),
            "client_count": crawl.get("client_count"),
            "founded_year": crawl.get("founded_year"),
            "coupang_certified": crawl.get("coupang_certified", False),
            "naver_certified": crawl.get("naver_certified", False),
        },
        "briefing_html": briefing_html,
        "generated_at": now,
    }

    try:
        _db().table("outreach_leads").update({
            "agency_briefing": agency_briefing,
            "email_subject": ai.get("email_subject", "")[:120] or None,
            "email_draft": ai.get("email_intro") or None,
            "approach_strategy": ai.get("pitch_angle", "")[:300] or None,
            "content_summary": ai.get("agency_profile", "")[:500] or None,
            "status": next_status,
            "updated_at": now,
        }).eq("tenant_id", tenant_id).eq("id", lead_id).execute()
        logger.info("[agency_analyze] 완료: %s → status=%s", company, next_status)
    except Exception as e:
        logger.error("[agency_analyze] DB 저장 실패 [%s]: %s", company, e)
        return {"ok": False, "error": str(e)}

    return {
        "ok": True,
        "lead_id": lead_id,
        "diagnosis_count": len(ai.get("diagnosis") or []),
        "crawl_pages": crawl.get("pages_fetched", 0),
    }
