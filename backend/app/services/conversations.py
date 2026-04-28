"""대화 이력 저장/조회 서비스."""
import uuid
from datetime import datetime, timezone
from app.db.maesil_total_client import get_maesil_total_client


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
        "created_at": _now(),
    }).execute()


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


def get_messages(conversation_id: str) -> list[dict]:
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("conversation_messages")
        .select("id, role, agent_type, agent_display, content, cost_usd, run_id, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return resp.data or []
