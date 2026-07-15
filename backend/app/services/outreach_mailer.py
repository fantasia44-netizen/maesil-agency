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
    """1차 콜드메일 v2 (2026-07 실데이터 기반 개정).

    v1 성과: 오픈 38.4% / 회신 0.8% — 열리는데 답이 없는 메일이었음.
    3~8회 재오픈한 리드 인터뷰·오프라인 영업 결과에서 확인된 회신을 막는 두 의심에 대응:
      ① 성능 의심("이게 진짜 되나") → 회사 주장 대신 자기검증 제안:
         7일 무료·카드등록 불필요(maesil-insight.com 실제 정책)로 본인 스토어 데이터 직접 확인.
      ② 이득 의심("나한테 그만큼 떨어지나") → 과장 수익표(연 2,587만원) 삭제,
         현실적 숫자 1줄 + "영상/홍보 의무 없음"으로 리스크 프레이밍 제거.
    형식: 마케팅 박스 나열형 → 절제된 개인 메일 톤 (재오픈 시 '대량 광고' 재인식 방지).
    오프라인 영업의 검증된 클로저("처음부터 코칭") 반영 — 연결·세팅 1:1 지원 약속.
    타겟 언어: 파워유저(엑셀 수동 광고 세팅) 고통 명명 — 애이엔 사례에서 검증.

    v3(2026-07-15): 경쟁 인텔 반영 — ③ '정직한 데이터 vs 크롤링' 차별화 추가.
      경쟁 툴(빅셀/장사왕)은 로그인 크롤링이라 부정확·잘 깨짐 → 매실은 공식 데이터,
      쿠팡이 부풀린 1P 로켓 ROAS(1,532%)를 실질(919%)로 바로잡는다는 구체 증거.
      채널별 랜딩(/coupang·/naver)으로 자기 채널 페이지 자기선택 유도.
    """
    import html as _html
    safe_handle = _html.escape(handle_name)
    # summary = 개인화 오프너(상대 영상 칭찬). 있으면 그걸 오프너로, 없으면 일반 인사.
    if summary:
        opener = _html.escape(summary)
    else:
        opener = f"{safe_handle} 채널 잘 보고 있습니다."

    from app.config import settings
    maepas_url = settings.outreach_maepas_url or "https://maesil-insight.com/partners"
    cases_url = settings.outreach_cases_url or "https://maesil-insight.com/cases"
    trial_url = "https://maesil-insight.com"
    coupang_url = "https://maesil-insight.com/coupang"
    naver_url = "https://maesil-insight.com/naver"

    # 희소성 후킹 — OUTREACH_BETA_SLOTS>0 일 때만 (거짓 희소성 방지)
    _slots = settings.outreach_beta_slots
    scarcity_block = (
        f'<p style="font-size:13.5px;color:#9a3412;margin:20px 0">'
        f'⏳ 초기 파트너는 셀러 유튜버 <strong>{_slots}팀만</strong> 모시고 있습니다.</p>'
    ) if _slots and _slots > 0 else ""

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;background:#fafafa">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:10px;padding:32px 34px;
            font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#333;
            font-size:14.5px;line-height:1.9">

  <p>안녕하세요, <strong>{safe_handle}</strong>님.</p>
  <p>{opener}</p>

  <p>혹시 {safe_handle}님도 쿠팡·네이버 광고 성과를 <strong>엑셀로 내려받아
  키워드별로 손으로 정리</strong>하고 계신가요? 저희는 그 작업이 지겨워서
  직접 도구를 만든 셀러들입니다. 아마존 셀러들에게 헬리움10이 있다면,
  쿠팡·스마트스토어 셀러에게는 이런 게 하나 있어야 한다고 생각했습니다.</p>

  <div style="background:#f8faf9;border-left:3px solid #1A6F3C;border-radius:6px;
              padding:16px 20px;margin:22px 0;font-size:13.5px;line-height:1.8;color:#444">
    실제 운영 계정 기준 — 쿠팡 광고비 <strong>월 794만원 → 193만원</strong> (월 567만원 절감),
    매출은 오히려 +8.8%, ROAS <strong>482% → 1,080%</strong> (3개월).<br>
    네이버는 대행사 없이 키워드 교체만으로 <strong>44위 → 8위</strong> (1개월).<br>
    <a href="{cases_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener"
       style="color:#1A6F3C;font-weight:600">→ 사례 데이터 직접 보기</a>
  </div>

  <p>혹시 다른 셀러 프로그램 써보셨다면, 잘 되다가 갑자기 숫자가 이상해진 적
  있으실 거예요. 대부분 로그인해서 화면을 몰래 긁는 방식이라 쿠팡·네이버가
  화면만 바꿔도 틀어집니다. 저흰 공식 데이터만 씁니다 — 심지어 쿠팡이 부풀려
  보여주는 <strong>1P 로켓 ROAS 1,532%</strong>도 납품가 기준
  <strong>실질 919%</strong>로 바로잡아 드려요. 화면 긁은 추정치가 아니라,
  통장이랑 맞는 숫자입니다.</p>

  <p>이 숫자가 바로 안 믿기시는 게 정상입니다. 그래서 말로 설득하는 대신 —
  <strong>{safe_handle}님 스토어 데이터로 직접 확인</strong>해보시길 권합니다.
  <a href="{coupang_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener"
     style="color:#1A6F3C;font-weight:600">쿠팡</a> ·
  <a href="{naver_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener"
     style="color:#1A6F3C;font-weight:600">스마트스토어</a> 어느 쪽이든,
  <a href="{trial_url}?utm_source=outreach&utm_medium=email" target="_blank" rel="noopener"
     style="color:#1A6F3C;font-weight:600">7일 무료, 카드 등록 없음</a>으로
  본인 데이터에서 바로 보실 수 있습니다. 채널 연결부터 세팅까지 제가 1:1로
  직접 잡아드리고, 써보고 별로면 그냥 두시면 됩니다. 어떤 의무도 없습니다.</p>

  <p>써보시고 괜찮다 싶으실 때 — 그때 파트너(<a href="{maepas_url}?utm_source=outreach&utm_medium=email"
  target="_blank" rel="noopener" style="color:#1A6F3C;font-weight:600">매파스</a>) 이야기를
  나누고 싶습니다. 추천으로 구독자가 가입하면 <strong>첫 결제의 20%</strong>, 이후
  <strong>구독 유지 기간 매달 10%</strong>(최대 12개월)를 드립니다 — 그로스 플랜 기준
  10명 유지 시 월 약 20만원이고, 월말 마감 후 익월 10일에 계좌로 정산됩니다.
  영상 제작 의무나 홍보 조건은 없습니다.</p>

  {scarcity_block}

  <div style="text-align:center;margin:28px 0 8px">
    <a href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener"
       style="display:inline-block;background:#1A6F3C;color:#fff;padding:13px 32px;
              border-radius:30px;text-decoration:none;font-size:14.5px;font-weight:700">
      카톡으로 편하게 물어보기 💬
    </a>
  </div>
  <p style="text-align:center;font-size:12.5px;color:#999;margin-top:6px">
    질문만 하셔도 됩니다 · 무료체험 세팅도 카톡으로 도와드립니다
  </p>

  <p style="font-size:11.5px;color:#9ca3af;line-height:1.7;margin-top:20px">
    ※ 위 사례는 실제 운영 계정의 결과이며, 성과는 운영 상황에 따라 다를 수 있습니다.
  </p>
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

    # 비실재 도메인 반송(bounce) 방지 — 발신 평판 보호
    from app.services.email_validation import validate_email_for_send
    ok_email, why = validate_email_for_send(to)
    if not ok_email:
        logger.warning("outreach_mailer: 비실재 이메일 발송 차단 [%s] %s (%s)", lead_id, to, why)
        return {"ok": False, "error": f"비실재 이메일({why})", "bad_email": True}

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
