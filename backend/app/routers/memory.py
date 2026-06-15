"""
/api/memory — 에이전트 학습 메모리 조회 API

각 에이전트가 무엇을 배웠는지 한눈에 확인.
super_admin 전용 (내부 운영 도구).

엔드포인트:
  GET /api/memory/dev       — dev_lessons_learned (최근 20개, quality != bad)
  GET /api/memory/cs        — L2 스크립트 + draft + CS 패턴 요약
  GET /api/memory/growth    — growth_analysis_results (최근 10개)
  GET /api/memory/sales     — sales_insights (최근 10개)
  GET /api/memory/summary   — 위 4개 합산 한눈에 보기
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, get_current_user
from app.db.maesil_total_client import get_maesil_total_client

router = APIRouter(prefix="/api/memory", tags=["memory"])
logger = logging.getLogger(__name__)


def _require_admin(user: UserContext) -> UserContext:
    if not user.is_super_admin:
        raise HTTPException(status_code=403, detail="관리자 전용")
    return user


# ─────────────────────────────────────────────────────────────────
# Dev 레슨
# ─────────────────────────────────────────────────────────────────
@router.get("/dev")
def memory_dev(
    limit: int = 20,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """개발 에이전트가 PR 머지로 학습한 레슨 목록.

    - lesson_quality: good ✅ / ok ⚠️ / bad ❌
    - root_cause, actual_fix 포함 (P1-3 보강)
    """
    _require_admin(user)
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("dev_lessons_learned")
            .select("id, repo, error_type, error_pattern, fix_summary, root_cause, actual_fix, lesson_quality, test_result, files_changed, pr_url, created_at")
            .neq("lesson_quality", "bad")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        lessons = resp.data or []
        quality_counts = {"good": 0, "ok": 0, "bad": 0}
        for l in lessons:
            quality_counts[l.get("lesson_quality") or "ok"] = quality_counts.get(l.get("lesson_quality") or "ok", 0) + 1
        return {
            "total": len(lessons),
            "quality_counts": quality_counts,
            "lessons": lessons,
        }
    except Exception as e:
        logger.warning("memory_dev 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="dev 메모리 조회 중 오류가 발생했습니다.")


# ─────────────────────────────────────────────────────────────────
# CS 메모리
# ─────────────────────────────────────────────────────────────────
@router.get("/cs")
def memory_cs(
    program: str = "maesil-insight",
    limit: int = 30,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """CS 에이전트 학습 메모리.

    - L2 스크립트 수 (verified / unverified / draft)
    - feature_docs (L2.5 자동 생성 KB) 최근 목록
    - growth_analysis 중 cs_patterns 최신 요약
    """
    _require_admin(user)
    client = get_maesil_total_client()

    # L2 스크립트 통계
    l2_stats = {"active": 0, "draft": 0, "verified": 0}
    try:
        resp = (
            client.schema("agent_work").table("maeyo_l2_scripts")
            .select("id, is_verified, status")
            .eq("is_active", True)
            .in_("program", [program, "common"])
            .execute()
        )
        for row in (resp.data or []):
            if row.get("status") == "draft":
                l2_stats["draft"] += 1
            else:
                l2_stats["active"] += 1
            if row.get("is_verified"):
                l2_stats["verified"] += 1
    except Exception as e:
        logger.warning("L2 stats 실패: %s", e)

    # Feature KB (L2.5) 최근 목록
    feature_docs: list[dict] = []
    try:
        resp = (
            client.schema("agent_work").table("maeyo_feature_docs")
            .select("id, keywords, question_hint, answer, created_by, created_at")
            .eq("program", program)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        feature_docs = resp.data or []
    except Exception as e:
        logger.warning("feature_docs 조회 실패: %s", e)

    # CS 패턴 최신 분석
    cs_pattern_summary: str | None = None
    try:
        resp = (
            client.schema("agent_work").table("growth_analysis_results")
            .select("summary, updated_at")
            .eq("analysis_type", "cs_patterns")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows:
            cs_pattern_summary = f"[{rows[0]['updated_at'][:10]}] {rows[0]['summary']}"
    except Exception as e:
        logger.warning("cs_patterns 조회 실패: %s", e)

    return {
        "program": program,
        "l2_scripts": l2_stats,
        "feature_docs_count": len(feature_docs),
        "feature_docs": feature_docs,
        "cs_pattern_summary": cs_pattern_summary,
    }


# ─────────────────────────────────────────────────────────────────
# Growth 분석 메모리
# ─────────────────────────────────────────────────────────────────
@router.get("/growth")
def memory_growth(
    program: str = "maesil-insight",
    limit: int = 10,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """Growth Intelligence 에이전트 분석 결과 메모리.

    027 마이그레이션 실행 후 Supabase 스키마 캐시 리로드 필요:
      Supabase Dashboard → Settings → API → Reload schema cache
    """
    _require_admin(user)
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work").table("growth_analysis_results")
            .select("analysis_type, summary, insights, improvement_items, period_days, updated_at")
            .eq("program", program)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        analyses = resp.data or []
        return {
            "program": program,
            "total": len(analyses),
            "analyses": analyses,
        }
    except Exception as e:
        err_str = str(e)
        # PostgREST 스키마 캐시 미반영 — 027 SQL 실행 후 캐시 리로드 필요
        if "schema cache" in err_str or "PGRST205" in err_str:
            return {
                "program": program,
                "total": 0,
                "analyses": [],
                "notice": "growth_analysis_results 테이블이 스키마 캐시에 없습니다. "
                          "Supabase → Settings → API → Reload schema cache 후 재시도하세요.",
            }
        logger.warning("memory_growth 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="growth 메모리 조회 중 오류가 발생했습니다.")


# ─────────────────────────────────────────────────────────────────
# Sales 인사이트 메모리
# ─────────────────────────────────────────────────────────────────
@router.get("/sales")
def memory_sales(
    limit: int = 10,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """Sales / Growth 에이전트가 저장한 매출 인사이트."""
    _require_admin(user)
    try:
        resp = (
            get_maesil_total_client()
            .schema("agent_work").table("sales_insights")
            .select("operator_id, insight_type, summary, period_label, source, updated_at")
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        insights = resp.data or []
        return {
            "total": len(insights),
            "insights": insights,
        }
    except Exception as e:
        logger.warning("memory_sales 조회 실패: %s", e)
        raise HTTPException(status_code=500, detail="sales 메모리 조회 중 오류가 발생했습니다.")


# ─────────────────────────────────────────────────────────────────
# 전체 요약 (summary)
# ─────────────────────────────────────────────────────────────────
@router.get("/summary")
def memory_summary(
    program: str = "maesil-insight",
    user: UserContext = Depends(get_current_user),
) -> dict:
    """전체 에이전트 메모리 한눈에 보기 (가벼운 통계 + 최신 항목 1~3개)."""
    _require_admin(user)
    client = get_maesil_total_client()
    result: dict = {"program": program, "agents": {}}

    # Dev
    try:
        resp = client.schema("agent_work").table("dev_lessons_learned") \
            .select("lesson_quality, created_at").neq("lesson_quality", "bad") \
            .order("created_at", desc=True).limit(3).execute()
        rows = resp.data or []
        result["agents"]["dev"] = {
            "recent_count": len(rows),
            "latest": rows[0]["created_at"][:10] if rows else None,
        }
    except Exception:
        result["agents"]["dev"] = {"error": "조회 실패"}

    # CS L2
    try:
        resp = client.schema("agent_work").table("maeyo_l2_scripts") \
            .select("id, status").eq("is_active", True) \
            .in_("program", [program, "common"]).execute()
        rows = resp.data or []
        drafts  = sum(1 for r in rows if r.get("status") == "draft")
        actives = len(rows) - drafts
        result["agents"]["cs"] = {"l2_active": actives, "l2_draft": drafts}
    except Exception:
        result["agents"]["cs"] = {"error": "조회 실패"}

    # Growth
    try:
        resp = client.schema("agent_work").table("growth_analysis_results") \
            .select("analysis_type, updated_at").eq("program", program) \
            .order("updated_at", desc=True).limit(5).execute()
        rows = resp.data or []
        result["agents"]["growth"] = {
            "analysis_types": [r["analysis_type"] for r in rows],
            "latest": rows[0]["updated_at"][:10] if rows else None,
        }
    except Exception as _e:
        if "schema cache" in str(_e) or "PGRST205" in str(_e):
            result["agents"]["growth"] = {"notice": "스키마 캐시 리로드 필요 (Supabase Settings → API)"}
        else:
            result["agents"]["growth"] = {"error": "조회 실패"}

    # Feature KB
    try:
        resp = client.schema("agent_work").table("maeyo_feature_docs") \
            .select("id").eq("program", program).execute()
        result["agents"]["feature_kb"] = {"total_docs": len(resp.data or [])}
    except Exception:
        result["agents"]["feature_kb"] = {"error": "조회 실패"}

    return result
