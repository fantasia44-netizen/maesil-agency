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
    1: None,   # 1차는 outreach_mailer.send_single이 생성 (최고조회 영상 칭찬)
    2: None,   # 2차는 _send_sequence_email에서 동적 생성 (채널명 개인화)
    3: None,   # 3차는 _send_sequence_email에서 동적 생성 (최신 영상 제목 개인화)
}


def _seq2_html(handle: str, best_title: str | None) -> str:
    """2차: 채널명 기반, 최고조회 영상 재언급."""
    import html as _html
    h = _html.escape(handle)
    praise = f'특히 <strong>"{_html.escape(best_title)}"</strong> 영상이 정말 인상 깊었습니다.' if best_title else f"<strong>{h}</strong> 채널 콘텐츠가 정말 좋더라고요."
    return f"""<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px 28px;background:#fff">
<p style="font-size:15px;color:#333;line-height:1.8">
안녕하세요, <strong>{h}</strong>님 👋<br><br>
지난번 메일을 보내드렸는데 혹시 못 보셨을까 해서 다시 한번 연락드립니다.<br><br>
{praise}<br><br>
짧게 한 가지만 말씀드리면 — 채널에 영상 하나만 올려두셔도 구독자 10명 모집 시 <strong>연간 약 257만원</strong> 자동 정산이 가능합니다.<br>
파트너 분들께는 <strong>Pro 플랜 1년 무료</strong>로 먼저 드리고 있어요.
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
</div>"""


def _seq3_html(handle: str, latest_title: str | None) -> str:
    """3차: 최신 영상 칭찬, 마지막 연락."""
    import html as _html
    h = _html.escape(handle)
    praise = f'최근에 올리신 <strong>"{_html.escape(latest_title)}"</strong> 영상도 잘 봤습니다.' if latest_title else f"채널 항상 잘 보고 있습니다."
    return f"""<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px 28px;background:#fff">
<p style="font-size:15px;color:#333;line-height:1.8">
안녕하세요, <strong>{h}</strong>님 👋<br><br>
마지막으로 한 번만 더 연락드립니다.<br><br>
{praise}<br><br>
파트너십이 지금 당장 맞지 않으신다면 완전히 이해합니다.<br>
혹시 나중에라도 관심이 생기시면 편하게 연락 주세요.
</p>
<div style="text-align:center;margin:24px 0">
  <a href="https://open.kakao.com/o/sg6QOxDg" target="_blank" rel="noopener"
     style="display:inline-block;background:#1A6F3C;color:#fff;padding:13px 30px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:700">
    카카오 오픈톡으로 상담하기 💬
  </a>
</div>
<p style="font-size:13px;color:#777;text-align:center">
더 이상 연락드리지 않겠습니다. 채널 항상 응원합니다 🌿
</p>
<p style="font-size:12px;color:#999;text-align:center">
매실인사이트 | 수신을 원치 않으시면 "수신거부"로 회신해 주세요.
</p>
</div>"""


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


def _send_cold_drip_seq1(lead: dict, touch_id: str) -> bool:
    """1차 콜드 드립 이메일 — Gmail API(outreach_gmail_sender) 사용."""
    from app.services import outreach_gmail_sender as gm
    from app.services.outreach_mailer import build_lead_email
    from app.services.outreach_suppression import is_suppressed

    to = lead.get("contact_email")
    if not to:
        _mark_touch(touch_id, "skipped")
        return False
    if is_suppressed(to):
        _mark_touch(touch_id, "skipped", "suppressed")
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            _db().table("outreach_leads").update(
                {"status": "unsubscribe", "updated_at": now_iso}
            ).eq("id", lead["id"]).execute()
        except Exception:
            pass
        return False

    subject, html = build_lead_email(lead)
    result = gm.send(to, subject, html)
    ok = result.get("ok", False)

    now_iso = datetime.now(timezone.utc).isoformat()
    if ok:
        try:
            _db().table("outreach_leads").update({
                "status": "emailed", "emailed_at": now_iso, "updated_at": now_iso,
            }).eq("id", lead["id"]).execute()
        except Exception as e:
            logger.warning("cold drip lead 상태 갱신 실패 [%s]: %s", lead["id"], e)
        try:
            _db().table("outreach_touchpoints").update({
                "sent_subject": subject, "sent_at": now_iso,
            }).eq("id", touch_id).execute()
        except Exception:
            pass

    if ok:
        _mark_touch(touch_id, "sent")
    else:
        _mark_touch(touch_id, "failed", result.get("error"))
        # 실패 누적 체크 — 2회 이상이면 리드를 send_failed로 전환
        try:
            fail_resp = (
                _db().table("outreach_touchpoints")
                .select("id", count="exact")
                .eq("lead_id", lead["id"])
                .eq("touch_sequence", 1)
                .eq("status", "failed")
                .execute()
            )
            if (fail_resp.count or 0) >= 2:
                _db().table("outreach_leads").update({
                    "status": "send_failed",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", lead["id"]).execute()
                logger.warning("[cold_drip] 2회 실패 → send_failed [%s]", lead["id"])
        except Exception as e:
            logger.warning("실패 횟수 체크 실패 [%s]: %s", lead["id"], e)

    return ok


def _send_sequence_email(lead: dict, sequence: int, touch_id: str) -> bool:
    """이메일 시퀀스 발송."""
    if sequence == 1:
        # 1차: outreach_mailer.send_single 사용
        from app.services.outreach_mailer import send_single
        result = send_single(lead["id"])
        ok = result.get("ok", False)
        _mark_touch(touch_id, "sent" if ok else "failed", result.get("error"))
        return ok

    from app.services.notify_client import send_email
    from app.services.outreach_suppression import (
        is_suppressed, with_ad_subject, inject_compliance_footer, inject_open_pixel,
    )
    handle = lead.get("handle_name") or "채널"

    if sequence == 2:
        best_title = lead.get("best_content_title")
        subject = f"{handle}님 채널 보고 연락드립니다"
        html = _seq2_html(handle, best_title)
    elif sequence == 3:
        latest_title = None
        try:
            from app.services.outreach_personalize import get_latest_video_title, shorten_title_for_subject
            latest_title = get_latest_video_title(lead.get("platform_id"))
            raw = lead.get("best_content_title") or ""
            short = shorten_title_for_subject(raw, handle) if raw else ""
        except Exception:
            raw = lead.get("best_content_title") or ""
            short = (raw[:15] + "…") if len(raw) > 15 else raw
        subject = f'"{short}" 보고 또 연락드립니다' if short else f"{handle}님께 마지막으로 연락드립니다"
        html = _seq3_html(handle, latest_title)
    else:
        _mark_touch(touch_id, "skipped")
        return False

    to = lead.get("contact_email")
    if not to:
        _mark_touch(touch_id, "skipped")
        return False

    # 수신거부/차단 차단
    if is_suppressed(to):
        _mark_touch(touch_id, "skipped", "suppressed")
        return False

    # 컴플라이언스: (광고) 제목 + 전송자정보/수신거부 푸터
    subject = with_ad_subject(subject)
    html = inject_compliance_footer(html, to)
    html = inject_open_pixel(html, lead.get("id") or "")

    result = send_email(to=to, subject=subject, html=html, source="maesil-agency")
    ok = result.get("ok", False)
    # 발송 제목/본문 DB 기록
    try:
        _db().table("outreach_touchpoints").update({
            "sent_subject": subject,
            "sent_body": html[:10000],  # 최대 10KB
        }).eq("id", touch_id).execute()
    except Exception as e:
        logger.warning("touchpoint 발송내용 저장 실패 [%s]: %s", touch_id, e)
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


FOLLOWUP_DAILY_CAP = 20  # 팔로업 이메일 하루 최대 발송 수


def _followup_sent_today() -> int:
    """오늘(KST) 팔로업으로 발송된 이메일 터치포인트 수."""
    from datetime import date, timedelta, timezone as tz
    kst = tz(timedelta(hours=9))
    today_kst = datetime.now(kst).date().isoformat()
    try:
        resp = (
            _db().table("outreach_touchpoints")
            .select("id", count="exact")
            .eq("status", "sent")
            .eq("channel", "email")
            .gt("touch_sequence", 1)
            .gte("sent_at", today_kst)
            .execute()
        )
        return resp.count or 0
    except Exception:
        return 0


def check_pending_followups(limit: int = 20) -> dict:
    """
    scheduled_for가 지난 pending 터치포인트를 처리.
    스케줄러에서 3분마다 호출. 하루 FOLLOWUP_DAILY_CAP통 제한.
    """
    # 일일 한도(FOLLOWUP_DAILY_CAP)는 팔로업(2·3차)에만 적용.
    # 1차 콜드드립(seq=1)은 한도와 무관하게 발송 — 분리 조회로 팔로업이 1차를 굶기지 않게 함.
    now = datetime.now(timezone.utc).isoformat()
    fu_sent_today = _followup_sent_today()
    fu_room = max(0, FOLLOWUP_DAILY_CAP - fu_sent_today)
    errors: list[str] = []

    def _fetch_due(seq_eq=None, seq_gt=None, lim=0):
        if lim <= 0:
            return []
        q = (
            _db().table("outreach_touchpoints")
            .select("id, lead_id, touch_sequence, channel")
            .eq("status", "pending")
            .lte("scheduled_for", now)
        )
        q = q.eq("touch_sequence", seq_eq) if seq_eq is not None else q.gt("touch_sequence", seq_gt)
        try:
            return (q.order("scheduled_for").limit(lim).execute().data) or []
        except Exception as e:
            errors.append(f"touchpoints 조회 실패: {e}")
            return []

    # 1차(콜드드립)는 한도 무관 limit건, 2·3차 팔로업은 남은 한도(fu_room)만큼
    touches = _fetch_due(seq_eq=1, lim=limit) + _fetch_due(seq_gt=1, lim=fu_room)
    processed = 0

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

        if not lead or lead.get("status") in (
            "rejected", "archived", "deal", "unsubscribe", "blocked",
            "discovered", "analyzing", "draft_ready",
        ):
            _mark_touch(touch_id, "skipped")
            continue

        # 야간(21~08 KST) 자동 이메일 발송 보류 — pending 유지, 다음 주기 처리
        if channel == "email":
            from app.services.outreach_suppression import is_quiet_hours
            if is_quiet_hours():
                continue

        try:
            if channel == "email" and sequence == 1:
                ok = _send_cold_drip_seq1(lead, touch_id)
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
