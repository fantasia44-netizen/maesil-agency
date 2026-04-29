"""
db_introspector — 코드에서 참조되는 DB 테이블의 실제 스키마를 가져와
dev-agent 가 정확한 fix 를 만들 수 있도록 컨텍스트로 제공.

흐름:
  1) 코드 본문에서 REST 테이블 참조 패턴 추출
     - PostgREST: f'.../rest/v1/<table_name>' 또는 '...rest/v1/<table>?...'
     - Supabase 클라이언트: .table('<name>') / .from_('<name>')
  2) program_registry → db_registry_name 매핑으로 어느 DB 인지 확인
  3) 해당 DB 에 execute_readonly_sql RPC 로 information_schema 조회
  4) 컬럼 + default + 트리거 + check constraint 수집
  5) LLM 에게 첨부할 마크다운 텍스트로 포맷
"""
from __future__ import annotations

import logging
import re
from typing import Iterable

from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)

# REST 호출 패턴
_REST_V1_PATTERNS = [
    re.compile(r"/rest/v1/([a-zA-Z_][a-zA-Z0-9_]*)"),                      # f'{url}/rest/v1/<table>'
    re.compile(r"\.table\(\s*['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]\s*\)"),    # client.table('foo')
    re.compile(r"\.from_\(\s*['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]\s*\)"),    # client.from_('foo')
]

# 너무 일반적이거나 시스템 테이블은 제외
_TABLE_EXCLUDES = {"version", "swagger", "rpc", "auth", "storage"}


def extract_referenced_tables(content: str) -> list[str]:
    """코드에서 참조되는 테이블 이름 추출 (중복 제거)."""
    found: list[str] = []
    seen: set[str] = set()
    for pat in _REST_V1_PATTERNS:
        for m in pat.finditer(content):
            name = m.group(1)
            if name in _TABLE_EXCLUDES or name in seen:
                continue
            seen.add(name)
            found.append(name)
    return found


def _registry_table():
    return get_maesil_total_client().schema("agent_work").table("program_registry")


def get_program_db_name(program_name: str) -> str | None:
    """program → 연결된 db_registry_name 조회.
    sync_worker 처럼 별도 등록 안 된 프로그램은 부모 프로그램(maesil-insight) 추론."""
    try:
        resp = (
            _registry_table()
            .select("db_registry_name")
            .eq("name", program_name)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows and rows[0].get("db_registry_name"):
            return rows[0]["db_registry_name"]
    except Exception as e:
        logger.warning("program_registry 조회 실패 [%s]: %s", program_name, e)

    # fallback — 이름 패턴으로 추론
    n = program_name.lower()
    if "insight" in n or "sync-worker" in n or "naver_ad" in n:
        return "maesil-insight"
    if "total" in n:
        return "maesil-total"
    if "order" in n:
        return "maesil-order"
    if "account" in n:
        return "maesil-accounting"
    return None


def get_table_schema(db_name: str, table_name: str) -> dict | None:
    """information_schema 조회. {columns: [...], triggers: [...], check_constraints: [...]} 반환.
    DB 접속 실패시 None."""
    try:
        from app.db.registry_client import get_db_client
        client = get_db_client(db_name)
    except Exception as e:
        logger.warning("DB 클라이언트 생성 실패 [%s]: %s", db_name, e)
        return None

    def _exec(sql: str):
        try:
            r = client.rpc("execute_readonly_sql", {"query": sql}).execute()
            return r.data or []
        except Exception as e:
            logger.warning("execute_readonly_sql 실패 [%s/%s]: %s", db_name, table_name, e)
            return []

    # 컬럼 정보
    cols_sql = f"""
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '{table_name}'
        ORDER BY ordinal_position
    """
    columns = _exec(cols_sql)
    if not columns:
        # 테이블 자체가 없으면 더 진행 안함
        return {"table": table_name, "exists": False}

    # 트리거
    trig_sql = f"""
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' AND event_object_table = '{table_name}'
    """
    triggers = _exec(trig_sql)

    # CHECK constraints
    chk_sql = f"""
        SELECT cc.constraint_name, cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu
          ON cc.constraint_name = ccu.constraint_name
         AND cc.constraint_schema = ccu.constraint_schema
        WHERE ccu.table_schema = 'public' AND ccu.table_name = '{table_name}'
    """
    checks = _exec(chk_sql)

    return {
        "table": table_name,
        "exists": True,
        "columns": columns,
        "triggers": triggers,
        "check_constraints": checks,
    }


def format_schema_markdown(schema: dict) -> str:
    """LLM 컨텍스트용 마크다운 포맷."""
    if not schema or not schema.get("exists"):
        return f"### DB 테이블 `{schema.get('table', '?')}`\n⚠️ 테이블이 존재하지 않거나 접근 권한 없음\n"

    lines: list[str] = []
    lines.append(f"### DB 테이블 `public.{schema['table']}`")
    lines.append("| column | type | default | nullable |")
    lines.append("|---|---|---|---|")
    for c in schema.get("columns", []):
        default = (c.get("column_default") or "—")
        if len(default) > 40:
            default = default[:37] + "..."
        lines.append(
            f"| `{c['column_name']}` | `{c['data_type']}` | `{default}` | "
            f"{'YES' if c['is_nullable'] == 'YES' else 'NO'} |"
        )

    triggers = schema.get("triggers") or []
    if triggers:
        lines.append("\n**Triggers:**")
        for t in triggers:
            lines.append(f"- `{t['trigger_name']}` ({t['action_timing']} {t['event_manipulation']})")
    else:
        lines.append("\n**Triggers:** 없음")

    checks = schema.get("check_constraints") or []
    if checks:
        lines.append("\n**Check constraints:**")
        for ch in checks:
            lines.append(f"- `{ch['constraint_name']}`: {ch['check_clause']}")

    return "\n".join(lines)


def introspect_for_program(program_name: str, code_content: str) -> str:
    """프로그램 코드에서 참조되는 테이블의 실제 스키마를 가져와 마크다운으로 반환.
    DB 접근 실패하거나 테이블 못 찾으면 빈 문자열 (LLM 에게 false claim 유도하지 않게).
    """
    tables = extract_referenced_tables(code_content)
    if not tables:
        return ""

    db_name = get_program_db_name(program_name)
    if not db_name:
        logger.info("program → db 매핑 없음: %s", program_name)
        return ""

    blocks: list[str] = []
    blocks.append(f"## 🗄️ DB 스키마 컨텍스트 (`{db_name}` DB)")
    blocks.append("이 정보는 maesil-agency 가 자동으로 information_schema 에서 조회한 실제 DB 상태입니다.")
    blocks.append("이 외의 'DB 에 접속해보니' 같은 추론은 거짓 진술 — 절대 하지 말 것.\n")

    for tname in tables:
        schema = get_table_schema(db_name, tname)
        if schema is None:
            blocks.append(f"### DB 테이블 `{tname}`\n⚠️ 조회 실패 (권한/연결 오류)\n")
            continue
        blocks.append(format_schema_markdown(schema))
        blocks.append("")  # 구분 빈 줄

    return "\n".join(blocks)


__all__ = [
    "extract_referenced_tables", "get_program_db_name",
    "get_table_schema", "format_schema_markdown", "introspect_for_program",
]
