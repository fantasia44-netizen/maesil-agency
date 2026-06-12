"""
outreach_followup.py — 멀티터치 팔로업 스케줄러.

3분마다 스케줄러에서 호출. scheduled_for가 지난 pending 터치포인트를 처리.
  - email: outreach_mailer로 발송
  - instagram_dm / naver_cafe_message / youtube_comment: 담당자에게 알림
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# 이메일 시퀀스별 제목/본문 빌더
_EMAIL_SEQUENCES = {
    1: None,   # 1차는 outreach_mailer.send_single이 생성
    2: {
        "subject_suffix": "혹시 메일 받으셨나요? — 구독자 10명이면 1년 257만원",
        "body_html": """<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px 28px;background:#fff">
<p style="font-size:15px;color:#333;line-height:1.8">
안녕하세요, <strong>{handle}</strong> 운영자님 👋<br><br>
지난번 파트너십 제안 메일을 보내드렸는데 바쁘신 관계로 못 보셨을 것 같아 다시 한번 연락드립니다.
</p>

<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:18px 22px;margin:20px 0">
  <div style="color:#e65100;font-size:12px;font-weight:700;margin-bottom:6px">📈 실제 사례</div>
  <div style="font-size:18px;font-weight:800;color:#1A6F3C">광고비 −75% · ROAS 482→1,080%</div>
  <div style="font-size:13px;color:#555;margin-top:4px">쿠팡 광고 최적화 3개월, 대행사 없이 직접</div>
</div>

<div style="background:#f8f8ff;border:1px solid #c5cae9;border-radius:10px;padding:16px 20px;margin:16px 0">
  <div style="font-size:12px;color:#3949ab;font-weight:700;margin-bottom:10px">📊 구독자 10명 모집 시 1년 수익 (그로스 199,000원 기준)</div>
  <div style="font-size:14px;color:#444;line-height:2">
    • 1개월차 첫 결제 커미션 (20% × 10명): <strong>+398,000원</strong><br>
    • 2~12개월 재구독 커미션 (10% × 10명 × 11개월): <strong>+2,189,000원</strong>
  </div>
  <div style="border-top:1px solid #c5cae9;margin-top:10px;padding-top:10px;font-size:15px;font-weight:700;color:#1A6F3C;display:flex;justify-content:space-between">
    <span>🎯 1년 누적 수익</span><span>약 2,587,000원</span>
  </div>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:14px;color:#333;line-height:1.8">
  🎁 <strong>파트너 전용: Pro 플랜 1년 무료 제공</strong> (3,588,000원 상당)<br>
  <span style="font-size:13px;color:#555">쿠팡 광고 직접 분석 · 네이버 키워드 랭킹 전략 실습 가능</span>
</div>

<p style="font-size:15px;color:#333;line-height:1.8">
자세한 내용은 상담을 통해 안내드립니다. 부담 없이 연락 주세요.
</p>

<div style="text-align:center;margin:24px 0">
  <a href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener"
     style="display:inline-block;background:#1A6F3C;color:#fff;padding:13px 30px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:700">
    카카오 오픈톡으로 상담하기 💬
  </a>
</div>

<p style="font-size:12px;color:#999;text-align:center">
매실인사이트 | 수신을 원치 않으시면 "수신거부"로 회신해 주세요.
</p>
</div>""",
    },
    3: {
        "subject_suffix": "마지막 연락 — Pro 1년 무료 제안 유효합니다",
        "body_html": """<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px 28px;background:#fff">
<p style="font-size:15px;color:#333;line-height:1.8">
안녕하세요, <strong>{handle}</strong> 운영자님 👋<br><br>
마지막으로 한 번만 더 연락드립니다.
</p>

<p style="font-size:15px;color:#333;line-height:1.8">
파트너십이 지금 당장 맞지 않으신다면 완전히 이해합니다.<br><br>
다만 저희 제안 중 하나만 말씀드리면 —<br>
<strong>영상 하나</strong>를 올려두면 할인코드로 신규 구독자가 계속 유입되고,
구독자 10명만 되어도 <strong>1년에 약 257만원</strong>이 자동 정산됩니다.<br><br>
그리고 파트너에게는 <strong>Pro 플랜 1년 무료 계정</strong>을 먼저 드립니다.<br>
직접 써보시고 구독자분들께 소개하실 수 있도록요.
</p>

<div style="text-align:center;margin:24px 0">
  <a href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener"
     style="display:inline-block;background:#1A6F3C;color:#fff;padding:13px 30px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:700">
    카카오 오픈톡으로 상담하기 💬
  </a>
</div>

<p style="font-size:13px;color:#777;text-align:center">
더 이상 연락드리지 않겠습니다. 채널 항상 잘 보고 있습니다! 🌿
</p>
<p style="font-size:12px;color:#999;text-align:center">
매실인사이트 | 수신을 원치 않으시면 "수신거부"로 회신해 주세요.
</p>
</div>""",
    },
}


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _mark_touch(touch_id: str, status: str, error: str | None = None) -> None:
    update: dict = {"status": status}
    if status == "sent":
        update["sent_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "replied":
        update["replied_at"] = datetime.now(timezone.utc).isoformat()
    if error:
        update["error_msg"] = error[:500]
    try:
        _db().table("outreach_touchpoints").update(update).eq("id", touch_id).execute()
    except Exception as e:
        logger.warning("touch 상태 업데이트 실패 [%s]: %s", touch_id, e)


def _update_lead_touch_summary(lead_id: str, channel: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    try:
        resp = _db().table("outreach_leads").select("touch_count").eq("id", lead_id).limit(1).execute()
        count = (resp.data or [{}])[0].get("touch_count") or 0
        _db().table("outreach_leads").update({
            "touch_count": count + 1,
            "last_touch_at": now,
            "last_touch_channel": channel,
            "updated_at": now,
        }).eq("id", lead_id).execute()
    except Exception as e:
        logger.warning("lead touch 요약 업데이트 실패 [%s]: %s", lead_id, e)


def _send_sequence_email(lead: dict, sequence: int, touch_id: str) -> bool:
    """이메일 시퀀스 발송."""
    if sequence == 1:
        # 1차: outreach_mailer.send_single 사용
        from app.services.outreach_mailer import send_single
        result = send_single(lead["id"])
        ok = result.get("ok", False)
        _mark_touch(touch_id, "sent" if ok else "failed", result.get("error"))
        return ok

    seq_cfg = _EMAIL_SEQUENCES.get(sequence)
    if not seq_cfg:
        _mark_touch(touch_id, "skipped")
        return False

    from app.services.notify_client import send_email
    handle = lead.get("handle_name") or "채널"
    subject = f"[매실인사이트] {handle}님 — {seq_cfg['subject_suffix']}"
    html = seq_cfg["body_html"].replace("{handle}", handle)

    to = lead.get("contact_email")
    if not to:
        _mark_touch(touch_id, "skipped")
        return False

    result = send_email(to=to, subject=subject, html=html, source="maesil-agency")
    ok = result.get("ok", False)
    _mark_touch(touch_id, "sent" if ok else "failed", result.get("error"))
    return ok


def _notify_manual_touch(lead: dict, channel: str, touch_id: str) -> None:
    """자동화 불가 채널(인스타 DM, 카페 쪽지 등) → 담당자에게 알림 이메일."""
    from app.services.secrets import get_secret
    from app.services.notify_client import send_email

    admin_email = get_secret("admin_email") or get_secret("maesil_admin_email")
    if not admin_email:
        _mark_touch(touch_id, "skipped")
        return

    channel_label = {
        "instagram_dm": "인스타그램 DM",
        "naver_cafe_message": "네이버 카페 쪽지",
        "youtube_comment": "유튜브 댓글",
    }.get(channel, channel)

    handle = lead.get("handle_name") or lead.get("platform_id")
    url = lead.get("platform_url") or lead.get("contact_naver_cafe") or lead.get("contact_instagram") or "-"

    subject = f"[영업] {handle} — {channel_label} 접촉 필요"
    html = f"""<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h3 style="color:#0f172a">{channel_label} 접촉 알림</h3>
<p><strong>채널:</strong> {handle}</p>
<p><strong>URL:</strong> <a href="{url}">{url}</a></p>
<p><strong>점수:</strong> {lead.get('score')}점 ({lead.get('grade')}급)</p>
<p><strong>요약:</strong> {lead.get('content_summary') or '-'}</p>
<p style="margin-top:16px;color:#475569">
이메일 3회 발송 후 무응답 상태입니다.<br>
{channel_label}으로 직접 접촉해 주세요.
</p>
</div>"""

    result = send_email(to=admin_email, subject=subject, html=html, source="maesil-agency")
    _mark_touch(touch_id, "sent" if result.get("ok") else "failed", result.get("error"))


def check_pending_followups(limit: int = 20) -> dict:
    """
    scheduled_for가 지난 pending 터치포인트를 처리.
    스케줄러에서 3분마다 호출.
    """
    now = datetime.now(timezone.utc).isoformat()
    try:
        resp = (
            _db().table("outreach_touchpoints")
            .select("id, lead_id, touch_sequence, channel")
            .eq("status", "pending")
            .lte("scheduled_for", now)
            .order("scheduled_for")
            .limit(limit)
            .execute()
        )
    except Exception as e:
        logger.error("followup: touchpoints 조회 실패: %s", e)
        return {"processed": 0, "errors": [str(e)]}

    touches = resp.data or []
    processed = 0
    errors: list[str] = []

    for touch in touches:
        lead_id = touch["lead_id"]
        sequence = touch["touch_sequence"]
        channel = touch["channel"]
        touch_id = touch["id"]

        # 리드 조회
        try:
            lead_resp = _db().table("outreach_leads").select("*").eq("id", lead_id).limit(1).execute()
            lead = (lead_resp.data or [None])[0]
        except Exception as e:
            errors.append(f"lead 조회 실패 [{lead_id}]: {e}")
            continue

        if not lead or lead.get("status") in ("rejected", "archived", "deal"):
            _mark_touch(touch_id, "skipped")
            continue

        try:
            if channel == "email" and sequence == 1:
                # 1차 이메일은 수동 발송(send_single)이 처리 — 스케줄러는 건너뜀
                # skipped로 마킹하지 않음: send_single이 발송 후 sent로 업데이트
                continue
            elif channel == "email":
                ok = _send_sequence_email(lead, sequence, touch_id)
            else:
                _notify_manual_touch(lead, channel, touch_id)

            _update_lead_touch_summary(lead_id, channel)
            processed += 1

        except Exception as e:
            errors.append(f"touch 처리 실패 [{touch_id}]: {e}")
            _mark_touch(touch_id, "failed", str(e))

    # 7일 무응답 → no_reply 자동 전환
    _auto_no_reply()

    logger.info("followup: processed=%d errors=%d", processed, len(errors))
    return {"processed": processed, "errors": errors}


def _auto_no_reply() -> None:
    """이메일 발송 후 7일 무응답 리드 → no_reply 상태로 전환."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    try:
        _db().table("outreach_leads").update({
            "status": "no_reply",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("status", "emailed").lt("emailed_at", cutoff).execute()
    except Exception as e:
        logger.warning("auto_no_reply 실패: %s", e)
