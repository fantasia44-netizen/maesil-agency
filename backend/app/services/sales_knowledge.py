"""
sales_knowledge — 영업/매출 에이전시 학습 DB (sales_insights)

흐름:
  1. SalesAgent 실행 전: load_insights()로 과거 인사이트 조회 → 시스템 프롬프트 주입
  2. SalesAgent 실행 전: get_cached_insight()로 당일 캐시 히트 확인 → LLM 호출 스킵
  3. SalesAgent 분석 완료 후: save_insight()로 핵심 인사이트 저장
     → 다음 동일 운영자 분석 시 과거 패턴 컨텍스트로 활용

캐시 정책:
  - general/channel_trend 등 일반 분석: 당일 동일 operator+type 이면 캐시 반환 (30분 TTL)
  - 갱신이 필요한 경우: force_refresh=True 로 강제 재실행
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone, timedelta

from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)

# 캐시 TTL (초) — 같은 operator+type 분석을 이 시간 내 재실행하지 않음
_CACHE_TTL_SECONDS = 1800  # 30분


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


def get_cached_insight(
    operator_id: str,
    insight_type: str = "general",
    ttl_seconds: int = _CACHE_TTL_SECONDS,
) -> dict | None:
    """TTL 이내 동일 operator+type 인사이트가 있으면 반환 (캐시 히트).

    반환값이 None이 아니면 → LLM 호출 스킵, 캐시 사용.
    반환값이 None이면 → 캐시 미스, 새로 분석 필요.
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=ttl_seconds)).isoformat()
        rows = (
            _table()
            .select("summary, data_snapshot, updated_at, period_label")
            .eq("operator_id", operator_id)
            .eq("insight_type", insight_type)
            .gte("updated_at", cutoff)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
            .data or []
        )
        if rows:
            hit = rows[0]
            age_s = (
                datetime.now(timezone.utc)
                - datetime.fromisoformat(hit["updated_at"].replace("Z", "+00:00"))
            ).total_seconds()
            logger.info(
                "sales_insights 캐시 히트 [%s/%s] age=%.0fs",
                operator_id, insight_type, age_s,
            )
            return hit
    except Exception as e:
        logger.warning("get_cached_insight 실패 [%s]: %s", operator_id, e)
    return None


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
