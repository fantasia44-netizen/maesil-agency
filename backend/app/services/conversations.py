"""대화 이력 저장/조회 서비스.

파티션 전략 (028 마이그레이션 이후):
  message_type='summary'  — AI가 생성한 이전 대화 요약 파티션 마커
  is_archived=True        — 요약에 흡수된 오래된 메시지 (에이전트 컨텍스트 제외)

에이전트 컨텍스트 로딩 시:
  1) 최신 summary 메시지 1개 (있으면)
  2) is_archived=False인 normal 메시지만
  → 오래된 대화를 전부 읽지 않아 토큰 절약
"""
import uuid
from datetime import datetime, timezone
from app.db.maesil_total_client import get_maesil_total_client

# 파티션 관련 상수
_SELECT_COLS = "id, role, agent_type, agent_display, content, cost_usd, run_id, created_at, message_type, is_archived"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_conversation(
    conversation_id: str,
    first_message: str,
    user_id: str | None = None,
) -> str:
    """conversation_id가 없으면 생성, 있으면 updated_at 갱신."""
    client = get_maesil_total_client()
    title = first_message[:50] + ("…" if len(first_message) > 50 else "")
    now = _now()
    payload: dict = {
        "id":         conversation_id,
        "title":      title,
        "updated_at": now,
    }
    if user_id:
        payload["user_id"] = user_id
    client.schema("agent_work").table("conversations").upsert(
        payload, on_conflict="id"
    ).execute()
    return conversation_id


def save_user_message(conversation_id: str, content: str) -> None:
    get_maesil_total_client().schema("agent_work").table("conversation_messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": "user",
        "content": content,
        "message_type": "normal",
        "is_archived": False,
        "created_at": _now(),
    }).execute()


def save_agent_message(
    conversation_id: str,
    agent_type: str,
    agent_display: str,
    content: str,
    cost_usd: float = 0.0,
    run_id: str | None = None,
) -> None:
    get_maesil_total_client().schema("agent_work").table("conversation_messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": "agent",
        "agent_type": agent_type,
        "agent_display": agent_display,
        "content": content,
        "cost_usd": cost_usd,
        "run_id": run_id,
        "message_type": "normal",
        "is_archived": False,
        "created_at": _now(),
    }).execute()


def save_summary_partition(conversation_id: str, summary_text: str) -> str:
    """AI 요약 파티션 마커 저장. 반환값: 새 summary 메시지 id."""
    mid = str(uuid.uuid4())
    get_maesil_total_client().schema("agent_work").table("conversation_messages").insert({
        "id": mid,
        "conversation_id": conversation_id,
        "role": "summary",
        "content": summary_text,
        "message_type": "summary",
        "is_archived": False,
        "created_at": _now(),
    }).execute()
    return mid


def archive_messages(message_ids: list[str]) -> None:
    """지정 메시지들을 archived 처리 (요약에 흡수된 오래된 메시지)."""
    if not message_ids:
        return
    get_maesil_total_client().schema("agent_work").table("conversation_messages").update(
        {"is_archived": True}
    ).in_("id", message_ids).execute()


def count_active_messages(conversation_id: str) -> int:
    """is_archived=False인 normal 메시지 수 반환 (파티션 트리거 판단용)."""
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("conversation_messages")
        .select("id", count="exact")
        .eq("conversation_id", conversation_id)
        .eq("is_archived", False)
        .eq("message_type", "normal")
        .execute()
    )
    return resp.count or 0


def list_conversations(limit: int = 50, user_id: str | None = None) -> list[dict]:
    q = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", desc=True)
        .limit(limit)
    )
    if user_id:
        q = q.eq("user_id", user_id)
    return q.execute().data or []


def get_messages(
    conversation_id: str,
    include_archived: bool = False,
) -> list[dict]:
    """에이전트 컨텍스트용 스마트 로딩.

    include_archived=False (기본):
      - 최신 summary 파티션 1개 (있으면) +
      - is_archived=False인 normal 메시지
      → 오래된 대화를 전부 읽지 않아 토큰 절약

    include_archived=True:
      - 전체 메시지 (UI 히스토리 뷰용)
    """
    client = get_maesil_total_client()

    if include_archived:
        # UI 전체 뷰 — 모든 메시지 반환
        resp = (
            client.schema("agent_work").table("conversation_messages")
            .select(_SELECT_COLS)
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )
        return resp.data or []

    # ── 에이전트 컨텍스트: 최신 summary + 활성 normal 메시지 ─────
    results: list[dict] = []

    # 1) 최신 summary 파티션 1개 조회
    summary_resp = (
        client.schema("agent_work").table("conversation_messages")
        .select(_SELECT_COLS)
        .eq("conversation_id", conversation_id)
        .eq("message_type", "summary")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    summary_rows = summary_resp.data or []

    # 2) is_archived=False인 normal 메시지 조회
    active_resp = (
        client.schema("agent_work").table("conversation_messages")
        .select(_SELECT_COLS)
        .eq("conversation_id", conversation_id)
        .eq("message_type", "normal")
        .eq("is_archived", False)
        .order("created_at")
        .execute()
    )
    active_rows = active_resp.data or []

    # summary가 있으면 가장 앞에 배치 (컨텍스트 헤더)
    if summary_rows:
        results.append(summary_rows[0])
    results.extend(active_rows)
    return results


def get_conversation_owner(conversation_id: str) -> str | None:
    """conversation의 user_id 반환. 없으면 None (legacy/system 대화)."""
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("conversations")
        .select("user_id")
        .eq("id", conversation_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        return None
    return rows[0].get("user_id")
