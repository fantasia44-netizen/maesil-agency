"""
오케스트레이터 — 하이브리드 라우팅 (규칙 1차 + LLM 2차).
멀티 에이전트 조합 지원.
"""
from __future__ import annotations

import uuid
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
가능한 에이전트: sales, finance, warehouse, cs
여러 에이전트가 필요하면 쉼표로 구분해 반환하세요.
에이전트 이름만 반환하세요. 예: sales,finance""",
            messages=[{"role": "user", "content": f"메시지: {message}"}],
        )
        text = resp.content[0].text.strip().lower()
        valid = {"sales", "finance", "warehouse", "cs"}
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

def run_agents(
    message: str,
    conversation_id: str,
    agent_types: list[str],
) -> list[dict[str, Any]]:
    """여러 에이전트를 순차 실행하고 결과 목록 반환."""
    from app.agents.sales import SalesAgent
    from app.agents.finance import FinanceAgent
    from app.agents.warehouse import WarehouseAgent
    from app.agents.cs import CSAgent
    from app.agents.tester import TesterAgent

    AGENT_MAP = {
        "sales": SalesAgent,
        "finance": FinanceAgent,
        "warehouse": WarehouseAgent,
        "cs": CSAgent,
        "tester": TesterAgent,
    }

    results = []
    for atype in agent_types:
        cls = AGENT_MAP.get(atype)
        if not cls:
            continue
        run_id = str(uuid.uuid4())
        try:
            agent = cls()
            result = agent.run(message, conversation_id, run_id)
            results.append(result)
        except Exception as e:
            results.append({
                "run_id": run_id,
                "agent_type": atype,
                "message": f"[에이전트 실행 오류] {e}",
                "status": "failed",
                "cost_usd": 0,
            })
    return results


def run_morning_briefing(conversation_id: str) -> list[dict[str, Any]]:
    """아침 현황 보고 — Sales + Finance + Warehouse + CS 순차 실행."""
    from datetime import date
    today = date.today().isoformat()
    message = (
        f"오늘({today}) 아침 현황 보고를 작성해주세요. "
        "오늘 매출 현황, 주요 지표, 특이사항을 중심으로 간결하게 정리해주세요."
    )
    return run_agents(
        message,
        conversation_id,
        ["sales", "finance", "warehouse", "cs"],
    )
