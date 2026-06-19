"""
outreach_mailer — 파트너십 이메일 발송.

send_single(lead_id): 특정 리드에게 맞춤 이메일 발송
  - email_final (담당자 편집본) 우선 사용
  - 없으면 email_draft (AI 초안) 사용
  - 둘 다 없으면 기본 템플릿 생성
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


# ── 기본 HTML 템플릿 (email_draft 없을 때 fallback) ──────────────────

def _build_email_html(handle_name: str, platform_url: str, summary: str) -> str:
    import html as _html
    safe_handle = _html.escape(handle_name)
    # summary = 개인화 오프너(상대 영상 칭찬). 있으면 그걸 오프너로, 없으면 일반 인사.
    if summary:
        opener = _html.escape(summary)
    else:
        opener = f"<strong>{safe_handle}</strong> 채널 잘 보고 있습니다."

    from app.config import settings
    maepas_url = settings.outreach_maepas_url or "https://maesil-insight.com/partners"
    cases_url = settings.outreach_cases_url or "https://maesil-insight.com/cases"

    # 희소성 후킹 — OUTREACH_BETA_SLOTS>0 일 때만 (거짓 희소성 방지)
    _slots = settings.outreach_beta_slots
    scarcity_block = (
        f'<div style="background:#fff7ed;border:1px dashed #fb923c;border-radius:8px;'
        f'padding:12px 16px;margin:20px 0;font-size:13.5px;color:#9a3412;text-align:center">'
        f'⏳ 현재 셀러 유튜버 <strong>{_slots}팀만</strong> 테스트 파트너로 모집 중입니다.</div>'
    ) if _slots and _slots > 0 else ""

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family: 'Apple SD Gothic Neo','Malgun Gothic',sans-serif; background:#f5f5f5; margin:0; padding:20px; }}
  .wrap {{ max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }}
  .header {{ background:linear-gradient(135deg,#1A6F3C,#2eaa5e); padding:36px 40px; text-align:center; }}
  .header h1 {{ color:#fff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px; }}
  .header p {{ color:rgba(255,255,255,.85); margin:8px 0 0; font-size:14px; }}
  .body {{ padding:36px 40px; }}
  .greeting {{ font-size:15px; color:#333; line-height:1.8; }}
  .case-box {{ background:#fff8e1; border:1px solid #ffe082; border-radius:10px; padding:20px 24px; margin:24px 0; }}
  .case-box .case-title {{ color:#e65100; font-size:13px; font-weight:700; letter-spacing:0.5px; margin:0 0 10px; text-transform:uppercase; }}
  .case-box .case-stat {{ font-size:26px; font-weight:800; color:#1A6F3C; margin:6px 0; }}
  .case-box .case-desc {{ font-size:13px; color:#555; margin:8px 0 0; line-height:1.7; }}
  .divider {{ border:none; border-top:1px solid #eee; margin:28px 0; }}
  .highlight {{ background:#f0faf4; border-left:4px solid #2eaa5e; padding:18px 22px; border-radius:6px; margin:24px 0; }}
  .highlight h3 {{ color:#1A6F3C; margin:0 0 12px; font-size:15px; font-weight:700; }}
  .highlight ul {{ margin:0; padding-left:20px; color:#444; font-size:14px; line-height:2; }}
  .earning-box {{ background:#f8f8ff; border:1px solid #c5cae9; border-radius:10px; padding:18px 22px; margin:24px 0; }}
  .earning-box .earn-title {{ font-size:13px; color:#3949ab; font-weight:700; margin:0 0 12px; }}
  .earning-box table {{ width:100%; border-collapse:collapse; font-size:14px; }}
  .earning-box td {{ padding:5px 0; color:#444; }}
  .earning-box td:last-child {{ text-align:right; font-weight:600; color:#1A6F3C; }}
  .earning-box .earn-total {{ border-top:1px solid #c5cae9; margin-top:10px; padding-top:10px; font-size:15px; font-weight:700; color:#1A6F3C; display:flex; justify-content:space-between; }}
  .cta {{ text-align:center; margin:32px 0 20px; }}
  .btn {{ display:inline-block; background:#1A6F3C; color:#fff !important; padding:15px 36px; border-radius:30px; text-decoration:none; font-size:15px; font-weight:700; letter-spacing:-0.2px; }}
  .sub-note {{ text-align:center; font-size:13px; color:#888; margin-top:10px; }}
  .footer {{ background:#f9f9f9; border-top:1px solid #eee; padding:20px 40px; font-size:12px; color:#999; text-align:center; line-height:1.8; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>실제 셀러가 만든 쿠팡·네이버 광고 분석 도구</h1>
    <p>{safe_handle}님께 Pro 1년 무료로 드립니다</p>
  </div>
  <div class="body">
    <p class="greeting">
      안녕하세요, <strong>{safe_handle}</strong>님 👋<br>
      {opener}<br><br>
      이 메일은 단순 협찬 제안이 아닙니다. 실제 셀러가 자신의 <strong>쿠팡·스마트스토어</strong>를
      성장시키려고 직접 만든 광고 분석 도구를, <strong>{safe_handle}</strong>님께 <strong>무료로</strong>
      드리고 싶어 연락드렸습니다.
    </p>

    <div class="case-box">
      <div class="case-title">📈 실제 사례</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
        <div style="flex:1;min-width:200px">
          <div class="case-stat">광고비 −75%</div>
          <div style="font-size:13px;color:#555;margin-top:4px;line-height:1.6">
            ROAS <b>482% → 1,080%</b><br>쿠팡 광고 최적화 (3개월)
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div class="case-stat">44위 → 8위</div>
          <div style="font-size:13px;color:#555;margin-top:4px;line-height:1.6">
            네이버 식품 카테고리 키워드<br>1개월
          </div>
        </div>
      </div>
      <div style="margin-top:12px">
        <a href="{cases_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener" style="color:#1A6F3C;font-weight:600;font-size:13px;text-decoration:none">실제 사례 자세히 보기 →</a>
      </div>
    </div>

    <p class="greeting">
      이 데이터를 공개하려는 게 아닙니다.<br>
      <strong>{safe_handle}</strong>님이 직접 써보며 <strong>본인만의 실제 사례와 콘텐츠</strong>를 만들 수 있도록
      <strong>Pro 버전을 1년 무료</strong>로 드리려는 겁니다.
    </p>

    <hr class="divider">

    <div class="highlight">
      <h3>이렇게 활용하실 수 있어요</h3>
      <ul>
        <li><strong>① 영상 소재</strong> — "광고비 줄이는 과정", "키워드 순위 올리는 과정"이 그대로 영상 콘텐츠가 됩니다</li>
        <li><strong>② 직접 실적</strong> — 광고비·키워드·순위·매출 데이터를 직접 분석해 실제 결과를</li>
        <li><strong>③ 구독자에게 실제 도움</strong> — 실제 데이터로 설명 → 채널 신뢰도↑</li>
        <li><strong>④ 광고 수익</strong> — 콘텐츠가 늘면 조회수·광고 수익도 함께 증가할 수 있습니다</li>
        <li><strong>⑤ 파트너 수익</strong> — 아래 매파스로 부가수익까지</li>
      </ul>
    </div>

    <div class="earning-box">
      <div class="earn-title">🤝 매파스(매실 파트너스) — 쿠팡파트너스, 아시죠?</div>
      <p style="font-size:13.5px;color:#444;line-height:1.7;margin:0 0 12px">
        쿠팡파트너스처럼 매실인사이트도 <strong>매파스</strong>를 운영합니다.
        내 추천으로 구독자가 가입하면 <strong>첫 결제 20% + 재구독 10%</strong> 커미션을 드립니다.
      </p>
      <table>
        <tr><td>10유저 유지 시</td><td>매월 약 20만원 <span style="color:#888;font-weight:400">(1년 약 258만원)</span></td></tr>
        <tr><td>100유저 유지 시</td><td>매월 약 200만원 <span style="color:#888;font-weight:400">(1년 약 2,587만원)</span></td></tr>
      </table>
      <div style="font-size:11.5px;color:#888;margin-top:8px">※ 그로스 플랜(199,000원/월)·재구독 10% 기준 예시 — 구독 유지 시 매월 정산</div>
      <div style="margin-top:12px">
        <a href="{maepas_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener" style="color:#3949ab;font-weight:600;font-size:13px;text-decoration:none">매파스 자세히 보기 →</a>
      </div>
    </div>

    {scarcity_block}

    <div class="cta">
      <a class="btn" href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener">
        카카오 오픈톡으로 이야기하기 💬
      </a>
    </div>
    <p class="sub-note">관심 있으시면 편하게 이야기 나누고 싶습니다 · 부담 없이 문의해 주세요</p>

    <p style="font-size:11.5px;color:#9ca3af;line-height:1.7;margin-top:20px">
      ※ 위 사례·수익은 개인의 결과 및 예시이며, 성과는 운영 상황에 따라 다를 수 있습니다.
    </p>
  </div>
</div>
</body>
</html>"""


def _draft_to_html(draft_text: str) -> str:
    """plain text 초안 → HTML 래핑."""
    escaped = draft_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    body = escaped.replace("\n", "<br>")
    return f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f5f5f5;margin:0;padding:20px}}
.wrap{{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:36px 40px;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
p{{font-size:15px;color:#333;line-height:1.8}}
.footer{{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#999}}
</style></head>
<body><div class="wrap">
<p>{body}</p>
<div class="footer">매실인사이트 | 수신을 원치 않으시면 "수신거부"로 회신해 주세요.</div>
</div></body></html>"""


def _build_subject(handle_name: str, channel_type: str | None = None) -> str:
    # 운영자가 OUTREACH_INFLUENCER_SUBJECT 로 직접 통제 가능.
    # 미설정 시 채널 타입별 개인화 제목 사용.
    from app.config import settings
    if settings.outreach_influencer_subject:
        tmpl = settings.outreach_influencer_subject
        try:
            return tmpl.format(handle=handle_name)
        except Exception:
            return tmpl
    # 채널 타입별 제목
    subject_map = {
        "educator":        f"{handle_name}님 강의 보고 연락드립니다",
        "reviewer":        f"{handle_name}님 리뷰 보고 연락드립니다",
        "case_sharer":     f"{handle_name}님 사례 영상 보고 연락드립니다",
        "tool_expert":     f"{handle_name}님 채널 보고 연락드립니다",
        "community_admin": f"{handle_name} 커뮤니티 보고 연락드립니다",
        "influencer":      f"{handle_name}님 채널 보고 연락드립니다",
    }
    return subject_map.get(channel_type or "", f"{handle_name}님 채널 보고 연락드립니다")


# ── 광고대행사 전용 템플릿 (maesil-insight Agency 채널) ──────────────────

def _build_agency_subject(company_name: str) -> str:
    # 제목 카피는 운영자가 OUTREACH_AGENCY_SUBJECT 로 직접 통제.
    from app.config import settings
    tmpl = settings.outreach_agency_subject or "무료체험 — {company}님 네이버·쿠팡 광고 리포트 10분 자동화"
    try:
        return tmpl.format(company=company_name)
    except Exception:
        return tmpl


def _build_agency_email_html(company_name: str, summary: str = "") -> str:
    """광고대행사 대상 제안 메일.
    포지셔닝: '대행사 없이 직접'(인플루언서용)과 반대 — 대행사 업무를 돕는 도구.
    실제 제품 설계 기준(C:/maesil-insight templates/agency/landing.html):
      브랜드 인디고(#4f46e5), 화이트라벨(Pro=대행사 로고 / Elite=매실 흔적 없음),
      CTA → /agency/register (무료 신청).
    """
    import html as _html
    safe = _html.escape(company_name or "대표")
    intro = (
        f"<p style='color:#555;font-size:14px;line-height:1.8'>{_html.escape(summary)}</p>"
        if summary else ""
    )
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif; background:#f1f5f9; margin:0; padding:20px; }}
  .wrap {{ max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }}
  .header {{ background:linear-gradient(135deg,#0f0c29,#302b63 55%,#24243e); padding:36px 40px; text-align:center; }}
  .header h1 {{ color:#fff; margin:0; font-size:21px; font-weight:800; letter-spacing:-0.5px; }}
  .header h1 em {{ font-style:normal; color:#818cf8; }}
  .header p {{ color:rgba(255,255,255,.72); margin:10px 0 0; font-size:13.5px; }}
  .body {{ padding:34px 40px; }}
  .greeting {{ font-size:15px; color:#1e293b; line-height:1.8; }}
  .pain {{ background:#fff8f0; border-left:4px solid #ef4444; padding:14px 18px; border-radius:8px; margin:22px 0; font-size:13.5px; color:#64748b; line-height:1.7; }}
  .highlight {{ background:#eef2ff; border-left:4px solid #4f46e5; padding:18px 22px; border-radius:8px; margin:22px 0; }}
  .highlight h3 {{ color:#4f46e5; margin:0 0 12px; font-size:15px; font-weight:700; }}
  .highlight ul {{ margin:0; padding-left:20px; color:#374151; font-size:14px; line-height:2; }}
  .cta {{ text-align:center; margin:30px 0 12px; }}
  .btn {{ display:inline-block; background:#4f46e5; color:#fff !important; padding:15px 38px; border-radius:9px; text-decoration:none; font-size:15px; font-weight:700; }}
  .sub-note {{ text-align:center; font-size:13px; color:#94a3b8; margin-top:10px; }}
  .footer {{ background:#f8fafc; border-top:1px solid #eee; padding:20px 40px; font-size:12px; color:#94a3b8; text-align:center; line-height:1.8; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>매실인사이트 <em>Agency</em></h1>
    <p>광고비는 줄이고, 클라이언트 성과는 키우고</p>
  </div>
  <div class="body">
    <p class="greeting">
      안녕하세요, <strong>{safe}</strong> 담당자님 👋<br>
      {intro}
    </p>

    <div class="pain">
      고객사마다 네이버·쿠팡 광고 데이터를 엑셀로 취합하고,
      클라이언트 미팅 전날 보고서 만드느라 밤 새우신 적 없으신가요?
    </div>

    <p class="greeting">
      <strong>매실인사이트 Agency</strong>는 네이버·쿠팡 광고 성과를 매일 자동 수집해
      <strong>대행사 로고가 들어간 분석 리포트를 10분 만에</strong> 만들어 드리는 대행사 전용 플랫폼입니다.
    </p>

    <div class="highlight">
      <h3>📊 대행사가 실제로 얻는 것</h3>
      <ul>
        <li><strong>리포트 자동화</strong> — 수작업 보고서 2~3시간 → <strong>클릭 한 번 10분</strong> (PDF·엑셀)</li>
        <li><strong>화이트라벨</strong> — 대행사 로고 삽입, Elite는 매실 흔적 없는 100% 자체 브랜드</li>
        <li><strong>광고비 절감</strong> — 저성과 캠페인 자동 감지 + 예산 재배분 제안</li>
        <li><strong>클라이언트 신뢰</strong> — ROAS·전환율 추이를 데이터로 제시 → 증액 제안도 쉽게</li>
      </ul>
    </div>

    <p class="greeting">
      API 키만 연동하면 5분 만에 시작, 고객사를 직접 등록해 <strong>무료로 먼저 체험</strong>하실 수 있습니다.
    </p>

    <div class="cta">
      <a class="btn" href="https://maesil-insight.com/agency/landing?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener">
        무료로 시작하기 →
      </a>
    </div>
    <p class="sub-note">고객사 5개부터 시작 · 부담 없이 먼저 써보세요</p>
  </div>
  <div class="footer">
    매실인사이트 | Agency 팀 · support@maesil-insight.com<br>
    수신을 원치 않으시면 이 메일에 "수신거부"라고 회신해 주세요.
  </div>
</div>
</body>
</html>"""


def _is_agency_lead(lead: dict) -> bool:
    return lead.get("platform") == "ad_agency" or lead.get("channel_type") == "ad_agency"


# ── 발송 함수 ────────────────────────────────────────────────────────

def _rewrite_kakao_link(html: str, lead_id: str | None) -> str:
    """본문의 오픈톡 링크를 클릭추적 redirect로 치환 (누가 눌렀는지 집계)."""
    from app.config import settings
    base = (settings.unsubscribe_base_url or "").rstrip("/")
    kakao = settings.outreach_kakao_url
    if not base or not lead_id or not kakao or kakao not in html:
        return html
    return html.replace(kakao, f"{base}/api/outreach/r?lid={lead_id}")


def build_lead_email(lead: dict) -> tuple[str, str]:
    """리드 → (subject, html). (광고)·전송자/수신거부 푸터·개인화·클릭추적 모두 적용.
    발송 직전용. 게이트웨이/Gmail 양쪽에서 공통 사용."""
    from app.services.outreach_suppression import with_ad_subject, inject_compliance_footer
    is_agency = _is_agency_lead(lead)
    handle = lead.get("handle_name") or ("대행사" if is_agency else "파트너 채널")
    subject = lead.get("email_subject") or (
        _build_agency_subject(handle) if is_agency
        else _build_subject(handle, lead.get("channel_type"))
    )
    if lead.get("email_final"):
        html = _draft_to_html(lead["email_final"])
    elif is_agency:
        html = _build_agency_email_html(handle, lead.get("email_draft") or "")
    else:
        intro = lead.get("email_draft")
        if not intro:
            try:
                from app.services.outreach_personalize import build_personal_intro
                intro = build_personal_intro(lead)
            except Exception:
                intro = None
        html = _build_email_html(handle, lead.get("platform_url") or "", intro or "")

    from app.services.outreach_suppression import inject_open_pixel
    subject = with_ad_subject(subject)
    html = inject_compliance_footer(lead.get("tenant_id") or "", html, lead.get("contact_email") or "")
    html = inject_open_pixel(html, lead.get("id") or "")
    html = _rewrite_kakao_link(html, lead.get("id"))
    return subject, html


def send_single(tenant_id: str, lead_id: str) -> dict:
    """특정 리드에게 이메일 발송(테넌트 스코프). email_final → email_draft → 기본 템플릿 순서."""
    from app.services.notify_client import send_email

    resp = _db().table("outreach_leads").select("*").eq("tenant_id", tenant_id).eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        return {"ok": False, "error": "lead not found"}

    lead = rows[0]
    to = lead.get("contact_email")
    if not to:
        return {"ok": False, "error": "이메일 주소 없음"}

    # 수신거부/차단 목록 발송 전 차단 (테넌트 스코프)
    from app.services.outreach_suppression import is_suppressed
    if is_suppressed(tenant_id, to):
        logger.info("outreach_mailer: 발송 차단(suppressed) → %s", to)
        return {"ok": False, "error": "수신거부/차단된 수신자", "suppressed": True}

    handle = lead.get("handle_name") or "파트너 채널"
    subject, html = build_lead_email(lead)

    result = send_email(to=to, subject=subject, html=html, source="maesil-agency")

    if result.get("ok"):
        now = datetime.now(timezone.utc).isoformat()
        try:
            _db().table("outreach_leads").update({
                "status": "emailed",
                "emailed_at": now,
                "updated_at": now,
            }).eq("tenant_id", tenant_id).eq("id", lead_id).execute()
        except Exception as e:
            logger.warning("outreach_mailer: emailed 상태 업데이트 실패: %s", e)

        # 1차 이메일 터치포인트 → sent 마킹 + 발송 제목/본문 기록
        try:
            _db().table("outreach_touchpoints").update({
                "status": "sent",
                "sent_at": now,
                "sent_subject": subject,
                "sent_body": html[:10000],
            }).eq("tenant_id", tenant_id).eq("lead_id", lead_id).eq("touch_sequence", 1).eq("status", "pending").execute()
        except Exception as e:
            logger.warning("outreach_mailer: touchpoint 상태 업데이트 실패: %s", e)

        logger.info("outreach_mailer: 발송 완료 [%s] → %s", handle, to)

    return result
