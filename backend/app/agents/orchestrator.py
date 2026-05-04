"""
오케스트레이터 — 하이브리드 라우팅 (규칙 1차 + LLM 2차).
멀티 에이전트 조합 지원. 복수 에이전트는 ThreadPoolExecutor로 병렬 실행.
"""
from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

from app.agents.base import _get_anthropic_client, _log_run_end, _log_run_start, _estimate_cost

# ─── 규칙 기반 라우팅 ──────────────────────────────────────────────

ROUTING_RULES: list[tuple[list[str], list[str]]] = [
    # 키워드 → [agent_types]
    (["매출", "판매", "주문", "채널", "revenue", "sales", "roas", "광고 성과"],
     ["sales"]),
    (["재무", "비용", "손익", "마진", "수익", "정산", "광고비", "finance", "pnl"],
     ["finance"]),
    (["재고", "발주", "입고", "출고", "안전재고", "warehouse", "inventory"],
     ["warehouse"]),
    (["cs", "고객", "상담", "클레임", "반품", "문의", "매요", "maeyo"],
     ["cs"]),
    (["테스트", "하네스", "test", "harness", "회귀", "검증"],
     ["tester"]),
    # 영업 아웃리치: 타겟 발굴 / 제안서 / 셀러 찾기
    (["타겟", "영업", "제안서", "셀러 찾", "아웃리치", "outreach",
      "발굴", "리스트 뽑", "홍보 대상", "잠재 고객", "잠재고객",
      "스토어 찾", "쇼핑몰 찾"],
     ["outreach"]),
    (["현황", "브리핑", "보고", "오늘", "아침", "요약", "전체"],
     ["sales", "finance"]),  # 현황 보고 → sales + finance 기본
]


def rule_route(message: str) -> list[str] | None:
    """키워드 매칭. 매칭 시 에이전트 리스트 반환, 없으면 None."""
    m = message.lower()
    for keywords, agents in ROUTING_RULES:
        if any(k in m for k in keywords):
            return agents
    return None


def llm_route(message: str) -> list[str]:
    """LLM으로 에이전트 라우팅 결정 (규칙 미매칭 시 사용)."""
    try:
        client = _get_anthropic_client()
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=128,
            system="""당신은 운영 AI 비서팀의 라우터입니다.
사용자 메시지를 분석해 적절한 에이전트를 선택하세요.
가능한 에이전트: sales, finance, warehouse, cs, outreach
- outreach: 외부 타겟 발굴, 제안서 작성, 셀러 찾기, 영업 리스트
여러 에이전트가 필요하면 쉼표로 구분해 반환하세요.
에이전트 이름만 반환하세요. 예: sales,finance""",
            messages=[{"role": "user", "content": f"메시지: {message}"}],
        )
        text = resp.content[0].text.strip().lower()
        valid = {"sales", "finance", "warehouse", "cs", "outreach"}
        agents = [a.strip() for a in text.split(",") if a.strip() in valid]
        return agents if agents else ["sales"]
    except Exception:
        return ["sales"]


def route(message: str) -> list[str]:
    """1차 규칙 → 2차 LLM 라우팅."""
    agents = rule_route(message)
    if agents:
        return agents
    return llm_route(message)


# ─── 멀티 에이전트 실행 ─────────────────────────────────────────────

def _run_single_agent(
    atype: str,
    message: str,
    conversation_id: str,
    run_id: str,
    operator_id: str | None,
    context_messages: list[dict] | None,
) -> dict[str, Any]:
    """단일 에이전트 실행 — ThreadPoolExecutor 내부에서 호출."""
    from app.agents.sales import SalesAgent
    from app.agents.finance import FinanceAgent
    from app.agents.warehouse import WarehouseAgent
    from app.agents.cs import CSAgent
    from app.agents.tester import TesterAgent
    from app.agents.outreach import OutreachAgent

    AGENT_MAP = {
        "sales":     SalesAgent,
        "finance":   FinanceAgent,
        "warehouse": WarehouseAgent,
        "cs":        CSAgent,
        "tester":    TesterAgent,
        "outreach":  OutreachAgent,
    }
    cls = AGENT_MAP.get(atype)
    if not cls:
        return {"run_id": run_id, "agent_type": atype,
                "message": f"[알 수 없는 에이전트: {atype}]", "status": "failed", "cost_usd": 0}
    try:
        agent = cls()
        return agent.run(message, conversation_id, run_id,
                         operator_id=operator_id, context_messages=context_messages)
    except Exception as e:
        return {"run_id": run_id, "agent_type": atype,
                "message": f"[에이전트 실행 오류] {e}", "status": "failed", "cost_usd": 0}


def run_agents(
    message: str,
    conversation_id: str,
    agent_types: list[str],
    operator_id: str | None = None,
    context_messages: list[dict] | None = None,
) -> list[dict[str, Any]]:
    """에이전트 실행 — 단일은 직접, 복수는 ThreadPoolExecutor 병렬 실행.

    context_messages: 이전 대화 히스토리.
    """
    if not agent_types:
        return []

    jobs = [(atype, str(uuid.uuid4())) for atype in agent_types]

    if len(jobs) == 1:
        atype, run_id = jobs[0]
        return [_run_single_agent(atype, message, conversation_id, run_id,
                                  operator_id, context_messages)]

    # 복수 에이전트 → 병렬 (run_id를 키로 써서 중복 atype도 안전)
    results_map: dict[str, dict] = {}  # run_id → result
    with ThreadPoolExecutor(max_workers=min(len(jobs), 4)) as exe:
        future_to_run_id = {
            exe.submit(_run_single_agent, atype, message, conversation_id,
                       run_id, operator_id, context_messages): run_id
            for atype, run_id in jobs
        }
        fallback_map = {run_id: (atype, run_id) for atype, run_id in jobs}
        for future in as_completed(future_to_run_id):
            run_id = future_to_run_id[future]
            atype  = fallback_map[run_id][0]
            try:
                results_map[run_id] = future.result()
            except Exception as e:
                results_map[run_id] = {
                    "run_id": run_id, "agent_type": atype,
                    "message": f"[병렬 실행 오류] {e}", "status": "failed", "cost_usd": 0,
                }

    # 원래 순서 복원
    return [results_map[run_id] for _, run_id in jobs if run_id in results_map]


BRIEFING_MESSAGES = {
    "sales": (
        "오늘 아침 매출 현황 보고를 작성해주세요. "
        "오늘 채널별 주문수와 매출을 조회하고, 어제와 비교해서 간결하게 정리해주세요. "
        "template: sales.today_revenue_by_channel"
    ),
    "finance": (
        "오늘 아침 재무 현황 보고를 작성해주세요. "
        "이번 달 광고비와 손익 현황을 조회해서 간결하게 정리해주세요. "
        "template: finance.ad_spend_by_channel, finance.daily_profit_snapshot"
    ),
    "warehouse": (
        "오늘 아침 재고 현황 보고를 작성해주세요. "
        "안전재고 이하 상품이 있는지 확인하고 발주 필요 여부를 알려주세요. "
        "template: warehouse.low_stock_items"
    ),
    "cs": (
        "오늘 아침 CS 현황 보고를 작성해주세요. "
        "최근 고객 문의량과 매요AI 레이어별 통계를 조회해서 간결하게 정리해주세요. "
        "template: cs.volume_by_day, cs.maeyo_question_log"
    ),
}


def run_morning_briefing(
    conversation_id: str,
    operator_id: str | None = None,
) -> list[dict[str, Any]]:
    """아침 현황 보고 — 4개 에이전트 병렬 실행."""
    briefing_agents = list(BRIEFING_MESSAGES.keys())  # sales, finance, warehouse, cs
    jobs = [(atype, str(uuid.uuid4())) for atype in briefing_agents]

    results_map: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=4) as exe:
        future_to_atype = {
            exe.submit(_run_single_agent, atype, BRIEFING_MESSAGES[atype],
                       conversation_id, run_id, operator_id, None): atype
            for atype, run_id in jobs
        }
        run_id_map = {atype: run_id for atype, run_id in jobs}
        for future in as_completed(future_to_atype):
            atype = future_to_atype[future]
            try:
                results_map[atype] = future.result()
            except Exception as e:
                results_map[atype] = {
                    "run_id": run_id_map[atype], "agent_type": atype,
                    "message": f"[에이전트 실행 오류] {e}", "status": "failed", "cost_usd": 0,
                }

    return [results_map[atype] for atype, _ in jobs if atype in results_map]
