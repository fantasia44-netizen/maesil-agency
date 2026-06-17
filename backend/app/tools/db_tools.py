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

from app.agent_config.query_templates import QUERY_TEMPLATES
from app.db.maesil_total_client import get_maesil_total_client
from app.db.registry_client import get_db_client


_MAX_PARAM_LEN = 500


def _to_sql_literal(key: str, value: Any) -> str:
    """파라미터 값을 안전한 SQL 리터럴로 변환.

    - bool/int/float: 숫자/불리언 리터럴 (str() 직접 주입 금지 — 타입 강제)
    - None: NULL
    - str: 제어문자(특히 NUL) 차단, 길이 제한, 작은따옴표 doubling.
           PostgreSQL standard_conforming_strings=on 가정(기본값).
    - 그 외 타입: 거부 (리스트/딕트 등 객체 주입 차단)
    """
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError(f"Invalid numeric parameter '{key}'")
        return repr(value)
    if isinstance(value, str):
        if "\x00" in value:
            raise ValueError(f"Parameter '{key}' contains NUL byte")
        if len(value) > _MAX_PARAM_LEN:
            raise ValueError(f"Parameter '{key}' too long (>{_MAX_PARAM_LEN})")
        # 백슬래시는 standard_conforming_strings=on 에서 리터럴이므로 따옴표만 이스케이프
        safe_val = value.replace("'", "''")
        return f"'{safe_val}'"
    raise ValueError(f"Unsupported parameter type for '{key}': {type(value).__name__}")


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

    # 템플릿이 선언한 파라미터만 허용 (선언 외 키 주입 차단)
    declared = set(template.get("params", []))

    # 파라미터 치환 (:param → 리터럴). 자유 SQL이 아니라 고정 템플릿 + 검증된 리터럴.
    # 긴 이름 우선 치환 (부분 매칭 방지: :date_from 치환 전에 :date가 먼저 걸리는 문제)
    sorted_params = sorted(params.items(), key=lambda kv: -len(kv[0]))
    for key, value in sorted_params:
        if declared and key not in declared:
            _audit(template_key, agent_type, run_id, "denied", None, 0,
                   f"undeclared param '{key}' for template '{template_key}'")
            raise ValueError(f"Undeclared parameter for '{template_key}': {key}")
        placeholder = f":{key}"
        literal = _to_sql_literal(key, value)
        sql = sql.replace(placeholder, literal)

    # 미치환 플레이스홀더 탐지 (::numeric 등 PG 타입 캐스트 제외)
    import re as _re
    remaining = _re.findall(r"(?<!:):[a-z_][a-z0-9_]*", sql)
    if remaining:
        missing = [r[1:] for r in remaining]
        raise ValueError(f"Missing params for '{template_key}': {missing}")

    start = time.monotonic()
    status = "ok"
    error_msg = None
    rows: list[dict] = []

    try:
        if db_name == "maesil-total":
            client = get_maesil_total_client()
        else:
            client = get_db_client(db_name)

        # autotool은 agent_work 스키마에서 함수 호출, 나머지는 public
        if db_name == "maesil-total":
            result = client.schema("agent_work").rpc(
                "execute_readonly_sql", {"query": sql}
            ).execute()
        else:
            result = client.rpc(
                "execute_readonly_sql", {"query": sql}
            ).execute()
        rows = result.data or []
        # RPC가 jsonb 반환 시 언패킹
        if isinstance(rows, list) and len(rows) == 1 and isinstance(rows[0], dict) and "execute_readonly_sql" in rows[0]:
            import json
            rows = rows[0]["execute_readonly_sql"] or []

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
    db_name: str = "maesil-total",
) -> None:
    try:
        autotool = get_maesil_total_client()
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
