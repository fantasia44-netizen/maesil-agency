"""
conv_summarizer — 대화 자동 요약 파티션 서비스

동작:
  1. 대화의 is_archived=False normal 메시지가 _PARTITION_THRESHOLD(20)를 넘으면 트리거
  2. 가장 오래된 _ARCHIVE_BATCH(16)개 메시지를 Claude Haiku로 요약
  3. 요약 텍스트를 summary 타입 메시지로 저장 (파티션 마커)
  4. 요약된 16개 메시지를 is_archived=True로 표시
  5. 이후 get_messages()는 summary + 최근 4개만 반환 → 토큰 절약

호출 위치: chat.py _save_results() 이후 BackgroundTasks
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# 파티션 임계치 — 이 수를 넘는 active normal 메시지가 쌓이면 요약 생성
_PARTITION_THRESHOLD: int = 20
# 한 번에 요약/archived 처리할 오래된 메시지 수
_ARCHIVE_BATCH: int = 16

_SUMMARY_SYSTEM = """\
당신은 대화 요약 전문가입니다.
아래 대화 내역을 한국어 bullet point로 압축 요약하세요.
- 에이전트 이름, 핵심 질문, 핵심 답변/분석 결과, 중요 수치만 포함
- 최대 10줄, 각 줄 60자 이내
- 마크다운 헤더(#) 사용 금지
- 요약 외 다른 텍스트 금지"""


def _format_for_summary(messages: list[dict]) -> str:
    """메시지 목록을 요약 입력용 텍스트로 변환."""
    lines = []
    for m in messages:
        role = m.get("role", "user")
        content = str(m.get("content") or "").strip()[:300]  # 너무 긴 메시지는 잘라냄
        if role == "user":
            lines.append(f"[사용자] {content}")
        else:
            agent = m.get("agent_display") or m.get("agent_type") or "에이전트"
            lines.append(f"[{agent}] {content}")
    return "\n".join(lines)


def _call_haiku_summary(text: str) -> str | None:
    """Claude Haiku로 대화 요약 생성."""
    try:
        import os
        from app.services.secrets import get_secret
        api_key = os.environ.get("ANTHROPIC_API_KEY") or get_secret("anthropic_api_key") or ""
        if not api_key:
            return None

        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SUMMARY_SYSTEM,
            messages=[{"role": "user", "content": text}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        logger.warning("[conv_summarizer] Haiku 요약 실패: %s", e)
        return None


def maybe_summarize(conversation_id: str) -> bool:
    """active normal 메시지 수가 임계치 이상이면 요약 파티션을 생성한다.

    Returns:
        True  — 요약 파티션이 새로 생성됨
        False — 임계치 미달이거나 요약 실패
    """
    try:
        from app.services.conversations import (
            count_active_messages,
            archive_messages,
            save_summary_partition,
        )
        from app.db.maesil_total_client import get_maesil_total_client

        count = count_active_messages(conversation_id)
        if count < _PARTITION_THRESHOLD:
            return False

        # 가장 오래된 _ARCHIVE_BATCH개 normal 메시지 조회
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("conversation_messages")
            .select("id, role, agent_type, agent_display, content")
            .eq("conversation_id", conversation_id)
            .eq("message_type", "normal")
            .eq("is_archived", False)
            .order("created_at")
            .limit(_ARCHIVE_BATCH)
            .execute()
        )
        batch = resp.data or []
        if not batch:
            return False

        # Haiku 요약 생성
        raw_text = _format_for_summary(batch)
        summary = _call_haiku_summary(raw_text)
        if not summary:
            logger.warning("[conv_summarizer] 요약 생성 실패 conv=%s", conversation_id)
            return False

        # 요약 헤더 포함 저장
        partition_count = _count_existing_summaries(conversation_id) + 1
        summary_text = f"📋 이전 대화 요약 (파티션 #{partition_count}, {len(batch)}턴 압축)\n{summary}"

        save_summary_partition(conversation_id, summary_text)
        archive_messages([m["id"] for m in batch])

        logger.info(
            "[conv_summarizer] 파티션 생성 conv=%s batch=%d partition=%d",
            conversation_id, len(batch), partition_count,
        )
        return True

    except Exception as e:
        logger.warning("[conv_summarizer] maybe_summarize 실패 conv=%s: %s", conversation_id, e)
        return False


def _count_existing_summaries(conversation_id: str) -> int:
    """기존 summary 파티션 수 반환 (파티션 번호 산정용)."""
    try:
        from app.db.maesil_total_client import get_maesil_total_client
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("conversation_messages")
            .select("id", count="exact")
            .eq("conversation_id", conversation_id)
            .eq("message_type", "summary")
            .execute()
        )
        return resp.count or 0
    except Exception:
        return 0


__all__ = ["maybe_summarize", "_PARTITION_THRESHOLD", "_ARCHIVE_BATCH"]
