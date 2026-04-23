"""
읽기 전용 DB 쿼리 도구.
- 허용된 템플릿 키만 실행 가능
- 에이전트별 권한 검사
- query_audit 로깅
"""
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config.query_templates import QUERY_TEMPLATES
from app.db.autotool_client import get_autotool_client
from app.db.registry_client import get_db_client


def run_readonly_sql(
    template_key: str,
    params: dict[str, Any],
    agent_type: str,
    run_id: str | None = None,
) -> list[dict]:
    """
    승인된 쿼리 템플릿을 실행하고 결과를 반환.
    권한 위반 시 예외 발생.
    """
    template = QUERY_TEMPLATES.get(template_key)
    if not template:
        _audit(template_key, agent_type, run_id, "denied", None, 0, "unknown template")
        raise ValueError(f"Unknown query template: {template_key}")

    allowed = template.get("allowed_agents", [])
    if agent_type not in allowed:
        _audit(template_key, agent_type, run_id, "denied", None, 0,
               f"agent '{agent_type}' not allowed for template '{template_key}'")
        raise PermissionError(
            f"Agent '{agent_type}' is not allowed to run '{template_key}'. "
            f"Allowed: {allowed}"
        )

    db_name = template["db"]
    sql = template["sql"].strip()

    # 파라미터 치환 (:param → %(param)s 스타일)
    for key, value in params.items():
        placeholder = f":{key}"
        if isinstance(value, str):
            safe_val = value.replace("'", "''")
            sql = sql.replace(placeholder, f"'{safe_val}'")
        elif value is None:
            sql = sql.replace(placeholder, "NULL")
        else:
            sql = sql.replace(placeholder, str(value))

    start = time.monotonic()
    status = "ok"
    error_msg = None
    rows: list[dict] = []

    try:
        if db_name == "autotool":
            client = get_autotool_client()
        else:
            client = get_db_client(db_name)

        result = client.rpc("", {}).execute() if False else None  # unused branch

        # Supabase Python SDK는 raw SQL을 직접 지원하지 않으므로
        # postgrest RPC를 우회해 execute_sql 방식 사용
        result = client.postgrest.rpc(
            "execute_readonly_sql",
            {"query": sql},
        ).execute()
        rows = result.data or []

    except Exception as e:
        # execute_readonly_sql RPC가 없을 경우 fallback: table API 불가, 에러 반환
        # Phase 2 실제 배포 시 Supabase에 아래 RPC 함수 생성 필요
        error_msg = str(e)
        status = "error"
        rows = []

    latency_ms = int((time.monotonic() - start) * 1000)
    _audit(template_key, agent_type, run_id, status, sql, len(rows), error_msg, latency_ms, db_name)

    if status == "error":
        raise RuntimeError(f"Query failed [{template_key}]: {error_msg}")

    return rows


def _audit(
    template_key: str,
    agent_type: str,
    run_id: str | None,
    status: str,
    sql: str | None,
    row_count: int,
    error_message: str | None = None,
    latency_ms: int = 0,
    db_name: str = "autotool",
) -> None:
    try:
        autotool = get_autotool_client()
        autotool.schema("agent_work").table("query_audit").insert({
            "id": str(uuid.uuid4()),
            "run_id": run_id,
            "db_name": db_name,
            "template_key": template_key,
            "params": {"agent_type": agent_type},
            "sql_snippet": (sql or "")[:2000],
            "row_count": row_count,
            "latency_ms": latency_ms,
            "status": status,
            "error_message": error_message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass  # 감사 실패는 비즈니스 로직을 깨지 않음
