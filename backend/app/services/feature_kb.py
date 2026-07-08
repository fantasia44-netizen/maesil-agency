"""
feature_kb — 매요 CS 기능 지식베이스 (L2.5 레이어)

흐름:
  L2 미매칭 → maeyo_engine이 이 모듈 호출
    1) lookup(): feature_docs 키워드 매칭 → 있으면 즉시 반환 (L2.5)
    2) log_unanswered(): 미처리 큐에 적재
    3) process_queue(): 백그라운드 폴러가 호출 → dev 에이전트 explain_feature
       → feature_docs 저장 → 다음번 lookup에서 활용
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)


def _docs_table():
    return get_maesil_total_client().schema("agent_work").table("maeyo_feature_docs")


def _log_table():
    return get_maesil_total_client().schema("agent_work").table("maeyo_unanswered_log")


def _normalize(text: str) -> str:
    return re.sub(r"[^\w가-힣]", "", text).lower()


# ─────────────────────────────────────────────────────────────────
# L2.5 조회
# ─────────────────────────────────────────────────────────────────
def lookup(message: str, program: str) -> dict | None:
    """feature_docs에서 키워드 매칭. 매칭되면 {answer, emotion} 반환."""
    try:
        resp = _docs_table().select("keywords,answer").eq("program", program).execute()
        norm_msg = _normalize(message)
        for row in (resp.data or []):
            kws = row.get("keywords") or []
            if kws and all(_normalize(str(k)) in norm_msg for k in kws):
                return {"answer": row["answer"], "emotion": "thinking"}
    except Exception as e:
        logger.warning("feature_kb lookup 실패 [%s]: %s", program, e)
    return None


# ─────────────────────────────────────────────────────────────────
# 미답변 큐 적재
# ─────────────────────────────────────────────────────────────────
def log_unanswered(program: str, message: str, l3_response: str,
                   conversation_id: str | None = None) -> None:
    """L3이 응답했지만 feature_docs에 없었던 질문 큐에 추가."""
    try:
        _log_table().insert({
            "program": program,
            "message": message,
            "l3_response": l3_response[:1000],
            "conversation_id": conversation_id,
        }).execute()
    except Exception as e:
        logger.warning("unanswered_log 적재 실패 [%s]: %s", program, e)


# ─────────────────────────────────────────────────────────────────
# 백그라운드: 큐 처리 → dev 에이전트 → feature_docs 저장
# ─────────────────────────────────────────────────────────────────
def process_queue(limit: int = 5) -> dict:
    """미처리 unanswered_log를 dev 에이전트에 보내 feature_docs 생성.
    폴러(poller) 또는 수동 API에서 호출."""
    try:
        rows = (
            _log_table()
            .select("id,program,message,l3_response")
            .is_("processed_at", "null")
            .order("created_at")
            .limit(limit)
            .execute()
            .data or []
        )
    except Exception as e:
        return {"error": str(e), "processed": 0}

    processed = 0
    for row in rows:
        try:
            doc_id = _generate_feature_doc(
                program=row["program"],
                question=row["message"],
                l3_hint=row.get("l3_response", ""),
            )
            _log_table().update({
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "feature_doc_id": doc_id,
            }).eq("id", row["id"]).execute()
            processed += 1
        except Exception as e:
            logger.warning("queue item 처리 실패 [%s]: %s", row["id"], e)

    return {"processed": processed, "total": len(rows)}


def _generate_feature_doc(program: str, question: str, l3_hint: str) -> str | None:
    """dev_chat_agent.explain_feature() 호출 → feature_docs INSERT → id 반환."""
    try:
        from app.services.dev_chat_agent import explain_feature
        result = explain_feature(question, program)
        if not result:
            return None

        doc_id = _docs_table().insert({
            "program": program,
            "keywords": result.get("keywords", []),
            "question_hint": question[:200],
            "answer": result["answer"],
            "code_refs": result.get("code_refs", []),
            "created_by": "dev_agent",
        }).execute().data
        return (doc_id[0]["id"] if doc_id else None)
    except Exception as e:
        logger.warning("feature_doc 생성 실패 [%s/%s]: %s", program, question[:50], e)
        return None


# ─────────────────────────────────────────────────────────────────
# 버그 신호 감지 → alert_events
# ─────────────────────────────────────────────────────────────────
_BUG_SIGNAL = re.compile(
    r"(안\s*돼|안\s*됩|안\s*되네|오류|에러|버그|이상해|이상한데|안\s*나와|안\s*나오|"
    r"안\s*보여|안\s*보이|작동\s*(안|이상)|클릭\s*(안|이상)|눌리지\s*않|표시\s*(안|이상|잘못)|"
    r"로딩\s*(안|무한)|무한\s*로딩|멈춰|튕겨|팅겨|에러\s*나|오류\s*나)",
    re.I,
)


def detect_and_report_bug(
    program: str,
    user_message: str,
    bot_response: str,
    conversation_id: str | None = None,
) -> bool:
    """버그 신호 감지 → alert_events 적재. 감지되면 True."""
    if not _BUG_SIGNAL.search(user_message):
        return False
    try:
        import hashlib
        dedup_src = f"cs-bug:{program}:{user_message[:100]}"
        dedup_key = "cs:" + hashlib.sha256(dedup_src.encode()).hexdigest()[:16]
        row = {
            "program_name": program,
            "severity": "warning",
            "source": "cs-report",
            "title": f"[CS 버그 신호] {user_message[:80]}",
            "message": (
                f"고객 메시지: {user_message}\n\n"
                f"매요 응답: {bot_response[:500]}\n\n"
                f"대화 ID: {conversation_id or '없음'}"
            ),
            "dedup_key": dedup_key,
            "raw": {"conversation_id": conversation_id, "source": "maeyo_cs"},
        }
        tbl = get_maesil_total_client().schema("agent_work").table("alert_events")
        try:
            # upsert + 중복 무시 — dedup 충돌 시 23505가 Postgres 로그에 남지 않도록 (SQL 054 전제)
            resp = tbl.upsert(row, on_conflict="dedup_key", ignore_duplicates=True).execute()
            if not resp.data:
                return False  # 이미 동일 dedup_key alert 존재
        except Exception as e:
            m = str(e).lower()
            if "42p10" not in m and "no unique or exclusion constraint" not in m:
                raise
            # SQL 054 미실행 폴백 — 구방식 insert (23505는 바깥 except가 처리)
            tbl.insert(row).execute()
        logger.info("CS 버그 신호 alert 생성 [%s]: %s", program, user_message[:60])
        return True
    except Exception as e:
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "23505" in msg:
            return False
        logger.warning("CS 버그 alert 생성 실패: %s", e)
        return False


__all__ = ["lookup", "log_unanswered", "process_queue", "detect_and_report_bug"]
