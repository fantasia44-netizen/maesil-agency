"""
dev_agent — Claude를 이용한 에러 로그 분석.

에러 감지 시 자동 호출:
  1. 에러 로그를 Claude(Haiku)에 전달
  2. 원인 추정 / 영향 범위 / 수정 방향 구조화
  3. alert_dispatcher 가 이메일에 섹션으로 포함

Phase 2+: Git 레포 코드 첨부 → 더 정밀한 파일/함수 레벨 분석
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ErrorAnalysis:
    root_cause: str = ""
    impact: str = ""
    fix_suggestion: str = ""
    confidence: str = "low"   # low | medium | high
    ok: bool = False
    error: str | None = None


_SYSTEM = (
    "당신은 웹 서비스 운영 전문 개발자 AI입니다. "
    "에러 로그를 분석해 운영자가 빠르게 대응할 수 있도록 돕습니다. "
    "반드시 JSON만 응답하세요."
)

_USER_TMPL = """\
서비스: {program}
심각도: {severity}
에러 제목: {title}
소스: {source}

에러 로그:
```
{message}
```

아래 JSON 형식으로만 응답하세요:
{{
  "root_cause": "에러 근본 원인 (1~2문장, 한국어)",
  "impact": "서비스 영향 범위 (1문장, 한국어)",
  "fix_suggestion": "수정 방향 — 단계별로 구체적으로 (2~4줄, 한국어)",
  "confidence": "low 또는 medium 또는 high"
}}"""


def analyze_error(
    program_name: str,
    severity: str,
    title: str,
    message: str,
    source: str = "render-logs",
) -> ErrorAnalysis:
    """Claude Haiku로 에러 분석. error/critical 이벤트만 호출 권장."""
    from app.services.secrets import get_secret

    api_key = get_secret("anthropic_api_key")
    if not api_key:
        return ErrorAnalysis(ok=False, error="anthropic_api_key 미설정 (/settings에서 등록)")

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        user_msg = _USER_TMPL.format(
            program=program_name,
            severity=severity,
            title=title[:200],
            source=source,
            message=(message or "")[:3000],
        )

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
        )

        raw = resp.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return ErrorAnalysis(ok=False, error=f"JSON 파싱 실패: {raw[:200]}")

        data = json.loads(match.group())
        return ErrorAnalysis(
            root_cause=data.get("root_cause", ""),
            impact=data.get("impact", ""),
            fix_suggestion=data.get("fix_suggestion", ""),
            confidence=data.get("confidence", "medium"),
            ok=True,
        )

    except Exception as e:
        logger.exception("dev_agent: 분석 중 예외")
        return ErrorAnalysis(ok=False, error=str(e)[:300])


__all__ = ["ErrorAnalysis", "analyze_error"]
