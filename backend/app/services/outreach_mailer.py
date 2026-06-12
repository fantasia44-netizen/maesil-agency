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
    summary_line = f"<p style='color:#555;font-size:14px;font-style:italic'>{summary}</p>" if summary else ""
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
      안녕하세요, <strong>{handle_name}</strong> 채널 운영자님 👋<br><br>
      {summary_line}
      채널에서 온라인 셀러 분들께 도움이 되는 콘텐츠를 제공하고 계신 걸 보고
      파트너십을 제안드리고 싶어 연락드렸습니다.
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
        <a href="https://maesil-insight.com/cases?utm_source=partner&utm_medium=email" style="color:#1A6F3C;font-weight:600">실제 수치 전체 보기 →</a>
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
      <div class="earn-title">📊 수익 시뮬레이션 (그로스 플랜 199,000원 기준)</div>
      <table>
        <tr>
          <td>신규 구독자 10명 · 첫 결제 커미션 (20%)</td>
          <td>+398,000원</td>
        </tr>
        <tr>
          <td>10명 재구독 유지 시 매달 (10%)</td>
          <td>+199,000원/월</td>
        </tr>
        <tr>
          <td style="color:#888;font-size:13px">※ 영상 1개로 꾸준히 유입되는 경우</td>
          <td style="color:#888;font-size:13px">계속 누적</td>
        </tr>
      </table>
      <div class="earn-total">
        <span>30명 안정 구독자 유지 시 예상 월 수익</span>
        <span>약 267,000원~</span>
      </div>
    </div>

    <p class="greeting">
      자세한 파트너 조건, 정산 방식, 실제 사례 데이터는
      <strong>상담을 통해</strong> 안내드리고 있습니다.<br>
      편하신 시간에 부담 없이 연락 주시면 됩니다.
    </p>

    <div class="cta">
      <a class="btn" href="https://open.kakao.com/o/sg6QOxDg">
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
    return f"[매실인사이트] {handle_name}님, 영상 하나로 매달 수익 내는 파트너 제안드립니다 🌿"


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

    # 본문 우선순위: 담당자 최종 편집 → AI 초안 → 기본 템플릿
    if lead.get("email_final"):
        html = _draft_to_html(lead["email_final"])
    elif lead.get("email_draft"):
        html = _draft_to_html(lead["email_draft"])
    else:
        html = _build_email_html(
            handle,
            lead.get("platform_url") or "",
            lead.get("content_summary") or "",
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
        logger.info("outreach_mailer: 발송 완료 [%s] → %s", handle, to)

    return result
