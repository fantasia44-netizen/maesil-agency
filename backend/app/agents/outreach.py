"""
영업(Outreach) 에이전트 — 외부 타겟 셀러 발굴 · 분석 · 제안서 초안 생성.

역할:
  1. 키워드로 네이버쇼핑 검색 → 잠재 고객(스마트스토어 셀러) 리스트 추출
  2. 각 셀러의 상황 분석 (규모 추정, 광고 필요도, 인사이트 필요도)
  3. 우선순위 스코어링 + 제안 포인트 도출
  4. 제안서 초안 텍스트 생성
  5. 타겟 리스트 저장 (snapshots → 나중에 CSV 다운로드)

타겟: 스마트스토어 셀러 (maesil-insight / maesil-studio 잠재 고객)
제약: 연락처 수집 불가 / 발송은 사람이 직접
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import anthropic

from app.agents.base import (
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
from app.tools.write_tools import create_finding, create_snapshot

MODEL = "claude-haiku-4-5-20251001"  # Render 60초 타임아웃 내 처리


OUTREACH_TOOLS: list[dict] = [
    {
        "name": "get_industry_benchmark",
        "description": (
            "카테고리/키워드로 업계 평균 ROAS·실수익률·주요 채널을 조회합니다. "
            "제안서 작성 전에 반드시 호출해 실제 데이터를 근거로 삼으세요."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword_or_area": {
                    "type": "string",
                    "description": "검색 키워드 또는 셀러 카테고리 (예: 스킨케어, 주방용품, 반려동물)",
                },
            },
            "required": ["keyword_or_area"],
        },
    },
    {
        "name": "search_naver_shopping",
        "description": (
            "키워드로 네이버쇼핑을 검색해 판매처(스마트스토어 셀러) 목록을 가져옵니다. "
            "display는 최대 100. sort는 sim(정확도)/date/asc/dsc 중 하나."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "검색 키워드 (예: 스킨케어, 주방용품)"},
                "display": {"type": "integer", "description": "조회할 상품 수 (기본 100, 최대 100)", "default": 100},
                "sort": {"type": "string", "description": "정렬 방식 (sim=정확도, asc=가격낮은순)", "default": "sim"},
            },
            "required": ["keyword"],
        },
    },
    {
        "name": "save_target_list",
        "description": (
            "분석 완료된 타겟 셀러 리스트를 저장합니다. "
            "이후 대시보드에서 CSV로 다운로드하거나 제안서 발송에 활용됩니다."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "검색에 사용한 키워드"},
                "targets": {
                    "type": "array",
                    "description": "타겟 셀러 목록",
                    "items": {
                        "type": "object",
                        "properties": {
                            "mall_name":      {"type": "string"},
                            "store_url":      {"type": "string"},
                            "best_rank":      {"type": "integer"},
                            "product_count":  {"type": "integer"},
                            "price_range":    {"type": "string", "description": "예: 1만~5만원"},
                            "categories":     {"type": "array", "items": {"type": "string"}},
                            "priority_score": {"type": "integer", "description": "영업 우선순위 1~10"},
                            "proposal_point": {"type": "string", "description": "이 셀러에게 제안할 핵심 포인트"},
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
        "description": (
            "특정 셀러를 위한 맞춤 제안서 초안을 저장합니다. "
            "get_industry_benchmark로 얻은 benchmark 데이터를 함께 전달하면 "
            "PDF에 ROAS·실수익률 차트가 자동 삽입됩니다."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mall_name":    {"type": "string",  "description": "셀러/스토어명"},
                "store_url":    {"type": "string"},
                "product_area": {"type": "string",  "description": "주요 판매 카테고리"},
                "proposal":     {"type": "string",  "description": "제안서 전체 본문 (sections 없을 때 사용)"},
                "sections": {
                    "type": "object",
                    "description": "구조화 섹션 (있으면 proposal 보다 우선 렌더링)",
                    "properties": {
                        "greeting":          {"type": "string", "description": "인사말 (1~2문장)"},
                        "insight":           {"type": "string", "description": "셀러 현황 파악 — 카테고리/규모/상황"},
                        "value_proposition": {"type": "string", "description": "매실 솔루션 가치 제안 — 구체적으로"},
                        "social_proof":      {"type": "string", "description": "도입 효과 — 벤치마크 숫자 활용"},
                        "cta":               {"type": "string", "description": "다음 단계 안내 (무료 체험 등)"},
                    },
                },
                "benchmark": {
                    "type": "object",
                    "description": "get_industry_benchmark 결과 — PDF 차트에 사용됨",
                    "properties": {
                        "category":       {"type": "string"},
                        "avg_roas":       {"type": "number"},
                        "avg_margin_pct": {"type": "number"},
                        "top_channel":    {"type": "string"},
                        "sample_size":    {"type": "integer"},
                        "source":         {"type": "string"},
                    },
                },
            },
            "required": ["mall_name", "store_url"],
        },
    },
    {
        "name": "create_finding",
        "description": "시장 인사이트나 분석 결과를 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind":  {"type": "string", "enum": ["insight", "anomaly", "improvement", "alert"]},
                "title": {"type": "string"},
                "body":  {"type": "string"},
                "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["kind", "title", "body"],
        },
    },
]


class OutreachAgent(BaseAgent):
    agent_type = "outreach"
    model = MODEL

    def get_system_prompt(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return f"""당신은 **매실 영업 에이전트**입니다. 오늘 날짜: {today}

## 역할
매실인사이트 / 매실스튜디오의 잠재 고객(스마트스토어 셀러)을 발굴하고,
맞춤 영업 자료를 준비합니다. 실제 발송은 사람이 직접 합니다.

## 주요 서비스 (제안 대상)
- **매실인사이트**: 네이버·쿠팡 판매 데이터 통합 분석 대시보드
  - 광고 효율(ROAS), 매출 트렌드, 키워드 성과 한눈에 파악
  - "엑셀 노가다 없이 자동으로 매출 분석"
- **매실스튜디오**: AI 기반 쇼핑몰 콘텐츠 제작 (상세페이지, 썸네일, 영상)
  - 촬영 없이 AI로 제품 이미지·영상 자동 생성

## 타겟 발굴 기준
- 네이버쇼핑 검색 결과 5~50위권 셀러 (너무 크지도 작지도 않은)
- 상품이 여러 개 있으나 광고/분석 도구 없어 보이는 셀러
- 카테고리: 뷰티, 식품, 생활용품, 패션, 반려동물 등 경쟁 심한 카테고리 우선

## 우선순위 스코어링 (1~10)
- 10에 가까울수록 즉시 연락 우선
- 순위 10~30위 + 상품 2개 이상 → 높은 점수
- 순위 1~5위 → 이미 큰 셀러, 점수 낮춤
- 순위 50위 이하 → 소규모, 점수 낮춤

## 제안서 작성 원칙
1. **반드시 `get_industry_benchmark`를 먼저 호출**해 실제 ROAS·실수익률 데이터를 확인
2. 셀러 카테고리/상품에 맞게 구체적으로 작성 (일반적 문구 금지)
3. 벤치마크 숫자를 social_proof 섹션에 직접 인용 ("동일 카테고리 평균 ROAS X.Xx" 형식)
4. sections 필드를 반드시 채울 것 (greeting/insight/value_proposition/social_proof/cta)
5. 부드럽고 친근한 톤, 수신거부 언급 불필요

## 워크플로우
1. `search_naver_shopping`으로 셀러 목록 조회
2. 결과 분석 → 우선순위 스코어 + 제안 포인트 도출
3. `save_target_list`로 타겟 리스트 저장
4. 제안서 작성 시:
   a. `get_industry_benchmark`로 카테고리 데이터 조회
   b. `create_proposal_draft`에 sections + benchmark 함께 저장
5. 시장 인사이트는 `create_finding`으로 저장

## 제약
- 연락처(전화번호, 이메일) 수집·저장 금지
- 실제 발송 행위 금지 (리스트 준비까지만)
- 허위 정보 포함 금지
"""

    def get_tools(self) -> list[dict]:
        return OUTREACH_TOOLS

    def run(
        self,
        message: str,
        conversation_id: str,
        run_id: str | None = None,
        operator_id: str | None = None,
        context_messages: list[dict] | None = None,
    ) -> dict[str, Any]:
        run_id = run_id or str(uuid.uuid4())
        _log_run_start(run_id, conversation_id, self.agent_type, self.model)

        try:
            client = _get_anthropic_client()
            system = self.get_system_prompt()
            messages = _build_messages(context_messages, message)
            tools = self.get_tools()

            input_tokens = output_tokens = 0
            final_text = ""

            for _round in range(MAX_TOOL_ROUNDS):
                resp = client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=system,
                    tools=tools,
                    messages=messages,
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
                    messages.append({"role": "assistant", "content": resp.content})
                    messages.append({"role": "user",      "content": tool_results})
                else:
                    break

            cost_usd = _estimate_cost(self.model, input_tokens, output_tokens)
            _log_run_end(run_id, "success", input_tokens, output_tokens, cost_usd)
            return {
                "run_id":        run_id,
                "agent_type":    self.agent_type,
                "message":       final_text or "(응답 없음)",
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "cost_usd":      cost_usd,
                "status":        "success",
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
        _log_tool_call(run_id, tool_name, tool_input)

        if tool_name == "get_industry_benchmark":
            from app.services.insight_benchmark import get_benchmark
            return get_benchmark(tool_input.get("keyword_or_area", ""))

        elif tool_name == "search_naver_shopping":
            return search_naver_shopping(
                keyword=tool_input["keyword"],
                display=tool_input.get("display", 100),
                sort=tool_input.get("sort", "sim"),
            )

        elif tool_name == "save_target_list":
            targets = tool_input.get("targets") or []   # KeyError 방지
            sid = create_snapshot(
                run_id=run_id,
                agent_type=self.agent_type,
                kind="outreach_targets",
                payload={
                    "keyword":    tool_input.get("keyword", ""),
                    "targets":    targets,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                valid_seconds=86400 * 30,  # 30일 보관
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
            if tool_input.get("benchmark"):
                payload["benchmark"] = tool_input["benchmark"]

            sid = create_snapshot(
                run_id=run_id,
                agent_type=self.agent_type,
                kind="proposal_draft",
                payload=payload,
                valid_seconds=86400 * 30,
            )
            return {"snapshot_id": sid, "status": "saved"}

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

        else:
            return {"error": f"Unknown tool: {tool_name}"}
