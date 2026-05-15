"""
Growth Intelligence 에이전트 — 비즈니스 성장 종합 분석 엔진.

기존 Sales 에이전트 + Outreach 에이전트를 통합하고,
CS 인텔리전스·소비자 의도 분석·비즈니스 개선 제안 기능을 추가.

5대 역할:
  1. 매출 & 채널 인텔리전스  — 채널별 매출, ROAS, 상품 성과, 이상 탐지
  2. 영업 & 타겟 발굴        — 스마트스토어 셀러 발굴, 맞춤 제안서 생성
  3. CS 인텔리전스           — CS 대화 패턴 분석, L3 갭 파악, 불만 포인트
  4. 소비자 의도 분석        — 질문 패턴 → 구매 의도/이탈 신호/기능 요청 분류
  5. 비즈니스 개선 제안      — 데이터 기반 제품·서비스·CS 운영 개선 아이디어

학습 루프:
  - 실행 전: 이전 분석 결과를 시스템 프롬프트에 주입 (트렌드 비교)
  - 실행 후: 핵심 분석 결과를 growth_analysis_results에 저장
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.agents.base import (
    COMMON_TOOLS,
    BaseAgent,
    MAX_TOOL_ROUNDS,
    _build_messages,
    _estimate_cost,
    _get_anthropic_client,
    _log_run_end,
    _log_run_start,
    _log_tool_call,
)
from app.tools.naver_search_tool import search_naver_shopping
from app.tools.write_tools import create_finding, create_snapshot, create_suggestion

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5-20251001"   # 복합 분석 품질을 위해 Sonnet 사용


# ─────────────────────────────────────────────────────────────────
# Growth 전용 Tool 정의
# ─────────────────────────────────────────────────────────────────

_GROWTH_EXTRA_TOOLS: list[dict] = [
    # ── CS 인텔리전스 ────────────────────────────────────────────
    {
        "name": "analyze_cs_data",
        "description": (
            "매요 AI CS 대화 데이터를 분석합니다. "
            "자주 묻는 질문 패턴, 감정 분포, L3 미매칭 갭, 소비자 의도, "
            "부정 피드백·수정 패턴을 분석 유형별로 반환합니다."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "analysis_type": {
                    "type": "string",
                    "enum": ["cs_patterns", "consumer_intent", "negative_signals"],
                    "description": (
                        "cs_patterns: 자주 묻는 질문·감정 분포·L3 갭 | "
                        "consumer_intent: 소비자 의도 분류 (구매/불만/기능요청/이탈) | "
                        "negative_signals: 부정 피드백·수정 패턴"
                    ),
                },
                "program": {
                    "type": "string",
                    "description": "분석 대상 프로그램 ID",
                    "default": "maesil-insight",
                },
                "days": {
                    "type": "integer",
                    "description": "분석 기간 (일, 기본 30)",
                    "default": 30,
                },
            },
            "required": ["analysis_type"],
        },
    },
    # ── 영업 타겟 발굴 ───────────────────────────────────────────
    {
        "name": "search_naver_shopping",
        "description": (
            "키워드로 네이버쇼핑을 검색해 판매처(스마트스토어 셀러) 목록을 가져옵니다. "
            "영업 타겟 발굴에 사용. display 최대 30."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {"type": "string"},
                "display": {"type": "integer", "default": 30},
                "sort": {"type": "string", "default": "sim"},
            },
            "required": ["keyword"],
        },
    },
    {
        "name": "save_target_list",
        "description": "분석된 영업 타겟 셀러 리스트를 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {"type": "string"},
                "targets": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "mall_name":      {"type": "string"},
                            "store_url":      {"type": "string"},
                            "priority_score": {"type": "integer"},
                            "proposal_point": {"type": "string"},
                        },
                        "required": ["mall_name", "store_url", "priority_score", "proposal_point"],
                    },
                },
            },
            "required": ["keyword", "targets"],
        },
    },
    {
        "name": "create_proposal_draft",
        "description": "특정 셀러를 위한 맞춤 제안서 초안을 저장합니다. sections 5개를 채워주세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "mall_name":    {"type": "string"},
                "store_url":    {"type": "string"},
                "product_area": {"type": "string"},
                "proposal":     {"type": "string"},
                "sections": {
                    "type": "object",
                    "properties": {
                        "greeting":          {"type": "string"},
                        "insight":           {"type": "string"},
                        "value_proposition": {"type": "string"},
                        "social_proof":      {"type": "string"},
                        "cta":               {"type": "string"},
                    },
                },
            },
            "required": ["mall_name", "store_url"],
        },
    },
]

GROWTH_TOOLS: list[dict] = COMMON_TOOLS + _GROWTH_EXTRA_TOOLS


# ─────────────────────────────────────────────────────────────────
# 시스템 프롬프트
# ─────────────────────────────────────────────────────────────────

_BASE_SYSTEM = """당신은 매실인사이트 운영팀의 **그로스 인텔리전스 에이전트**입니다.
오늘 날짜: {today}

## 5대 역할

### 1. 매출 & 채널 인텔리전스
- `query_db`로 매출·채널·상품·광고비 데이터 분석
- 채널별 매출 현황, ROAS, 공헌이익률, 이상 탐지
- 비교 기간(어제·전주·전월)과 대비 분석

### 2. 영업 & 타겟 발굴
- `search_naver_shopping`으로 잠재 셀러 발굴
- 우선순위 스코어링 + 제안 포인트 도출
- `save_target_list` + `create_proposal_draft`로 자료 저장
- **제안서 핵심 소구**: "광고비 쓰는데 진짜 남는 돈 모른다" → 워터폴/POAS/공헌이익으로 해결
- ROAS 숫자 언급 금지. 근거 없는 수치 금지.

### 3. CS 인텔리전스
- `analyze_cs_data(cs_patterns)` → 자주 묻는 질문 TOP, 감정 분포, L3 갭 비율
- L3 비율이 높은 영역 = 즉시 L2 FAQ 강화 대상
- doubt/tired 감정이 많은 영역 = 고객 불만 포인트

### 4. 소비자 의도 분석
- `analyze_cs_data(consumer_intent)` → 의도별 분류
- **이탈 신호** (취소/해지/불편): 비율 파악 → 즉각 개선 우선순위
- **기능 요청**: 요청 빈도 → 제품 로드맵 반영 제안
- **구매 문의**: 전환율 개선 기회
- `analyze_cs_data(negative_signals)` → 수정 패턴 → L2 FAQ 개선 대상

### 5. 비즈니스 개선 제안
- 위 분석을 종합해 개선 우선순위 제시
- `create_suggestion`으로 구체적 개선 항목 저장
- `create_finding`으로 중요 인사이트 기록
- CS 개선 → dev 에이전트에 에스컬레이션이 필요하면 명시

## 응답 지침
1. 숫자는 한국어 형식 (원, 건, %)
2. 분석 결과는 **인사이트 → 근거 → 액션** 순서로 구성
3. 이탈 신호·불만 포인트는 항상 최우선으로 다룸
4. 개선 제안은 구체적 (무엇을, 어떻게, 기대 효과)
5. 간결하게 — 핵심 3~5개 포인트 집중

## 제약
- 읽기 전용 쿼리만 가능
- 영업 제안서: 실제 발송 금지 (자료 준비까지만)
- 연락처 수집 금지
"""


# ─────────────────────────────────────────────────────────────────
# GrowthAgent
# ─────────────────────────────────────────────────────────────────

class GrowthAgent(BaseAgent):
    agent_type = "growth"
    model = MODEL

    def get_system_prompt(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return _BASE_SYSTEM.format(today=today)

    def get_tools(self) -> list[dict]:
        return GROWTH_TOOLS

    def run(
        self,
        message: str,
        conversation_id: str,
        run_id: str | None = None,
        operator_id: str | None = None,
        context_messages: list[dict] | None = None,
    ) -> dict[str, Any]:
        """학습 루프: 이전 분석 주입 → LLM 실행 → 결과 저장."""
        from app.services.growth_intelligence import (
            load_recent_analyses, build_analysis_context,
            save_growth_analysis,
        )

        # 1) 이전 분석 결과를 시스템 프롬프트에 주입
        _original_get_prompt = self.get_system_prompt
        if operator_id:
            try:
                past = load_recent_analyses(operator_id, _detect_program(message))
                if past:
                    ctx = build_analysis_context(past)
                    def _patched_prompt():
                        return _original_get_prompt() + "\n\n" + ctx
                    self.get_system_prompt = _patched_prompt  # type: ignore[method-assign]
            except Exception as e:
                logger.warning("GrowthAgent 이전 분석 주입 실패: %s", e)

        # 2) 에이전트 실행
        run_id = run_id or str(uuid.uuid4())
        _log_run_start(run_id, conversation_id, self.agent_type, self.model)

        try:
            client = _get_anthropic_client()
            system  = self.get_system_prompt()
            msgs    = _build_messages(context_messages, message)
            tools   = self.get_tools()

            input_tokens = output_tokens = 0
            final_text = ""

            for _round in range(MAX_TOOL_ROUNDS):
                resp = client.messages.create(
                    model=self.model,
                    max_tokens=4096,    # 복잡한 분석 → 긴 응답 허용
                    system=system,
                    tools=tools,
                    messages=msgs,
                )
                input_tokens  += resp.usage.input_tokens
                output_tokens += resp.usage.output_tokens

                text_parts = [b.text for b in resp.content if b.type == "text"]
                if text_parts:
                    final_text = "\n".join(text_parts)

                if resp.stop_reason == "end_turn":
                    break

                if resp.stop_reason == "tool_use":
                    tool_results = []
                    for block in resp.content:
                        if block.type != "tool_use":
                            continue
                        result = self._dispatch_tool(block.name, block.input, run_id, operator_id)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result, ensure_ascii=False, default=str),
                        })
                    msgs.append({"role": "assistant", "content": resp.content})
                    msgs.append({"role": "user",      "content": tool_results})
                else:
                    break

            cost_usd = _estimate_cost(self.model, input_tokens, output_tokens)
            _log_run_end(run_id, "success", input_tokens, output_tokens, cost_usd)

            result = {
                "run_id":        run_id,
                "agent_type":    self.agent_type,
                "message":       final_text or "(응답 없음)",
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "cost_usd":      cost_usd,
                "status":        "success",
            }

            # 3) 분석 결과 저장 (다음 실행 시 컨텍스트로 활용)
            if operator_id and len(final_text) > 50:
                try:
                    atype = _detect_analysis_type(message)
                    program = _detect_program(message)
                    lines = [s.strip() for s in final_text.split("\n") if s.strip()]
                    summary = " ".join(lines[:3])[:500]
                    save_growth_analysis(
                        operator_id=operator_id,
                        program=program,
                        analysis_type=atype,
                        summary=summary,
                    )
                except Exception as e:
                    logger.warning("GrowthAgent 분석 저장 실패: %s", e)

            return result

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
        _log_tool_call(run_id, tool_name, tool_input)

        # ── 공통 도구 (base에서 상속) ──────────────────────────────
        if tool_name in {"query_db", "create_finding", "create_snapshot", "create_suggestion"}:
            return super()._dispatch_tool(tool_name, tool_input, run_id, operator_id)

        # ── CS 인텔리전스 ──────────────────────────────────────────
        elif tool_name == "analyze_cs_data":
            from app.services.growth_intelligence import (
                analyze_cs_patterns, analyze_consumer_intent, analyze_negative_signals,
            )
            atype   = tool_input.get("analysis_type", "cs_patterns")
            program = tool_input.get("program", "maesil-insight")
            days    = tool_input.get("days", 30)
            if atype == "cs_patterns":
                return analyze_cs_patterns(program=program, days=days)
            elif atype == "consumer_intent":
                return analyze_consumer_intent(program=program, days=days)
            elif atype == "negative_signals":
                return analyze_negative_signals(program=program, days=days)
            else:
                return {"error": f"알 수 없는 analysis_type: {atype}"}

        # ── 영업 타겟 발굴 ─────────────────────────────────────────
        elif tool_name == "search_naver_shopping":
            return search_naver_shopping(
                keyword=tool_input["keyword"],
                display=tool_input.get("display", 30),
                sort=tool_input.get("sort", "sim"),
            )

        elif tool_name == "save_target_list":
            targets = tool_input.get("targets") or []
            sid = create_snapshot(
                run_id=run_id, agent_type=self.agent_type,
                kind="outreach_targets",
                payload={
                    "keyword": tool_input.get("keyword", ""),
                    "targets": targets,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                valid_seconds=86400 * 30,
            )
            return {"snapshot_id": sid, "count": len(targets), "status": "saved"}

        elif tool_name == "create_proposal_draft":
            payload: dict[str, Any] = {
                "mall_name":    tool_input["mall_name"],
                "store_url":    tool_input.get("store_url", ""),
                "product_area": tool_input.get("product_area", ""),
                "proposal":     tool_input.get("proposal", ""),
                "created_at":   datetime.now(timezone.utc).isoformat(),
            }
            if tool_input.get("sections"):
                payload["sections"] = tool_input["sections"]
            sid = create_snapshot(
                run_id=run_id, agent_type=self.agent_type,
                kind="proposal_draft",
                payload=payload,
                valid_seconds=86400 * 30,
            )
            return {"snapshot_id": sid, "status": "saved"}

        else:
            return {"error": f"Unknown tool: {tool_name}"}


# ─────────────────────────────────────────────────────────────────
# 헬퍼
# ─────────────────────────────────────────────────────────────────

def _detect_analysis_type(message: str) -> str:
    """메시지에서 분석 유형 추론."""
    m = message.lower()
    if any(k in m for k in ("cs", "고객", "상담", "문의", "매요", "대화")):
        return "cs_patterns"
    if any(k in m for k in ("소비자", "의도", "이탈", "구매", "전환")):
        return "consumer_intent"
    if any(k in m for k in ("영업", "타겟", "셀러", "제안서", "발굴")):
        return "outreach"
    if any(k in m for k in ("개선", "문제", "불만", "피드백", "수정")):
        return "improvement_plan"
    return "sales_summary"


def _detect_program(message: str) -> str:
    """메시지에서 프로그램 ID 추론."""
    m = message.lower()
    if "스튜디오" in m or "studio" in m:
        return "maesil-studio"
    return "maesil-insight"
