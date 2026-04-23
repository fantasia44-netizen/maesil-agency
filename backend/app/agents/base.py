"""
에이전트 베이스 클래스.
- Anthropic tool_use 루프 실행
- agent_work.runs 기록
- tool 게이트 (권한 검사)
"""
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import anthropic

from app.db.autotool_client import get_autotool_client
from app.db.registry_client import get_operator_id
from app.services.secrets import get_secret
from app.tools.db_tools import run_readonly_sql
from app.tools.write_tools import create_finding, create_snapshot, create_suggestion

DEFAULT_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048
MAX_TOOL_ROUNDS = 8


def _get_anthropic_client() -> anthropic.Anthropic:
    api_key = get_secret("anthropic_api_key")
    if not api_key:
        raise ValueError("Anthropic API 키가 설정되지 않았습니다. /settings에서 'anthropic_api_key'를 등록하세요.")
    return anthropic.Anthropic(api_key=api_key)


class BaseAgent:
    """
    모든 에이전트의 기반.
    서브클래스에서 agent_type, system_prompt, tools 를 정의.
    """
    agent_type: str = "base"
    model: str = DEFAULT_MODEL

    def get_system_prompt(self) -> str:
        raise NotImplementedError

    def get_tools(self) -> list[dict]:
        """Anthropic tool 정의 목록."""
        return COMMON_TOOLS

    def run(
        self,
        message: str,
        conversation_id: str,
        run_id: str | None = None,
    ) -> dict[str, Any]:
        """메시지를 받아 에이전트를 실행하고 결과 반환."""
        run_id = run_id or str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()
        _log_run_start(run_id, conversation_id, self.agent_type, self.model)

        try:
            client = _get_anthropic_client()
            operator_id = get_operator_id("autotool")

            system = self.get_system_prompt()
            if operator_id:
                system += f"\n\n[운영자 operator_id: {operator_id}]"

            messages = [{"role": "user", "content": message}]
            tools = self.get_tools()

            input_tokens = 0
            output_tokens = 0
            final_text = ""

            for _round in range(MAX_TOOL_ROUNDS):
                resp = client.messages.create(
                    model=self.model,
                    max_tokens=MAX_TOKENS,
                    system=system,
                    tools=tools,
                    messages=messages,
                )
                input_tokens += resp.usage.input_tokens
                output_tokens += resp.usage.output_tokens

                # 텍스트 블록 수집
                text_parts = [b.text for b in resp.content if b.type == "text"]
                if text_parts:
                    final_text = "\n".join(text_parts)

                if resp.stop_reason == "end_turn":
                    break

                if resp.stop_reason == "tool_use":
                    # tool_use 블록 처리
                    tool_results = []
                    for block in resp.content:
                        if block.type != "tool_use":
                            continue
                        result = self._dispatch_tool(
                            block.name, block.input, run_id, operator_id
                        )
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result, ensure_ascii=False, default=str),
                        })

                    messages.append({"role": "assistant", "content": resp.content})
                    messages.append({"role": "user", "content": tool_results})
                else:
                    break

            cost_usd = _estimate_cost(self.model, input_tokens, output_tokens)
            _log_run_end(run_id, "success", input_tokens, output_tokens, cost_usd)

            return {
                "run_id": run_id,
                "agent_type": self.agent_type,
                "message": final_text or "(응답 없음)",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost_usd,
                "status": "success",
            }

        except Exception as e:
            _log_run_end(run_id, "failed", 0, 0, 0, str(e))
            raise

    def _dispatch_tool(
        self,
        tool_name: str,
        tool_input: dict,
        run_id: str,
        operator_id: str | None,
    ) -> Any:
        """도구 이름으로 실제 함수를 호출."""
        _log_tool_call(run_id, tool_name, tool_input)

        if tool_name == "query_db":
            template_key = tool_input["template_key"]
            params = tool_input.get("params", {})
            if operator_id and "operator_id" not in params:
                params["operator_id"] = operator_id
            rows = run_readonly_sql(template_key, params, self.agent_type, run_id)
            return {"rows": rows, "count": len(rows)}

        elif tool_name == "create_finding":
            fid = create_finding(
                run_id=run_id,
                agent_type=self.agent_type,
                kind=tool_input["kind"],
                title=tool_input["title"],
                body=tool_input["body"],
                confidence_score=tool_input.get("confidence_score"),
            )
            return {"finding_id": fid, "status": "saved"}

        elif tool_name == "create_snapshot":
            sid = create_snapshot(
                run_id=run_id,
                agent_type=self.agent_type,
                kind=tool_input["kind"],
                payload=tool_input["payload"],
            )
            return {"snapshot_id": sid, "status": "saved"}

        elif tool_name == "create_suggestion":
            sid = create_suggestion(
                run_id=run_id,
                target_area=tool_input["target_area"],
                severity=tool_input.get("severity", "info"),
                title=tool_input["title"],
                body=tool_input["body"],
            )
            return {"suggestion_id": sid, "status": "saved"}

        else:
            return {"error": f"Unknown tool: {tool_name}"}


# ─── 공통 Anthropic 도구 정의 ───────────────────────────────────────

COMMON_TOOLS: list[dict] = [
    {
        "name": "query_db",
        "description": (
            "승인된 쿼리 템플릿으로 DB를 조회합니다. "
            "template_key는 반드시 허용 목록에 있는 것만 사용하세요."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "template_key": {
                    "type": "string",
                    "description": "쿼리 템플릿 키 (예: 'sales.today_revenue_by_channel')",
                },
                "params": {
                    "type": "object",
                    "description": "쿼리 파라미터 (operator_id는 자동 주입됨)",
                },
            },
            "required": ["template_key"],
        },
    },
    {
        "name": "create_finding",
        "description": "분석 결과나 이상 탐지를 agent_work.findings에 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["insight", "anomaly", "improvement", "alert"],
                },
                "title": {"type": "string"},
                "body": {"type": "string"},
                "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["kind", "title", "body"],
        },
    },
    {
        "name": "create_snapshot",
        "description": "분석 스냅샷을 agent_work.snapshots에 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "description": "스냅샷 유형 (예: 'morning_briefing')"},
                "payload": {"type": "object", "description": "저장할 데이터"},
            },
            "required": ["kind", "payload"],
        },
    },
    {
        "name": "create_suggestion",
        "description": "개선 제안을 agent_work.suggestions에 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "target_area": {"type": "string"},
                "severity": {"type": "string", "enum": ["info", "warning", "critical"]},
                "title": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["target_area", "severity", "title", "body"],
        },
    },
]


# ─── 헬퍼: runs 기록 ────────────────────────────────────────────────

def _log_run_start(run_id: str, conversation_id: str, agent_type: str, model: str) -> None:
    try:
        get_autotool_client().schema("agent_work").table("runs").insert({
            "id": run_id,
            "conversation_id": conversation_id,
            "agent_type": agent_type,
            "model": model,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass


def _log_run_end(
    run_id: str,
    status: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    error_reason: str | None = None,
) -> None:
    try:
        get_autotool_client().schema("agent_work").table("runs").update({
            "status": status,
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost_usd,
            "error_reason": error_reason,
        }).eq("id", run_id).execute()
    except Exception:
        pass


def _log_tool_call(run_id: str, tool_name: str, tool_input: dict) -> None:
    try:
        get_autotool_client().schema("agent_work").table("tool_calls").insert({
            "id": str(uuid.uuid4()),
            "run_id": run_id,
            "tool_name": tool_name,
            "input_summary": tool_input,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """모델별 토큰 비용 추정 (USD)."""
    rates = {
        "claude-haiku-4-5-20251001": (0.00025, 0.00125),   # per 1k tokens
        "claude-sonnet-4-5": (0.003, 0.015),
        "claude-opus-4-5": (0.015, 0.075),
    }
    in_rate, out_rate = rates.get(model, (0.003, 0.015))
    return round((input_tokens / 1000 * in_rate) + (output_tokens / 1000 * out_rate), 6)
