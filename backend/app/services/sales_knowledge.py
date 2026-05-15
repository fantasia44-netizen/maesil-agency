"""
sales_knowledge — 영업/매출 에이전시 학습 DB (sales_insights)

흐름:
  1. SalesAgent 실행 전: load_insights()로 과거 인사이트 조회 → 시스템 프롬프트 주입
  2. SalesAgent 분석 완료 후: save_insight()로 핵심 인사이트 저장
     → 다음 동일 운영자 분석 시 과거 패턴 컨텍스트로 활용
"""
from __future__ import annotations

import logging
import re
from datetime import date

from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)


def _table():
    return get_maesil_total_client().schema("agent_work").table("sales_insights")


def load_insights(operator_id: str, limit: int = 5) -> list[dict]:
    """최근 운영자 인사이트 조회."""
    try:
        resp = (
            _table()
            .select("insight_type, period_label, summary, updated_at")
            .eq("operator_id", operator_id)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning("sales_insights 조회 실패 [%s]: %s", operator_id, e)
        return []


def build_context(insights: list[dict]) -> str:
    """인사이트 목록을 시스템 프롬프트 삽입 텍스트로 변환."""
    if not insights:
        return ""
    lines = ["## 📊 이전 분석 인사이트 (동일 운영자)"]
    for item in insights:
        period = item.get("period_label") or ""
        itype = item.get("insight_type") or ""
        summary = item.get("summary") or ""
        updated = (item.get("updated_at") or "")[:10]
        lines.append(f"- [{itype}{' / ' + period if period else ''}] {summary} ({updated})")
    lines.append(
        "\n**활용**: 위 이전 인사이트를 참고해 현재 분석과 비교하고 트렌드를 파악하세요. "
        "중복 언급보다 변화 포인트를 강조하세요."
    )
    return "\n".join(lines)


def save_insight(
    operator_id: str,
    summary: str,
    insight_type: str = "general",
    period_label: str | None = None,
    data_snapshot: dict | None = None,
) -> None:
    """인사이트 저장 (UPSERT — 같은 operator + type + 기간이면 덮어씀)."""
    if not operator_id or not summary:
        return
    if not period_label:
        period_label = date.today().strftime("%Y-%m")
    try:
        _table().upsert(
            {
                "operator_id": operator_id,
                "insight_type": insight_type,
                "period_label": period_label,
                "summary": summary[:500],
                "data_snapshot": data_snapshot or {},
                "source": "sales_agent",
                "updated_at": "now()",
            },
            on_conflict="operator_id,insight_type,period_label",
        ).execute()
        logger.info("sales_insight 저장 [%s/%s/%s]", operator_id, insight_type, period_label)
    except Exception as e:
        logger.warning("sales_insight 저장 실패 [%s]: %s", operator_id, e)


def extract_insight_type(text: str) -> str:
    """분석 결과 텍스트에서 인사이트 유형을 추론."""
    t = text.lower()
    if any(k in t for k in ("채널별", "channel", "스마트스토어", "쿠팡")):
        return "channel_trend"
    if any(k in t for k in ("상품", "product", "판매 순위", "판매량")):
        return "top_product"
    if any(k in t for k in ("성장", "growth", "증가", "감소", "전월", "전년")):
        return "growth_pattern"
    if any(k in t for k in ("광고", "roas", "ad_spend", "광고비")):
        return "ad_performance"
    return "general"


__all__ = ["load_insights", "build_context", "save_insight", "extract_insight_type"]
