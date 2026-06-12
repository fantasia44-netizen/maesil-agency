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
    summary_line = f"<em>{summary}</em><br><br>" if summary else ""
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family: 'Apple SD Gothic Neo','Malgun Gothic',sans-serif; background:#f5f5f5; margin:0; padding:20px; }}
  .wrap {{ max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }}
  .header {{ background:linear-gradient(135deg,#1A6F3C,#2eaa5e); padding:36px 40px; text-align:center; }}
  .header h1 {{ color:#fff; margin:0; font-size:22px; font-weight:700; }}
  .header p {{ color:rgba(255,255,255,.85); margin:8px 0 0; font-size:14px; }}
  .body {{ padding:36px 40px; }}
  .greeting {{ font-size:16px; color:#333; line-height:1.7; }}
  .highlight {{ background:#f0faf4; border-left:4px solid #2eaa5e; padding:16px 20px; border-radius:6px; margin:24px 0; }}
  .highlight h3 {{ color:#1A6F3C; margin:0 0 10px; font-size:15px; }}
  .highlight ul {{ margin:0; padding-left:20px; color:#444; font-size:14px; line-height:1.9; }}
  .cta {{ text-align:center; margin:32px 0 20px; }}
  .btn {{ display:inline-block; background:#1A6F3C; color:#fff; padding:14px 32px; border-radius:30px; text-decoration:none; font-size:15px; font-weight:600; }}
  .footer {{ background:#f9f9f9; border-top:1px solid #eee; padding:20px 40px; font-size:12px; color:#999; text-align:center; line-height:1.8; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🌿 매실인사이트 파트너 제안</h1>
    <p>온라인 셀러를 위한 AI 광고 분석 플랫폼</p>
  </div>
  <div class="body">
    <p class="greeting">
      안녕하세요, <strong>{handle_name}</strong> 채널 운영자님 👋<br><br>
      {summary_line}
      채널에서 온라인 셀러 분들께 유익한 콘텐츠를 제공하고 계신 걸 보고
      파트너십을 제안드리고 싶어 연락드렸습니다.
    </p>
    <div class="highlight">
      <h3>📦 파트너 혜택 안내</h3>
      <ul>
        <li><strong>수익 쉐어 10~20%</strong> — 파트너 링크로 유입된 신규 구독자 매출의 일부 공유</li>
        <li><strong>전용 파트너 링크</strong> 및 실시간 전환 통계 대시보드 제공</li>
        <li><strong>매실인사이트 무료 체험</strong> (3개월) — 직접 사용 후 소개 가능</li>
        <li>광고·마케팅비 절감 사례 제공 (영상 소재로 활용 가능)</li>
      </ul>
    </div>
    <p class="greeting">
      매실인사이트는 <strong>쿠팡·스마트스토어 광고 데이터를 AI로 자동 분석</strong>해<br>
      키워드별 ROAS, 예산 최적화, 경쟁사 벤치마크를 한눈에 보여주는 서비스입니다.<br><br>
      관심이 있으시면 아래 버튼을 눌러 문의 주세요.
    </p>
    <div class="cta">
      <a class="btn" href="https://maesil-insight.com?utm_source=partner&utm_medium=email&utm_campaign=outreach">
        파트너십 문의하기
      </a>
    </div>
  </div>
  <div class="footer">
    매실인사이트 | 영업팀<br>
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
    return f"[매실인사이트] {handle_name}님께 파트너십을 제안드립니다 🌿"


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
