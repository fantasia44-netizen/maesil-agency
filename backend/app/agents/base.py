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

from app.db.maesil_total_client import get_maesil_total_client
from app.db.registry_client import get_operator_id
from app.services.secrets import get_secret
from app.tools.db_tools import run_readonly_sql
from app.tools.write_tools import create_finding, create_snapshot, create_suggestion

DEFAULT_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048
MAX_TOOL_ROUNDS = 8

# ─── 컨텍스트 토큰 보호 설정 ────────────────────────────────────────
# 메시지 1개당 최대 글자 수 (초과 시 말미 잘라냄 + 안내 표시)
_MAX_MSG_CHARS: int = 2_000
# 히스토리 전체 합산 최대 글자 수 (초과 시 오래된 메시지부터 제외)
_MAX_CONTEXT_CHARS: int = 40_000
# 현재 메시지(질문)는 더 넉넉하게 허용 (파일 붙여넣기 등)
_MAX_CURRENT_MSG_CHARS: int = 8_000
# 잘린 메시지에 붙이는 접미사
_TRUNCATE_SUFFIX: str = "…[내용 일부 생략]"


def _truncate(text: str, max_chars: int, suffix: str = _TRUNCATE_SUFFIX) -> str:
    """텍스트를 max_chars 이내로 자르고, 잘린 경우 suffix를 붙인다."""
    if len(text) <= max_chars:
        return text
    cut = max_chars - len(suffix)
    return text[:cut] + suffix


def _build_messages(
    context_messages: list[dict] | None,
    current_message: str,
    max_turns: int = 8,
) -> list[dict]:
    """대화 히스토리 + 현재 메시지를 Anthropic messages 형식으로 변환.

    보호 규칙 (토큰 오버플로우 방지):
    1. max_turns: 최근 N턴 슬라이딩 윈도우 (user+assistant 쌍 기준)
    2. _MAX_MSG_CHARS: 히스토리 메시지 1개당 글자 수 상한 (긴 답변 잘라냄)
    3. _MAX_CONTEXT_CHARS: 히스토리 전체 글자 합산 상한 (초과 시 오래된 것 제외)
    4. _MAX_CURRENT_MSG_CHARS: 현재 질문 글자 수 상한
    기타:
    - 연속된 같은 role은 합치기 (Anthropic API 요구사항: user↔assistant 교대)
    - 현재 메시지는 항상 마지막 user 메시지로 추가
    """
    msgs: list[dict] = []
    summary_header: str | None = None

    if context_messages:
        # ① summary 파티션 분리 — role='summary' 메시지는 컨텍스트 헤더로 따로 처리
        normal_msgs = []
        for m in context_messages:
            if m.get("message_type") == "summary" or m.get("role") == "summary":
                # 가장 마지막 summary만 사용 (최신 파티션)
                summary_header = str(m.get("content") or "").strip()
            else:
                normal_msgs.append(m)

        # ② 최근 max_turns 턴만 추출 (메시지 쌍이므로 ×2)
        recent = normal_msgs[-(max_turns * 2):]

        # ③ 각 메시지 내용 글자 수 제한
        for m in recent:
            role = "user" if m.get("role") == "user" else "assistant"
            raw_content = str(m.get("content") or "").strip()
            if not raw_content:
                continue
            content = _truncate(raw_content, _MAX_MSG_CHARS)

            if msgs and msgs[-1]["role"] == role:
                # 연속 같은 role → 합치기 (합친 후에도 상한 재적용)
                combined = msgs[-1]["content"] + "\n\n" + content
                msgs[-1]["content"] = _truncate(combined, _MAX_MSG_CHARS)
            else:
                msgs.append({"role": role, "content": content})

        # ④ 전체 히스토리 글자 합산 제한 — 오래된 메시지부터 제거
        total_chars = sum(len(m["content"]) for m in msgs)
        while msgs and total_chars > _MAX_CONTEXT_CHARS:
            removed = msgs.pop(0)
            total_chars -= len(removed["content"])
        # 제거 후 첫 메시지가 assistant면 대화 흐름 깨짐 → 추가 제거
        while msgs and msgs[0]["role"] == "assistant":
            removed = msgs.pop(0)
            total_chars -= len(removed["content"])

    # ⑤ summary 헤더가 있으면 가장 앞에 user 메시지로 삽입
    #    에이전트는 "이전 대화 요약을 전달받은 것"으로 인식
    if summary_header:
        truncated_summary = _truncate(summary_header, 1_500)
        msgs.insert(0, {"role": "user", "content": truncated_summary})
        # summary 다음에 assistant의 확인 메시지를 끼워 넣어 user→assistant 교대 유지
        msgs.insert(1, {"role": "assistant", "content": "이전 대화 요약을 확인했습니다. 계속 진행하겠습니다."})

    # ⑥ 현재 질문도 상한 적용
    #    마지막 메시지가 이미 user면 합쳐서 API user↔assistant 교대 규칙 유지
    safe_current = _truncate(current_message, _MAX_CURRENT_MSG_CHARS)
    if msgs and msgs[-1]["role"] == "user":
        combined = msgs[-1]["content"] + "\n\n" + safe_current
        msgs[-1]["content"] = _truncate(combined, _MAX_CURRENT_MSG_CHARS)
    else:
        msgs.append({"role": "user", "content": safe_current})
    return msgs


def _get_anthropic_client() -> anthropic.Anthropic:
    api_key = get_secret("anthropic_api_key") or get_secret("anthropic_api")
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
        operator_id: str | None = None,
        context_messages: list[dict] | None = None,
    ) -> dict[str, Any]:
        """메시지를 받아 에이전트를 실행하고 결과 반환.

        operator_id: JWT에서 주입 (customer의 insight_operator_id).
                     None이면 secrets 테이블의 기본값을 폴백으로 사용.
        context_messages: 이전 대화 히스토리 (conv_svc.get_messages() 반환값).
                          전달 시 멀티턴 컨텍스트 유지.
        """
        run_id = run_id or str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()
        _log_run_start(run_id, conversation_id, self.agent_type, self.model)

        try:
            client = _get_anthropic_client()
            # operator_id 미전달 시 secrets 테이블 폴백 (super_admin 직접 실행 등)
            if operator_id is None:
                operator_id = get_operator_id("maesil-insight") or get_operator_id("maesil-total")

            system = self.get_system_prompt()
            if operator_id:
                system += f"\n\n[운영자 operator_id: {operator_id}]"

            messages = _build_messages(context_messages, message)
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
            from datetime import date, timedelta
            template_key = tool_input["template_key"]
            params = tool_input.get("params", {})
            # 공통 파라미터 자동 주입
            # operator_id는 템플릿이 선언한 경우에만 주입
            from app.agent_config.query_templates import QUERY_TEMPLATES
            tmpl_declared = set(QUERY_TEMPLATES.get(template_key, {}).get("params", []))
            if "operator_id" not in params and "operator_id" in tmpl_declared:
                oid = operator_id or get_operator_id("maesil-insight") or get_operator_id("maesil-total")
                if oid:
                    params["operator_id"] = oid
            today = date.today().isoformat()
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            month_start = date.today().strftime("%Y-%m-01")
            year_month = date.today().strftime("%Y-%m")
            defaults = {
                "target_date": today,
                "compare_date": yesterday,
                "date_from": month_start,
                "date_to": today,
                "year_month_from": year_month,
                "since": month_start + "T00:00:00+00:00",
                "limit": 20,
            }
            # 템플릿에 선언된 파라미터만 주입 (미선언 파라미터 거부 방지)
            from app.agent_config.query_templates import QUERY_TEMPLATES
            declared = set(QUERY_TEMPLATES.get(template_key, {}).get("params", []))
            for k, v in defaults.items():
                if k not in params and (not declared or k in declared):
                    params[k] = v
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
        get_maesil_total_client().schema("agent_work").table("runs").insert({
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
        get_maesil_total_client().schema("agent_work").table("runs").update({
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
        get_maesil_total_client().schema("agent_work").table("tool_calls").insert({
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
        "claude-sonnet-4-6": (0.003, 0.015),               # same price as 4.5
        "claude-opus-4-5": (0.015, 0.075),
        "claude-opus-4-6": (0.005, 0.025),
    }
    in_rate, out_rate = rates.get(model, (0.003, 0.015))
    return round((input_tokens / 1000 * in_rate) + (output_tokens / 1000 * out_rate), 6)
