"""Tester 에이전트 — maesil-insight 하네스 API 호출로 회귀 검증 (Phase 4)."""
from __future__ import annotations

import httpx

from app.agents.base import BaseAgent, COMMON_TOOLS, _log_run_end, _log_run_start
from app.services.secrets import get_secret

HARNESS_SUITES = ["maeyo_context", "kst", "channel_fix"]


class TesterAgent(BaseAgent):
    agent_type = "tester"

    def get_system_prompt(self) -> str:
        return """당신은 매실인사이트 운영팀의 **테스터 에이전트**입니다.

## 역할
- maesil-insight 하네스 테스트를 실행하고 결과를 분석합니다.
- 테스트 실패 시 원인을 파악하고 개선 제안을 작성합니다.

## 사용 가능한 도구
- `run_harness` — 하네스 스위트 실행
- `create_finding` — 테스트 이슈 기록
- `create_suggestion` — 코드 개선 제안

## 응답 지침
1. 모든 스위트를 실행하고 결과를 표로 정리하세요.
2. FAIL인 스위트는 출력 로그를 분석해 원인을 설명하세요.
3. 이슈는 `create_finding(kind='anomaly')`로 저장하세요.

## 하네스 스위트 목록
- maeyo_context: 매요AI 채널상태 인지 검증
- kst: KST 타임존 및 모듈 임포트 검증
- channel_fix: 채널 연결 버그 수정 검증
"""

    def get_tools(self) -> list[dict]:
        harness_tool = {
            "name": "run_harness",
            "description": "maesil-insight 하네스 테스트를 실행합니다.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "suite": {
                        "type": "string",
                        "enum": HARNESS_SUITES,
                        "description": "실행할 하네스 스위트 이름",
                    }
                },
                "required": ["suite"],
            },
        }
        return COMMON_TOOLS + [harness_tool]

    def _dispatch_tool(self, tool_name: str, tool_input: dict, run_id: str, operator_id: str | None):
        if tool_name == "run_harness":
            return self._run_harness(tool_input["suite"])
        return super()._dispatch_tool(tool_name, tool_input, run_id, operator_id)

    def _run_harness(self, suite: str) -> dict:
        base_url = get_secret("maesil_insight_url")
        token = get_secret("harness_api_token")

        if not base_url:
            return {"error": "maesil_insight_url이 설정되지 않았습니다. /settings에서 등록하세요."}

        url = base_url.rstrip("/") + "/api/v1/harness/run"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            resp = httpx.post(url, json={"suite": suite}, headers=headers, timeout=90)
            return resp.json()
        except Exception as e:
            return {"suite": suite, "status": "fail", "output": str(e)}
