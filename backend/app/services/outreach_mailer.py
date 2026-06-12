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
    # summary가 Haiku 인사 문단이면 그대로, content_summary이면 이탤릭
    if summary and len(summary) > 60:
        summary_line = f"<p style='font-size:15px;color:#333;line-height:1.8'>{_html.escape(summary)}</p>"
    elif summary:
        summary_line = f"<p style='color:#555;font-size:14px;font-style:italic'>{_html.escape(summary)}</p>"
    else:
        summary_line = ""
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
    <h1>🌿 매실인사이트 파트너 제안</h1>
    <p>영상 하나로 지속 수익 — 매실 파트너스(MAEPAS)</p>
  </div>
  <div class="body">
    <p class="greeting">
      안녕하세요, <strong>{safe_handle}</strong> 채널 운영자님 👋<br><br>
      {summary_line}
    </p>

    <div class="case-box">
      <div class="case-title">📈 실제 사용 사례 — 대행사 없이 직접</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
        <div style="flex:1;min-width:200px">
          <div class="case-stat">광고비 −75%</div>
          <div style="font-size:13px;color:#555;margin-top:4px;line-height:1.6">
            ROAS <b>482% → 1,080%</b><br>
            쿠팡 광고 최적화 (3개월)
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div class="case-stat">44위 → 8위</div>
          <div style="font-size:13px;color:#555;margin-top:4px;line-height:1.6">
            네이버 "이유식" 키워드<br>
            1개월, 대행사 비용 <b>0원</b>
          </div>
        </div>
      </div>
      <div class="case-desc" style="margin-top:12px">
        <a href="https://maesil-insight.com/cases?utm_source=partner&utm_medium=email" target="_blank" rel="noopener" style="color:#1A6F3C;font-weight:600">실제 수치 전체 보기 →</a>
      </div>
    </div>

    <p class="greeting">
      매실인사이트는 <strong>쿠팡·스마트스토어 광고 데이터를 AI로 자동 분석</strong>해
      키워드별 ROAS, 예산 최적화, 경쟁사 벤치마크를 한눈에 보여주는 서비스입니다.<br><br>
      <strong>대행사 없이 직접</strong> 운영해도 전문가 수준의 광고 운영이 가능합니다.
    </p>

    <hr class="divider">

    <div class="highlight">
      <h3>💰 파트너 수익 구조</h3>
      <ul>
        <li><strong>첫 결제 20%</strong> 지급 — 신규 구독자 발생 즉시</li>
        <li><strong>재구독 10%/월</strong> 지속 지급 — 최대 12개월</li>
        <li>전용 <strong>할인코드</strong> 제공 (구독자 첫 달 10% 할인)</li>
        <li>영상이 남아있는 한 할인코드로 계속 신규 유입 → <strong>패시브 인컴</strong></li>
      </ul>
    </div>

    <div class="earning-box">
      <div class="earn-title">📊 수익 시뮬레이션 — 구독자 10명 모집 시 1년 수익 (그로스 플랜 199,000원 기준)</div>
      <table>
        <tr>
          <td>1개월차 · 첫 결제 커미션 (20% × 10명)</td>
          <td>+398,000원</td>
        </tr>
        <tr>
          <td>2~12개월 · 재구독 유지 커미션 (10% × 10명 × 11개월)</td>
          <td>+2,189,000원</td>
        </tr>
      </table>
      <div class="earn-total">
        <span>🎯 10명 모집 시 1년 누적 수익</span>
        <span>약 2,587,000원</span>
      </div>
      <div style="font-size:12px;color:#888;margin-top:8px;line-height:1.6">
        ※ 영상 1개가 남아있는 한 할인코드로 신규 유입 지속 → 실제 수익은 더 커집니다
      </div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 22px;margin:24px 0">
      <div style="font-size:13px;color:#065f46;font-weight:700;margin-bottom:10px">🎁 파트너 전용 혜택</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="padding:5px 0;color:#333">✅ 매실인사이트 <strong>Pro 플랜 1년 무료</strong></td>
          <td style="text-align:right;color:#065f46;font-weight:600">3,588,000원 상당</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#555;font-size:13px">· 쿠팡 광고 데이터 직접 분석·최적화 체험</td>
          <td></td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#555;font-size:13px">· 네이버 키워드 랭킹 상승 전략 실습</td>
          <td></td>
        </tr>
        <tr style="border-top:1px solid #bbf7d0">
          <td style="padding:8px 0 4px;color:#333">✅ 전용 할인코드 + 실시간 전환 통계 대시보드</td>
          <td></td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#333">✅ 매달 자동 정산 (익월 10일)</td>
          <td></td>
        </tr>
      </table>
    </div>

    <p class="greeting">
      직접 써보신 후 구독자분들께 소개하실 수 있도록
      <strong>Pro 플랜 1년 무료 테스트 계정</strong>을 먼저 드립니다.<br>
      자세한 파트너 조건과 정산 방식은 <strong>상담을 통해</strong> 안내드립니다.
    </p>

    <div class="cta">
      <a class="btn" href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener">
        카카오 오픈톡으로 상담하기 💬
      </a>
    </div>
    <p class="sub-note">자세한 건 상담을 통해 안내드립니다 · 부담 없이 문의해 주세요</p>
  </div>
  <div class="footer">
    매실인사이트 | 파트너팀<br>
    수신을 원치 않으시면 이 메일에 "수신거부"라고 회신해 주세요.
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


def _build_subject(handle_name: str) -> str:
    return f"{handle_name}님 채널 보고 연락드립니다 🌿"


# ── 발송 함수 ────────────────────────────────────────────────────────

def send_single(lead_id: str) -> dict:
    """특정 리드에게 이메일 발송. email_final → email_draft → 기본 템플릿 순서."""
    from app.services.notify_client import send_email

    resp = _db().table("outreach_leads").select("*").eq("id", lead_id).limit(1).execute()
    rows = resp.data or []
    if not rows:
        return {"ok": False, "error": "lead not found"}

    lead = rows[0]
    to = lead.get("contact_email")
    if not to:
        return {"ok": False, "error": "이메일 주소 없음"}

    handle = lead.get("handle_name") or "파트너 채널"
    subject = lead.get("email_subject") or _build_subject(handle)

    # 본문 우선순위: 담당자 최종 편집 → HTML 템플릿 (AI 인사 문단 주입)
    if lead.get("email_final"):
        html = _draft_to_html(lead["email_final"])
    else:
        # email_draft = Haiku가 생성한 맞춤 인사 문단 (없으면 기본 인사)
        html = _build_email_html(
            handle,
            lead.get("platform_url") or "",
            lead.get("email_draft") or lead.get("content_summary") or "",
        )

    result = send_email(to=to, subject=subject, html=html, source="maesil-agency")

    if result.get("ok"):
        now = datetime.now(timezone.utc).isoformat()
        try:
            _db().table("outreach_leads").update({
                "status": "emailed",
                "emailed_at": now,
                "updated_at": now,
            }).eq("id", lead_id).execute()
        except Exception as e:
            logger.warning("outreach_mailer: emailed 상태 업데이트 실패: %s", e)

        # 1차 이메일 터치포인트 → sent 로 마킹
        try:
            _db().table("outreach_touchpoints").update({
                "status": "sent",
                "sent_at": now,
            }).eq("lead_id", lead_id).eq("touch_sequence", 1).eq("status", "pending").execute()
        except Exception as e:
            logger.warning("outreach_mailer: touchpoint 상태 업데이트 실패: %s", e)

        logger.info("outreach_mailer: 발송 완료 [%s] → %s", handle, to)

    return result
