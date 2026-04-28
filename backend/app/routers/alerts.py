"""
Alerts router:
  - POST /api/alerts/poll       — Render Cron Job이 3분 간격으로 호출 (로그 폴링 + 발송)
  - GET  /api/alerts/recent     — 위젯/대시보드용 최근 알림 N건
  - POST /api/alerts/{id}/ack   — 위젯에서 알림 확인 처리
  - POST /api/alerts/test       — 수동 테스트용 (가짜 이벤트 1건 생성 + 발송)
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import require_bearer
from app.db.maesil_total_client import get_maesil_total_client
from app.services import alert_dispatcher, render_logs

router = APIRouter(prefix="/api/alerts", tags=["alerts"], dependencies=[Depends(require_bearer)])


def _events_table():
    return get_maesil_total_client().schema("agent_work").table("alert_events")


@router.post("/poll")
def poll_now() -> dict:
    """Render 로그 폴링 + 미발송 이벤트 dispatch.
    Render Cron Job이 3분 간격으로 호출."""
    poll_result = render_logs.poll_all()
    dispatch_result = alert_dispatcher.dispatch_pending(limit=100)
    return {
        "polled_at": datetime.now(timezone.utc).isoformat(),
        "render": poll_result,
        "dispatch": dispatch_result,
    }


@router.get("/recent")
def recent(
    limit: int = Query(20, ge=1, le=100),
    only_unack: bool = Query(False, description="확인 처리 안 된 것만"),
) -> dict:
    q = _events_table().select(
        "id, program_name, severity, source, title, message, created_at, acknowledged_at, sent_channels"
    ).order("created_at", desc=True).limit(limit)
    if only_unack:
        q = q.is_("acknowledged_at", "null")
    resp = q.execute()
    return {"events": resp.data or []}


class AckBody(BaseModel):
    by: str | None = None


@router.post("/{event_id}/ack")
def acknowledge(event_id: str, body: AckBody | None = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    update = {"acknowledged_at": now}
    if body and body.by:
        update["acknowledged_by"] = body.by
    resp = _events_table().update(update).eq("id", event_id).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, detail="event not found")
    return rows[0]


class TestBody(BaseModel):
    severity: str = "error"
    title: str = "수동 테스트 알림"
    message: str = "이 알림은 /api/alerts/test 로 수동 생성되었습니다."


@router.post("/test")
def test_alert(body: TestBody) -> dict:
    """가짜 이벤트 1건을 INSERT 하고 dispatch까지 실행.
    채널 검증 + 메일 게이트웨이 점검용."""
    if body.severity not in {"info", "warning", "error", "critical"}:
        raise HTTPException(400, detail="invalid severity")

    now = datetime.now(timezone.utc)
    dedup = f"manual-test:{now.timestamp()}"
    _events_table().insert({
        "program_name": None,
        "severity": body.severity,
        "source": "manual-test",
        "title": body.title,
        "message": body.message,
        "dedup_key": dedup,
        "raw": {"manual": True},
    }).execute()

    dispatch = alert_dispatcher.dispatch_pending(limit=10)
    return {"ok": True, "dispatch": dispatch}
