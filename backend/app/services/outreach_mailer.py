"""
outreach_mailer — 영업 이메일 자동 발송.

score >= SCORE_THRESHOLD이고 contact_email 있고 status='new'인
outreach_leads를 파트너십 제안 이메일로 발송한다.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SCORE_THRESHOLD = 55
BATCH_LIMIT = 10   # 1회 실행에 최대 발송 수


# ── HTML 이메일 템플릿 ────────────────────────────────────────────────

def _build_email_html(channel_title: str, channel_url: str, content_summary: str) -> str:
    """파트너십 제안 HTML 이메일 생성."""
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {{ font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background:#f5f5f5; margin:0; padding:20px; }}
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
      안녕하세요, <strong>{channel_title}</strong> 채널 운영자님 👋<br><br>
      저는 쿠팡·스마트스토어 셀러를 위한 AI 광고 분석 서비스 <strong>매실인사이트</strong>를 운영하고 있습니다.<br>
      {content_summary and f"<em>{content_summary}</em>" or ""}<br><br>
      채널에서 온라인 셀러 분들께 정말 유익한 콘텐츠를 제공하고 계신 걸 보고, 파트너십을 제안드리고 싶어 연락드렸습니다.
    </p>

    <div class="highlight">
      <h3>📦 파트너 혜택 안내</h3>
      <ul>
        <li><strong>수익 쉐어 10~20%</strong> — 파트너 링크로 유입된 신규 구독자 매출의 일부를 공유</li>
        <li><strong>전용 파트너 링크</strong> 및 실시간 전환 통계 대시보드 제공</li>
        <li><strong>매실인사이트 무료 체험</strong> (3개월) — 직접 사용해보고 소개 가능</li>
        <li>광고·마케팅비 절감 사례 제공 (영상 소재로 활용 가능)</li>
        <li>셀러 커뮤니티 네트워킹 지원</li>
      </ul>
    </div>

    <p class="greeting">
      매실인사이트는 <strong>쿠팡·스마트스토어 광고 데이터를 AI로 자동 분석</strong>해<br>
      키워드별 ROAS, 예산 최적화, 경쟁사 벤치마크를 한눈에 보여주는 서비스입니다.<br><br>
      파트너십에 관심이 있으시면 아래 버튼을 눌러 간단하게 문의 주세요. 자세한 조건은 편하신 방법으로 안내해드리겠습니다.
    </p>

    <div class="cta">
      <a class="btn" href="https://maesil-insight.com?utm_source=partner&utm_medium=email&utm_campaign=youtube_outreach">
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


def _build_subject(channel_title: str) -> str:
    return f"[매실인사이트] {channel_title}님께 파트너십을 제안드립니다 🌿"


# ── 발송 로직 ────────────────────────────────────────────────────────

def send_pending_batch(limit: int = BATCH_LIMIT, threshold: int = SCORE_THRESHOLD) -> dict:
    """
    score >= threshold, status='new', email 있는 리드에게 이메일 발송.

    Returns: { sent, skipped, errors }
    """
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services.notify_client import send_email

    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_leads")
            .select("id, channel_id, channel_title, channel_url, contact_email, content_summary, score")
            .eq("status", "new")
            .gte("score", threshold)
            .not_.is_("contact_email", "null")
            .order("score", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as e:
        logger.error("outreach_mailer: DB 조회 실패: %s", e)
        return {"sent": 0, "skipped": 0, "errors": [str(e)]}

    leads = resp.data or []
    sent = 0
    skipped = 0
    errors: list[str] = []

    for lead in leads:
        email = lead.get("contact_email")
        if not email:
            skipped += 1
            continue

        channel_title = lead.get("channel_title") or "유튜브 채널"
        channel_url = lead.get("channel_url") or ""
        summary = lead.get("content_summary") or ""

        html = _build_email_html(channel_title, channel_url, summary)
        subject = _build_subject(channel_title)

        result = send_email(to=email, subject=subject, html=html, source="outreach-agent")
        if result.get("ok"):
            sent += 1
            _mark_emailed(lead["id"])
            logger.info("outreach_mailer: 발송 완료 [%s] → %s", channel_title, email)
        else:
            errors.append(f"{email}: {result.get('error', 'unknown')}")
            logger.warning("outreach_mailer: 발송 실패 [%s]: %s", email, result.get("error"))

    logger.info("outreach_mailer: 발송=%d 스킵=%d 에러=%d", sent, skipped, len(errors))
    return {"sent": sent, "skipped": skipped, "errors": errors}


def _mark_emailed(lead_id: str) -> None:
    from app.db.maesil_total_client import get_maesil_total_client
    now = datetime.now(timezone.utc).isoformat()
    try:
        (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_leads")
            .update({"status": "emailed", "emailed_at": now, "updated_at": now})
            .eq("id", lead_id)
            .execute()
        )
    except Exception as e:
        logger.warning("outreach_mailer: emailed 상태 업데이트 실패 [%s]: %s", lead_id, e)


def send_single(lead_id: str) -> dict:
    """특정 lead에게 수동 이메일 발송."""
    from app.db.maesil_total_client import get_maesil_total_client
    from app.services.notify_client import send_email

    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("outreach_leads")
        .select("*")
        .eq("id", lead_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        return {"ok": False, "error": "lead not found"}

    lead = rows[0]
    email = lead.get("contact_email")
    if not email:
        return {"ok": False, "error": "이메일 주소 없음"}

    channel_title = lead.get("channel_title") or "유튜브 채널"
    html = _build_email_html(channel_title, lead.get("channel_url") or "", lead.get("content_summary") or "")
    subject = _build_subject(channel_title)

    result = send_email(to=email, subject=subject, html=html, source="outreach-agent")
    if result.get("ok"):
        _mark_emailed(lead_id)
    return result
