"""
CS / 매요 엔드포인트

외부 프로그램용:
  POST /api/cs/chat          — 매요 채팅 (X-CS-Token 인증)
  POST /api/cs/chat/stream   — 매요 스트리밍 채팅 (SSE, X-CS-Token 인증)

관리자용 (JWT 인증):
  GET  /api/cs/conversations             — CS 대화 목록
  GET  /api/cs/conversations/{id}        — 특정 대화 메시지
  POST /api/cs/messages/{id}/feedback    — 좋음/나쁨 평가
  PUT  /api/cs/messages/{id}/correction  — 틀린 답변 수정
  GET  /api/cs/l2-scripts                — L2 대본 목록
  POST /api/cs/l2-scripts                — L2 대본 추가
  PUT  /api/cs/l2-scripts/{id}           — L2 대본 수정
  PATCH /api/cs/l2-scripts/{id}/verify   — 검증 상태 토글
  DELETE /api/cs/l2-scripts/{id}         — L2 대본 비활성화
  POST /api/cs/l2-scripts/import         — JSON 배열 일괄 가져오기
  POST /api/cs/l2-scripts/sync-from-insight — maesil-insight API에서 자동 동기화
  GET  /api/cs/gap-analysis              — L3 질문 목록 (대본 미매칭)
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.db.maesil_total_client import get_maesil_total_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cs", tags=["cs"])

_CS_TOKEN = os.environ.get("MAEYO_INTERNAL_TOKEN", "").strip()
_ALLOW_UNAUTH_CS = os.environ.get("CS_ALLOW_UNAUTH", "").lower() in ("1", "true", "yes")


# ─────────────────────────────────────────────────────────────────
# 토큰 인증 (machine-to-machine)
# ─────────────────────────────────────────────────────────────────
def _verify_cs_token(x_cs_token: str | None = Header(default=None, alias="X-CS-Token"),
                     x_maeyo_token: str | None = Header(default=None, alias="X-Maeyo-Token")) -> None:
    """X-CS-Token 또는 X-Maeyo-Token 헤더로 인증."""
    if not _CS_TOKEN:
        if _ALLOW_UNAUTH_CS:
            return  # 명시적 dev override
        raise HTTPException(
            status_code=503,
            detail="MAEYO_INTERNAL_TOKEN 미설정. 운영 환경에서는 반드시 설정 필요.",
        )
    token = (x_cs_token or x_maeyo_token or "").strip()
    # 타이밍 공격 방어
    import hmac
    if not token or not hmac.compare_digest(token, _CS_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid CS token")


# ─────────────────────────────────────────────────────────────────
# 요청/응답 모델
# ─────────────────────────────────────────────────────────────────
class CSChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    user_context: dict = {}
    operator_id: str = ""
    user_id: str = ""
    program: str = "maesil-insight"
    conversation_id: str | None = None


class CSChatResponse(BaseModel):
    reply: str
    emotion: str
    action: dict | None = None
    hint: str | None = None
    layer: str
    conversation_id: str
    message_id: str


class FeedbackRequest(BaseModel):
    feedback: str   # 'good' | 'bad'


class CorrectionRequest(BaseModel):
    correction: str


class L2ScriptModel(BaseModel):
    id: str | None = None
    program: str = "maesil-insight"
    triggers: list[str] = []
    keywords: list[str] = []
    emotion: str = "thinking"
    message: str
    action: dict | None = None
    hint: str | None = None
    tts_key: str | None = None
    is_active: bool = True
    is_verified: bool = False
    sort_order: int = 0


# ─────────────────────────────────────────────────────────────────
# DB 헬퍼
# ─────────────────────────────────────────────────────────────────
def _db():
    return get_maesil_total_client().schema("agent_work")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_conversation(conversation_id: str | None, program: str,
                          operator_id: str, user_id: str, title: str) -> str:
    """대화 세션 upsert. conversation_id 없으면 새로 생성."""
    now = _now()
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        _db().table("maeyo_conversations").insert({
            "id": conversation_id, "program": program,
            "operator_id": operator_id or None,
            "user_id": user_id or None,
            "title": title[:50] + ("…" if len(title) > 50 else ""),
            "status": "open",
            "created_at": now, "updated_at": now,
        }).execute()
    else:
        _db().table("maeyo_conversations").update({"updated_at": now}) \
            .eq("id", conversation_id).execute()
    return conversation_id


def _save_message(conversation_id: str, role: str, content: str, **meta) -> str:
    """메시지 저장. msg_id 반환."""
    msg_id = str(uuid.uuid4())
    row = {"id": msg_id, "conversation_id": conversation_id, "role": role,
           "content": content, "created_at": _now()}
    row.update({k: v for k, v in meta.items() if v is not None})
    _db().table("maeyo_messages").insert(row).execute()
    return msg_id


# ─────────────────────────────────────────────────────────────────
# POST /api/cs/chat  — 매요 채팅 (외부 프로그램용)
# ─────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=CSChatResponse)
def cs_chat(
    req: CSChatRequest,
    _: None = Depends(_verify_cs_token),
) -> CSChatResponse:
    from app.services.maeyo_engine import process_message

    result = process_message(
        message=req.message,
        history=req.history,
        user_context=req.user_context,
        program=req.program,
        conversation_id=req.conversation_id,
    )

    reply     = result.get("message", "")
    emotion   = result.get("emotion", "thinking")
    action    = result.get("action")
    hint      = result.get("hint")
    layer     = result.get("layer", "l3")
    script_id = result.get("script_id")

    # DB 저장
    try:
        conv_id = _ensure_conversation(
            req.conversation_id, req.program,
            req.operator_id, req.user_id, req.message,
        )
        _save_message(conv_id, "user", req.message)
        msg_id = _save_message(
            conv_id, "assistant", reply,
            emotion=emotion, action=action, hint=hint,
            layer=layer, script_id=script_id,
        )
    except Exception as e:
        logger.warning("[cs_chat] DB 저장 실패 (응답은 계속): %s", e)
        conv_id = req.conversation_id or str(uuid.uuid4())
        msg_id  = str(uuid.uuid4())

    return CSChatResponse(
        reply=reply, emotion=emotion, action=action, hint=hint,
        layer=layer, conversation_id=conv_id, message_id=msg_id,
    )


# ─────────────────────────────────────────────────────────────────
# POST /api/cs/chat/stream  — 스트리밍 (SSE)
# ─────────────────────────────────────────────────────────────────
@router.post("/chat/stream")
def cs_chat_stream(
    req: CSChatRequest,
    _: None = Depends(_verify_cs_token),
) -> StreamingResponse:
    import json as _json
    from app.services.maeyo_engine import (
        _check_out_of_scope, _match_l2,
        _build_system_prompt,
    )

    # L2 먼저 확인
    oos = _check_out_of_scope(req.message, req.program)
    l2  = oos or (lambda s: {
        "emotion": s.get("emotion", "thinking"),
        "message": s.get("message", ""),
        "action":  s.get("action"),
        "hint":    s.get("hint"),
        "layer":   "l2",
        "script_id": s.get("id"),
    } if s else None)(_match_l2(req.message, req.program))

    # DB 세션 준비 (스트림 전에 conversation_id 확보)
    try:
        conv_id = _ensure_conversation(
            req.conversation_id, req.program,
            req.operator_id, req.user_id, req.message,
        )
        _save_message(conv_id, "user", req.message)
    except Exception as e:
        logger.warning("[cs_stream] 사용자 메시지 저장 실패: %s", e)
        conv_id = req.conversation_id or str(uuid.uuid4())

    if l2:
        # L2: 대본 글자별 스트리밍
        msg_text = l2.get("message", "")
        emotion  = l2.get("emotion", "thinking")
        action   = l2.get("action")
        hint     = l2.get("hint")
        script_id = l2.get("script_id")
        try:
            _save_message(conv_id, "assistant", msg_text, emotion=emotion,
                          action=action, hint=hint, layer="l2", script_id=script_id)
        except Exception:
            pass

        def _l2_gen():
            for ch in msg_text:
                yield f"data: {_json.dumps({'token': ch})}\n\n"
            yield f"data: {_json.dumps({'done': True, 'emotion': emotion, 'action': action, 'hint': hint, 'conversation_id': conv_id})}\n\n"

        return StreamingResponse(_l2_gen(), media_type="text/event-stream",
                                  headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # L3: Claude 스트리밍
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        try:
            from app.services.secrets import get_secret
            api_key = get_secret("anthropic_api_key") or ""
        except Exception:
            pass

    system_prompt = _build_system_prompt(req.user_context, req.program)
    messages = list(req.history or [])
    messages.append({"role": "user", "content": req.message})

    def _l3_gen():
        full = []
        final_emotion = "satisfaction"
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=600,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    full.append(text)
                    yield f"data: {_json.dumps({'token': text})}\n\n"
            yield f"data: {_json.dumps({'done': True, 'emotion': final_emotion, 'action': None, 'hint': None, 'conversation_id': conv_id})}\n\n"
        except Exception as e:
            final_emotion = "tired"
            msg = "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
            full = list(msg)
            for ch in msg:
                yield f"data: {_json.dumps({'token': ch})}\n\n"
            yield f"data: {_json.dumps({'done': True, 'emotion': final_emotion, 'action': None, 'hint': None, 'conversation_id': conv_id})}\n\n"
        finally:
            if full:
                try:
                    _save_message(conv_id, "assistant", "".join(full),
                                  emotion=final_emotion, action=None, hint=None, layer="l3")
                except Exception:
                    pass

    return StreamingResponse(_l3_gen(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─────────────────────────────────────────────────────────────────
# 관리자 API (JWT 인증)
# ─────────────────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations(
    program: str | None = None,
    limit: int = 50,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    q = _db().table("maeyo_conversations") \
        .select("id,program,operator_id,title,status,created_at,updated_at") \
        .order("updated_at", desc=True) \
        .limit(limit)
    if program:
        q = q.eq("program", program)
    return q.execute().data or []


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    conv_r = _db().table("maeyo_conversations") \
        .select("*").eq("id", conversation_id).limit(1).execute()
    conv = (conv_r.data or [None])[0]
    if not conv:
        raise HTTPException(404, "대화를 찾을 수 없습니다")
    msgs_r = _db().table("maeyo_messages") \
        .select("id,role,content,emotion,action,hint,layer,script_id,feedback,correction,created_at") \
        .eq("conversation_id", conversation_id) \
        .order("created_at") \
        .execute()
    return {"conversation": conv, "messages": msgs_r.data or []}


@router.post("/messages/{message_id}/feedback")
def message_feedback(
    message_id: str,
    req: FeedbackRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    if req.feedback not in ("good", "bad"):
        raise HTTPException(400, "feedback은 'good' 또는 'bad'")
    _db().table("maeyo_messages") \
        .update({"feedback": req.feedback}) \
        .eq("id", message_id).execute()
    return {"ok": True, "message_id": message_id, "feedback": req.feedback}


@router.put("/messages/{message_id}/correction")
def message_correction(
    message_id: str,
    req: CorrectionRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    _db().table("maeyo_messages").update({
        "correction": req.correction,
        "corrected_by": user.id,
        "corrected_at": _now(),
        "feedback": "bad",  # 수정됐다는 건 기존 답변이 틀렸다는 의미
    }).eq("id", message_id).execute()
    return {"ok": True, "message_id": message_id}


# ─────────────────────────────────────────────────────────────────
# L2 대본 관리
# ─────────────────────────────────────────────────────────────────

@router.get("/l2-scripts")
def list_l2_scripts(
    program: str | None = None,
    user: UserContext = Depends(get_current_user),
) -> list[dict]:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    q = _db().table("maeyo_l2_scripts") \
        .select("*").order("sort_order").order("id")
    if program:
        q = q.in_("program", [program, "common"])
    return q.execute().data or []


@router.post("/l2-scripts")
def create_l2_script(
    script: L2ScriptModel,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    script_id = script.id or f"CUSTOM_{uuid.uuid4().hex[:8].upper()}"
    now = _now()
    row = {
        "id": script_id, "program": script.program,
        "triggers": script.triggers, "keywords": script.keywords,
        "emotion": script.emotion, "message": script.message,
        "action": script.action, "hint": script.hint,
        "tts_key": script.tts_key, "is_active": script.is_active,
        "sort_order": script.sort_order,
        "created_at": now, "updated_at": now,
    }
    _db().table("maeyo_l2_scripts").upsert(row, on_conflict="id").execute()
    from app.services.maeyo_engine import invalidate_l2_cache
    invalidate_l2_cache()
    return {"ok": True, "id": script_id}


@router.put("/l2-scripts/{script_id}")
def update_l2_script(
    script_id: str,
    script: L2ScriptModel,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    _db().table("maeyo_l2_scripts").update({
        "program": script.program, "triggers": script.triggers,
        "keywords": script.keywords, "emotion": script.emotion,
        "message": script.message, "action": script.action,
        "hint": script.hint, "tts_key": script.tts_key,
        "is_active": script.is_active, "is_verified": script.is_verified,
        "sort_order": script.sort_order,
        "updated_at": _now(),
    }).eq("id", script_id).execute()
    from app.services.maeyo_engine import invalidate_l2_cache
    invalidate_l2_cache()
    return {"ok": True}


@router.delete("/l2-scripts/{script_id}")
def delete_l2_script(
    script_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    _db().table("maeyo_l2_scripts").update({
        "is_active": False, "updated_at": _now(),
    }).eq("id", script_id).execute()
    from app.services.maeyo_engine import invalidate_l2_cache
    invalidate_l2_cache()
    return {"ok": True}


@router.post("/l2-scripts/import")
def import_l2_scripts(
    payload: dict,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """maesil-insight l2_scripts.py 의 L2_SCRIPTS 배열을 일괄 가져오기.
    Body: {"scripts": [...], "program": "maesil-insight"}
    """
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    scripts = payload.get("scripts") or []
    program = payload.get("program", "maesil-insight")
    if not scripts:
        raise HTTPException(400, "scripts 배열이 비어 있습니다")

    now = _now()
    rows = []
    for i, s in enumerate(scripts):
        rows.append({
            "id":         s.get("id") or f"IMP_{i:04d}",
            "program":    program,
            "triggers":   s.get("triggers") or [],
            "keywords":   s.get("keywords") or [],
            "emotion":    s.get("emotion", "thinking"),
            "message":    s.get("message", ""),
            "action":     s.get("action"),
            "hint":       s.get("hint"),
            "tts_key":    s.get("tts_key"),
            "is_active":  True,
            "sort_order": i,
            "created_at": now,
            "updated_at": now,
        })

    # 배치 upsert (100개씩)
    imported = 0
    for i in range(0, len(rows), 100):
        chunk = rows[i:i + 100]
        _db().table("maeyo_l2_scripts").upsert(chunk, on_conflict="id").execute()
        imported += len(chunk)

    from app.services.maeyo_engine import invalidate_l2_cache
    invalidate_l2_cache()
    return {"ok": True, "imported": imported}


@router.patch("/l2-scripts/{script_id}/verify")
def verify_l2_script(
    script_id: str,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """is_verified 토글 (정답 확인 ↔ 미검증)."""
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")
    row = _db().table("maeyo_l2_scripts").select("is_verified") \
        .eq("id", script_id).limit(1).execute().data
    if not row:
        raise HTTPException(404, "스크립트를 찾을 수 없습니다")
    new_val = not row[0].get("is_verified", False)
    _db().table("maeyo_l2_scripts").update({
        "is_verified": new_val, "updated_at": _now(),
    }).eq("id", script_id).execute()
    return {"ok": True, "is_verified": new_val}


@router.post("/l2-scripts/sync-from-insight")
def sync_l2_from_insight(
    user: UserContext = Depends(get_current_user),
) -> dict:
    """maesil-insight /api/maeyo/l2-scripts 에서 스크립트를 가져와 upsert.
    Secrets 필요: maesil_insight_url, harness_api_token
    """
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")

    from app.services.secrets import get_secret
    import httpx

    base_url = (get_secret("maesil_insight_url") or "").rstrip("/")
    token    = get_secret("harness_api_token") or ""
    if not base_url:
        raise HTTPException(400, "maesil_insight_url 시크릿이 없습니다 (/settings에서 등록)")
    if not token:
        raise HTTPException(400, "harness_api_token 시크릿이 없습니다 (/settings에서 등록)")

    try:
        resp = httpx.get(
            f"{base_url}/api/v1/maeyo/l2-scripts",
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise HTTPException(502, f"maesil-insight 호출 실패: {e}")

    scripts = data.get("scripts") or []
    if not scripts:
        return {"ok": True, "imported": 0, "note": "스크립트가 없거나 응답이 비어있음"}

    now = _now()
    rows = []
    for i, s in enumerate(scripts):
        rows.append({
            "id":         s.get("id") or f"IMP_{i:04d}",
            "program":    "maesil-insight",
            "triggers":   s.get("triggers") or [],
            "keywords":   s.get("keywords") or [],
            "emotion":    s.get("emotion", "thinking"),
            "message":    s.get("message", ""),
            "action":     s.get("action"),
            "hint":       s.get("hint"),
            "tts_key":    s.get("tts_key"),
            "is_active":  True,
            "sort_order": i,
            "updated_at": now,
        })

    imported = 0
    for i in range(0, len(rows), 100):
        chunk = rows[i:i + 100]
        _db().table("maeyo_l2_scripts").upsert(chunk, on_conflict="id").execute()
        imported += len(chunk)

    from app.services.maeyo_engine import invalidate_l2_cache
    invalidate_l2_cache()
    return {"ok": True, "imported": imported}


@router.get("/gap-analysis")
def gap_analysis(
    program: str = "maesil-insight",
    limit: int = 200,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """L3로 처리된 질문 목록 (L2 대본 미매칭 = 갭).
    대본 없이 AI가 답변한 실제 사용자 질문을 반환.
    """
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")

    # layer는 assistant 메시지에 저장됨 → l3 assistant 메시지의 conversation_id 수집
    l3_convs_r = _db().table("maeyo_messages") \
        .select("conversation_id,created_at") \
        .eq("role", "assistant") \
        .eq("layer", "l3") \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    l3_rows = l3_convs_r.data or []

    conv_ids = list(dict.fromkeys(r["conversation_id"] for r in l3_rows if r.get("conversation_id")))
    if not conv_ids:
        return {"questions": [], "total": 0}

    # 프로그램 필터
    convs = _db().table("maeyo_conversations") \
        .select("id,program") \
        .in_("id", conv_ids[:100]) \
        .execute().data or []
    conv_map = {c["id"]: c["program"] for c in convs}

    if program:
        conv_ids = [cid for cid in conv_ids if conv_map.get(cid) == program]
    if not conv_ids:
        return {"questions": [], "total": 0}

    # 해당 대화의 user 메시지 조회
    user_msgs = _db().table("maeyo_messages") \
        .select("id,content,created_at,conversation_id") \
        .eq("role", "user") \
        .in_("conversation_id", conv_ids[:100]) \
        .order("created_at", desc=True) \
        .execute().data or []

    result = [
        {
            "id":              m["id"],
            "content":         m["content"],
            "created_at":      m["created_at"],
            "conversation_id": m["conversation_id"],
            "program":         conv_map.get(m["conversation_id"], "unknown"),
        }
        for m in user_msgs
    ]
    return {"questions": result, "total": len(result)}


# ─────────────────────────────────────────────────────────────────
# CS → Dev 에스컬레이션 (에이전시 간 실시간 연결)
# ─────────────────────────────────────────────────────────────────

class EscalateRequest(BaseModel):
    program: str
    question: str
    conversation_id: str | None = None


@router.post("/dev-escalate")
def cs_dev_escalate(
    body: EscalateRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    """CS 에이전트가 답할 수 없는 질문을 개발 에이전트에 즉시 전달.

    - maeyo_unanswered_log에 큐 적재 (비동기 폴러 경로)
    - explain_feature를 즉시 호출해 feature_docs 생성 후 반환
    - 성공 시 다음 CS 쿼리에서 L2.5로 즉시 활용 가능
    """
    if not user.is_super_admin:
        raise HTTPException(403, "관리자 전용")

    from app.services.feature_kb import _generate_feature_doc, _log_table
    from app.services.feature_kb import log_unanswered

    # 1) unanswered_log 적재 (비동기 폴러 백업 경로)
    log_unanswered(body.program, body.question, "", body.conversation_id)

    # 2) 즉시 explain_feature 호출 (동기 처리 — 약 2~5초)
    try:
        doc_id = _generate_feature_doc(
            program=body.program,
            question=body.question,
            l3_hint="",
        )
        if doc_id:
            # unanswered_log processed_at 업데이트
            try:
                _log_table().update({
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                    "feature_doc_id": doc_id,
                }).eq("program", body.program).eq("message", body.question[:500]).is_(
                    "processed_at", "null"
                ).execute()
            except Exception:
                pass

            # feature_docs 조회
            doc = (
                get_maesil_total_client()
                .schema("agent_work")
                .table("maeyo_feature_docs")
                .select("keywords, answer, code_refs")
                .eq("id", doc_id)
                .limit(1)
                .execute()
                .data or []
            )
            doc_data = doc[0] if doc else {}
            return {
                "status": "answered",
                "doc_id": doc_id,
                "answer": doc_data.get("answer", ""),
                "keywords": doc_data.get("keywords", []),
                "code_refs": doc_data.get("code_refs", []),
            }
        else:
            return {"status": "queued", "doc_id": None,
                    "message": "즉시 답변 생성 실패 — 큐에 적재됨 (3분 내 처리)"}
    except Exception as e:
        logger.warning("cs_dev_escalate explain_feature 실패: %s", e)
        return {"status": "queued", "doc_id": None,
                "message": f"에러로 큐 적재 완료 — {str(e)[:100]}"}
