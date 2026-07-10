"""
offline_alerts — 오프라인 B2B 파이프라인 관리 알림.

스케줄러에서 하루 1회 호출(check_offline_alerts). 규칙:
  1) trial_d7   — 체험 만료 D-7 (stage=trial)
  2) trial_end  — 체험 만료 당일/경과 (stage=trial, 만료 후에도 stage 안 바뀌면 1회 알림)
  3) overdue    — next_action_due 기한 초과 (진행 단계 한정)
  4) coaching   — 코칭 주기(coaching_cadence_days) 도래: last_contact_at + 주기 <= 오늘
  5) stale      — 진행 단계인데 14일 무접촉 (오프라인 리뷰에서 확인된 '방치' 재발 방지)

알림은 alert_events에 dedup_key upsert(중복 무시)로 적재 → alert_dispatcher가 이메일 발송.
dedup_key에 기준일(만료일/기한/last_contact_at)을 포함해 같은 상태로는 1회만 발송,
접촉을 기록해 기준일이 갱신되면 다음 주기에 다시 발송됨.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# 알림 대상에서 제외되는 종결 단계
_CLOSED_STAGES = ("subscribed", "churned")
_STALE_DAYS = 14


def _db():
    from app.db.maesil_total_client import get_maesil_total_client
    return get_maesil_total_client().schema("agent_work")


def _push_alert(rule: str, lead: dict, title: str, message: str,
                basis: str, severity: str = "warning") -> bool:
    """alert_events upsert(dedup 무시). basis = 재발송 기준값(날짜 등)."""
    try:
        resp = _db().table("alert_events").upsert({
            "severity": severity,
            "source": "offline-crm",
            "title": title,
            "message": message,
            "dedup_key": f"offline:{rule}:{lead['id']}:{basis}",
            "raw": {"lead_id": lead["id"], "company": lead["company_name"], "rule": rule},
        }, on_conflict="dedup_key", ignore_duplicates=True).execute()
        return bool(resp.data)
    except Exception as e:
        logger.warning("[offline] alert 적재 실패 [%s/%s]: %s", rule, lead.get("company_name"), e)
        return False


def check_offline_alerts() -> dict:
    """전 리드 점검 → 발행한 알림 수 반환. 하루 1회 호출 전제."""
    today = date.today()
    try:
        leads = (_db().table("offline_leads").select("*")
                 .not_.in_("stage", list(_CLOSED_STAGES))
                 .execute().data) or []
    except Exception as e:
        logger.warning("[offline] 리드 조회 실패: %s", e)
        return {"ok": False, "error": str(e)}

    fired = 0
    for l in leads:
        name = l["company_name"]
        stage = l["stage"]
        trial_end = date.fromisoformat(l["trial_ends_at"]) if l.get("trial_ends_at") else None
        due = date.fromisoformat(l["next_action_due"]) if l.get("next_action_due") else None
        last = date.fromisoformat(l["last_contact_at"]) if l.get("last_contact_at") else None

        # 1) 체험 만료 D-7
        if stage == "trial" and trial_end and today == trial_end - timedelta(days=7):
            fired += _push_alert("trial_d7", l,
                f"[오프라인] {name} 체험 만료 D-7",
                f"{name} 체험이 {trial_end}에 만료됩니다.\n"
                f"만료 전 전환 조건 = 담당자가 실제로 쓸 줄 아는 상태 — 세팅 점검 방문/전화를 잡으세요.\n"
                f"다음 액션: {l.get('next_action') or '(미설정)'}", str(trial_end))

        # 2) 체험 만료 당일/경과 (대광·인덕·바다마트식 방치 방지)
        if stage == "trial" and trial_end and today >= trial_end:
            fired += _push_alert("trial_end", l,
                f"[오프라인] {name} 체험 만료 — 방치 주의",
                f"{name} 체험이 {trial_end}에 만료됐습니다. 전환/연장/이탈 중 하나로 정리가 필요합니다.\n"
                f"만료 후 방치가 반복된 실패 패턴입니다 (대광·인덕식품·바다마트).", str(trial_end),
                severity="error")

        # 3) next_action 기한 초과
        if due and today > due:
            fired += _push_alert("overdue", l,
                f"[오프라인] {name} 액션 기한 초과",
                f"다음 액션이 기한({due})을 넘겼습니다: {l.get('next_action') or '(내용 없음)'}\n"
                f"단계: {stage}", str(due))

        # 4) 코칭 주기 도래
        cad = l.get("coaching_cadence_days")
        if cad and last and today >= last + timedelta(days=int(cad)):
            fired += _push_alert("coaching", l,
                f"[오프라인] {name} 코칭 주기 도래",
                f"마지막 접촉 {last} 이후 {cad}일 경과 — 정기 코칭 시점입니다.\n"
                f"코칭이 끊기면 이탈 위험이 높은 업체입니다.", str(last))

        # 5) 정체 (14일 무접촉)
        if last and today >= last + timedelta(days=_STALE_DAYS) and not cad:
            fired += _push_alert("stale", l,
                f"[오프라인] {name} {_STALE_DAYS}일 무접촉",
                f"마지막 접촉 {last} 이후 {_STALE_DAYS}일 넘게 접촉 기록이 없습니다. (단계: {stage})",
                str(last))
        elif not last and stage not in ("contacted",):
            # 접촉 기록 자체가 없는 진행 리드 — 최초 1회
            fired += _push_alert("no_contact", l,
                f"[오프라인] {name} 접촉 기록 없음",
                f"{name}(단계: {stage})에 접촉 기록이 하나도 없습니다. 활동을 기록해 주세요.", "init")

    if fired:
        logger.info("[offline] 관리 알림 %d건 발행", fired)
    return {"ok": True, "fired": fired, "checked": len(leads)}
