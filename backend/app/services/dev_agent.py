"""
dev_agent — Claude를 이용한 에러 로그 분석.

에러 감지 시 자동 호출:
  1. 에러 로그를 Claude(Haiku)에 전달
  2. 원인 추정 / 영향 범위 / 수정 방향 구조화
  3. alert_dispatcher 가 이메일에 섹션으로 포함

Phase 2+: program_registry → github_repo 조회 → repo_files DB 미러에서
          에러 관련 파일 검색 → Claude 프롬프트에 첨부 → 정밀 분석
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

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
{code_section}
아래 JSON 형식으로만 응답하세요:
{{
  "root_cause": "에러 근본 원인 (1~2문장, 한국어)",
  "impact": "서비스 영향 범위 (1문장, 한국어)",
  "fix_suggestion": "수정 방향 — 단계별로 구체적으로 (2~4줄, 한국어)",
  "confidence": "low 또는 medium 또는 high"
}}"""


# ─────────────────────────────────────────────────────────────────
# repo_mirror 연동: program_name → github_repo → 관련 파일 검색
# ─────────────────────────────────────────────────────────────────

def _get_github_repo(program_name: str) -> str | None:
    """program_registry에서 program_name으로 github_repo 조회."""
    try:
        from app.db.maesil_total_client import get_maesil_total_client
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("program_registry")
            .select("github_repo")
            .eq("name", program_name)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows and rows[0].get("github_repo"):
            return rows[0]["github_repo"]
    except Exception as e:
        logger.warning("dev_agent: program_registry 조회 실패 [%s]: %s", program_name, e)
    return None


def _extract_keywords(title: str, message: str) -> list[str]:
    """에러 제목/메시지에서 심볼·파일명 후보 키워드 추출."""
    text = f"{title} {message}"

    # Python 예외·모듈 패턴: AttributeError, ImportError, ModuleNotFoundError 등
    symbols: list[str] = []

    # 클래스/함수명: CamelCase or snake_case 식별자
    symbols += re.findall(r"\b([A-Z][a-zA-Z0-9]{2,}|[a-z_][a-z0-9_]{3,})\b", text)

    # 파일 경로 패턴: foo/bar.py, bar.py
    symbols += re.findall(r"([\w/]+\.py)", text)

    # 모듈 경로: app.services.foo
    symbols += re.findall(r"((?:\w+\.){1,}\w+)", text)

    # 중복 제거, 너무 짧은 것·일반 단어 제거
    _STOPWORDS = {
        "the", "and", "for", "GET", "POST", "PUT", "DELETE", "HTTP",
        "None", "True", "False", "Error", "Exception", "Warning",
        "self", "cls", "def", "class", "return", "import", "from",
    }
    seen: set[str] = set()
    result: list[str] = []
    for kw in symbols:
        if len(kw) < 4 or kw in _STOPWORDS or kw in seen:
            continue
        seen.add(kw)
        result.append(kw)
        if len(result) >= 8:
            break

    return result


def _fetch_relevant_files(repo: str, keywords: list[str], max_files: int = 3) -> list[dict]:
    """repo_files DB 미러에서 키워드 관련 파일 검색. 최대 max_files개 반환."""
    from app.services import repo_mirror

    found: list[dict] = []
    seen_paths: set[str] = set()

    for kw in keywords:
        if len(found) >= max_files:
            break
        try:
            # 1) 심볼 검색 (RPC find_file_with_symbol)
            result = repo_mirror.search_symbol(repo, kw)
            if result and result.get("path") not in seen_paths:
                seen_paths.add(result["path"])
                found.append(result)
                continue
        except Exception:
            pass

        try:
            # 2) 파일명 직접 조회 (경로에 키워드 포함)
            from app.db.maesil_total_client import get_maesil_total_client
            resp = (
                get_maesil_total_client()
                .schema("agent_work")
                .table("repo_files")
                .select("path, content, sha")
                .eq("repo", repo)
                .ilike("path", f"%{kw}%")
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if rows and rows[0]["path"] not in seen_paths:
                seen_paths.add(rows[0]["path"])
                found.append(rows[0])
        except Exception:
            pass

    return found


def _build_code_section(files: list[dict], max_chars_per_file: int = 1500) -> str:
    """첨부 코드 파일들을 프롬프트 섹션으로 포맷."""
    if not files:
        return ""

    parts = ["\n관련 코드 파일 (DB 미러 기준):"]
    for f in files:
        path = f.get("path", "?")
        content = (f.get("content") or "")[:max_chars_per_file]
        parts.append(f"\n--- {path} ---\n```\n{content}\n```")
    parts.append("")
    return "\n".join(parts)


# ─────────────────────────────────────────────────────────────────
# 메인 분석 함수
# ─────────────────────────────────────────────────────────────────

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

    # ── 코드 컨텍스트 붙이기 ──────────────────────────────────────
    code_section = ""
    try:
        github_repo = _get_github_repo(program_name)
        if github_repo:
            keywords = _extract_keywords(title, message)
            if keywords:
                files = _fetch_relevant_files(github_repo, keywords)
                code_section = _build_code_section(files)
                logger.info(
                    "dev_agent: 코드 컨텍스트 첨부 [%s] repo=%s files=%d keywords=%s",
                    program_name, github_repo, len(files), keywords[:4],
                )
        else:
            logger.info("dev_agent: github_repo 미등록 [%s], 코드 없이 분석", program_name)
    except Exception as e:
        logger.warning("dev_agent: 코드 컨텍스트 수집 실패 [%s]: %s", program_name, e)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        user_msg = _USER_TMPL.format(
            program=program_name,
            severity=severity,
            title=title[:200],
            source=source,
            message=(message or "")[:3000],
            code_section=code_section,
        )

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
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
