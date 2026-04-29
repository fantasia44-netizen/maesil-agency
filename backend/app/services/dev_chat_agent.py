"""
dev_chat_agent — 대화형 개발 에이전트.

흐름:
  1. 유저 메시지 수신 (에러 설명 or 수정 요청)
  2. 프로그램 레지스트리에서 github_repo 조회
  3. 스택트레이스에서 파일 경로 추출 → 코드 읽기
  4. Claude로 원인 분석 + 수정 코드 생성
  5. 수정안 제시 (diff + 설명)
  6. pending_actions 에 저장 → 승인 대기
  7. 유저 '승인' → PR 생성 + 링크 반환

승인 키워드: 승인, 실행, 확인, ok, yes, ㅇㅋ, 적용
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db.maesil_total_client import get_maesil_total_client
from app.services import github_client

logger = logging.getLogger(__name__)

APPROVE_KEYWORDS = {"승인", "실행", "확인", "ok", "yes", "ㅇㅋ", "적용", "해줘", "실행해", "고쳐줘"}

# 메모리 내 pending actions (프로세스 수명 동안 유지)
# { conversation_id: { action_id, repo, branch, path, new_content, sha, pr_title, pr_body, commit_msg } }
_pending: dict[str, dict[str, Any]] = {}
# 최근 생성된 PR — 같은 대화에서 '머지' 명령으로 바로 머지 가능
# { conversation_id: {repo, pr_number, pr_url, pr_title, created_at} }
_recent_pr: dict[str, dict[str, Any]] = {}


# ─────────────────────────────────────────────────────────────────
# helpers
# ─────────────────────────────────────────────────────────────────

def _get_program(name: str) -> dict | None:
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("program_registry")
        .select("name, display_name, github_repo, host_provider")
        .eq("name", name)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0] if rows else None


def _all_programs() -> list[dict]:
    resp = (
        get_maesil_total_client()
        .schema("agent_work")
        .table("program_registry")
        .select("name, display_name, github_repo")
        .eq("is_active", True)
        .execute()
    )
    return resp.data or []


def _extract_error_function(text: str) -> str | None:
    """로그 메시지에서 실패한 클래스/함수명 추출.
    예: '[AgencyLog] start 예외' → 'AgencyLog.start'
    예: 'AgencyLog.start failed' → 'AgencyLog.start'
    """
    # [ClassName] method 예외 패턴 (가장 흔한 패턴)
    m = re.search(r'\[([A-Z][a-zA-Z0-9_]+)\]\s+(\w+)\s+예외', text)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    # ClassName.method_name 패턴
    m = re.search(r'\b([A-Z][a-zA-Z0-9]+)\.([a-z_]\w+)\b', text)
    if m and m.group(1) not in {"File", "GET", "POST", "PUT", "DELETE", "HTTP"}:
        return f"{m.group(1)}.{m.group(2)}"
    return None


# 코드 컨텍스트 크기 정책
# Claude Sonnet 4.6 context = 200k tokens (~600k chars). 충분히 여유 있음.
# - 작은/중간 파일은 전체 (~30k자) → 함수 호출 그래프·imports 모두 포함
# - 큰 파일은 메서드를 포함한 클래스 전체 추출 → 그래도 한도 초과면 앞부분 잘라서 송신
_FULL_FILE_THRESHOLD = 30_000   # 이 이하면 전체 파일 송신
_MAX_SECTION_CHARS  = 50_000   # 추출 섹션의 절대 상한


def _find_enclosing_class_block(lines: list[str], method_line_idx: int) -> tuple[int, int] | None:
    """method 라인 위쪽으로 올라가며 'class X:' 라인 찾고, 다음 class/def(0-indent)까지 범위 반환."""
    # 메서드의 들여쓰기 깊이 — 클래스 안의 메서드면 보통 4
    method_line = lines[method_line_idx]
    method_indent = len(method_line) - len(method_line.lstrip())

    if method_indent == 0:
        return None  # top-level 함수 — 클래스 없음

    # 위로 올라가며 같은/낮은 들여쓰기의 'class ' 찾기
    class_idx = None
    for i in range(method_line_idx - 1, -1, -1):
        line = lines[i]
        stripped = line.lstrip()
        if not stripped or stripped.startswith("#"):
            continue
        line_indent = len(line) - len(stripped)
        if stripped.startswith("class ") and line_indent < method_indent:
            class_idx = i
            break

    if class_idx is None:
        return None

    # 클래스 끝 — 같거나 낮은 들여쓰기의 다음 'class '/'def ' (0-indent 기준)
    cls_indent = len(lines[class_idx]) - len(lines[class_idx].lstrip())
    end_idx = len(lines)
    for j in range(class_idx + 1, len(lines)):
        line = lines[j]
        stripped = line.lstrip()
        if not stripped or stripped.startswith("#"):
            continue
        line_indent = len(line) - len(stripped)
        if line_indent <= cls_indent and (stripped.startswith("class ") or stripped.startswith("def ")):
            end_idx = j
            break
    return (class_idx, end_idx)


def _extract_relevant_section(content: str, target_symbol: str) -> str:
    """파일에서 target_symbol 분석에 필요한 섹션 추출.

    정책:
      - 30k자 이하: 파일 전체 (호출 그래프·imports 모두 포함)
      - 30k자 초과: imports + 메서드를 포함한 클래스 전체 (없으면 메서드 함수)
      - 50k자 초과: 위 추출분 50k 절단
      - 못 찾으면 앞 50k자
    """
    if len(content) <= _FULL_FILE_THRESHOLD:
        return content  # 전체 송신 — 가장 정확

    parts = target_symbol.split(".")
    class_part = parts[0] if parts else ""
    method_part = parts[1] if len(parts) > 1 else ""
    lines = content.split("\n")

    # 큰 파일에서는 imports 머리를 같이 보내야 분석이 정확함
    # 처음 ~60줄 (typical import block) 추출
    header_end = 0
    for i, line in enumerate(lines[:120]):
        stripped = line.lstrip()
        if (stripped.startswith("import ") or stripped.startswith("from ")
                or stripped.startswith("#") or not stripped
                or stripped.startswith('"""') or stripped.startswith("'''")
                or stripped.startswith(")")):
            header_end = i + 1
        elif stripped.startswith("class ") or stripped.startswith("def "):
            break
    header = "\n".join(lines[:header_end])

    # 1) 'class <ClassPart>:' 정의가 있으면 그 전체 클래스
    if class_part:
        for i, line in enumerate(lines):
            stripped = line.lstrip()
            if (stripped.startswith(f"class {class_part}")
                    or stripped.startswith(f"class {class_part}(")
                    or stripped.startswith(f"class {class_part}:")):
                # 다음 0-indent class/def 까지
                end_idx = len(lines)
                for j in range(i + 1, len(lines)):
                    s2 = lines[j].lstrip()
                    if not s2 or s2.startswith("#"):
                        continue
                    l_indent = len(lines[j]) - len(s2)
                    if l_indent == 0 and (s2.startswith("class ") or s2.startswith("def ")):
                        end_idx = j
                        break
                section = "\n".join(lines[i:end_idx])
                merged = header + "\n\n# ─── 관련 클래스 ───\n" + section
                return merged[:_MAX_SECTION_CHARS]

    # 2) 'def <MethodPart>(' — 그 메서드를 둘러싼 클래스 전체
    if method_part:
        for i, line in enumerate(lines):
            if re.search(r"\bdef\s+" + re.escape(method_part) + r"\s*\(", line):
                rng = _find_enclosing_class_block(lines, i)
                if rng:
                    section = "\n".join(lines[rng[0]:rng[1]])
                    merged = header + "\n\n# ─── 관련 클래스 ───\n" + section
                    return merged[:_MAX_SECTION_CHARS]
                # top-level 함수
                end_idx = min(len(lines), i + 300)
                section = "\n".join(lines[max(0, i - 2):end_idx])
                merged = header + "\n\n# ─── 관련 함수 ───\n" + section
                return merged[:_MAX_SECTION_CHARS]

    # 3) 못 찾음 → 앞 50k자
    return content[:_MAX_SECTION_CHARS]


def _save_github_repo_to_db(program_name: str, github_repo: str) -> None:
    """자동 탐지된 github_repo를 DB에 저장 (이후 재탐지 불필요)."""
    try:
        get_maesil_total_client() \
            .schema("agent_work") \
            .table("program_registry") \
            .update({"github_repo": github_repo}) \
            .eq("name", program_name) \
            .execute()
        logger.info("github_repo DB 저장: %s → %s", program_name, github_repo)
    except Exception as e:
        logger.warning("github_repo DB 저장 실패 [%s]: %s", program_name, e)


def _extract_file_paths(text: str) -> list[str]:
    """스택트레이스/로그 및 유저 메시지에서 파일 경로 패턴 추출.

    지원 형식:
    - Python traceback: File "..."
    - 직접 경로: app/foo/bar.py
    - JSON 로그: "module": "..."
    - Python logger 점 표기: services.naver_ad.repository (→ services/naver_ad/repository.py)
    """
    patterns = [
        r'File "([^"]+\.py)"',                          # Python traceback
        r'at ([^\s]+\.py):',                             # 일반
        r'`([a-zA-Z_][a-zA-Z0-9_/]+\.py)`',            # 백틱
        r'([a-zA-Z_][a-zA-Z0-9_/]+\.py)',               # 단순 .py
        r'([a-zA-Z_/]+\.(ts|tsx|js|jsx))',              # JS/TS
        r'"module":\s*"([a-zA-Z_][a-zA-Z0-9_/.]+)"',   # JSON 로그
        r'module["\s:=]+([a-zA-Z_][a-zA-Z0-9_/.]+)',   # module=xxx
        # Python logger 점 표기: 'services.naver_ad.repository:' or 'app.foo.bar -'
        r'(?:^|[\s\[])([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]+){1,5})(?=\s*[:\-])',
    ]
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.MULTILINE):
            p = m.group(1)
            # /opt/render/project/src/ 같은 prefix 제거
            p = re.sub(r'^.*?/src/', '', p)
            p = re.sub(r'^.*?/project/', '', p)

            # Python 점 표기(파일 확장자 없음, 점 포함) → 슬래시 변환
            if '.py' not in p and '.' in p and '/' not in p:
                slashed = p.replace('.', '/') + '.py'
                # 점 표기는 패키지 루트가 app/ 또는 src/ 일 수도 있으므로 후보 다양화
                dot_candidates = [
                    slashed,
                    f"app/{slashed}",
                    f"src/{slashed}",
                    f"backend/{slashed}",
                    f"backend/app/{slashed}",
                ]
                for c in dot_candidates:
                    if c not in found:
                        found.append(c)
                continue

            # 모듈명 → 파일 경로 후보 생성
            base = p.replace('.py', '').replace('.ts', '').replace('.tsx', '').replace('.js', '')
            candidates = [p] if '.' in p or '/' in p else [
                f"{base}.py",
                f"app/{base}.py",
                f"src/{base}.py",
                f"app/services/{base}.py",
                f"app/routers/{base}.py",
                f"app/models/{base}.py",
                f"app/db/{base}.py",
                f"app/repositories/{base}.py",
                f"db/{base}.py",
                f"models/{base}.py",
                f"repositories/{base}.py",
                f"core/{base}.py",
                f"infrastructure/{base}.py",
            ]
            for c in candidates:
                if c not in found:
                    found.append(c)
    return found[:12]  # 최대 12개 (점 표기 후보 포함)


def _detect_program_from_text(text: str, programs: list[dict]) -> dict | None:
    """메시지에서 프로그램 이름 감지.

    중요: 'maesil' 같은 짧은 이름이 'maesil-insight' 같은 긴 이름의 prefix가
    되는 경우가 있으므로:
      1) 이름 길이 내림차순 — 가장 구체적인 매칭부터
      2) 단어 경계 검사 — 'maesil' 이 'maesil-insight' 의 prefix로 잘못 잡히지 않게
         (단어 경계 = 알파벳·숫자가 아닌 문자 또는 문자열 끝)
    """
    text_lower = text.lower()

    def _word_boundary_contains(needle: str, haystack: str) -> bool:
        if not needle or needle not in haystack:
            return False
        # \b 는 일부 케이스에서 hyphen 처리가 미묘 — 직접 체크
        idx = 0
        nlen = len(needle)
        while True:
            i = haystack.find(needle, idx)
            if i < 0:
                return False
            left = haystack[i - 1] if i > 0 else ""
            right = haystack[i + nlen] if i + nlen < len(haystack) else ""
            # 좌우가 단어 문자(알파벳/숫자/_) 가 아니면 단어 경계로 인정
            # ('-' 도 경계로 인정 → 'maesil-insight' 의 'maesil' 은 매칭 거부)
            def _is_word_char(c: str) -> bool:
                return c.isalnum() or c == '_'
            if not _is_word_char(left) and not _is_word_char(right):
                return True
            idx = i + 1

    # 길이 내림차순 — 'maesil-sync-worker-1' 이 'maesil' 보다 먼저 검사됨
    sorted_programs = sorted(
        programs,
        key=lambda p: max(len(p["name"]), len(p.get("display_name") or "")),
        reverse=True,
    )

    for p in sorted_programs:
        name = p["name"].lower()
        display = (p.get("display_name") or "").lower()
        if _word_boundary_contains(name, text_lower):
            return p
        if display and _word_boundary_contains(display, text_lower):
            return p
    return None


def _call_claude(system: str, user: str, max_tokens: int = 2000) -> str:
    from app.services.secrets import get_secret
    import anthropic

    api_key = get_secret("anthropic_api_key")
    if not api_key:
        raise RuntimeError("anthropic_api_key 미설정")

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text.strip()


# ─────────────────────────────────────────────────────────────────
# 핵심 분석 + 수정안 생성
# ─────────────────────────────────────────────────────────────────

def analyze_and_propose(
    user_message: str,
    conversation_id: str,
    context_messages: list[dict] | None = None,
) -> str:
    """분석 + 수정안 제시. pending action 저장. 응답 텍스트 반환."""

    programs = _all_programs()
    program = _detect_program_from_text(user_message, programs)

    # 현재 메시지에서 못 찾으면 대화 컨텍스트에서 프로그램 탐지
    if not program and context_messages:
        for m in reversed(context_messages[-10:]):
            program = _detect_program_from_text(m.get("content", ""), programs)
            if program:
                break

    # 에러 메시지에서 실패 함수/클래스 추출 (AgencyLog.start 등)
    # 현재 메시지 + 대화 컨텍스트 전체에서 탐색
    full_text = user_message
    if context_messages:
        full_text += " ".join(m.get("content", "") for m in context_messages[-4:])
    failing_symbol = _extract_error_function(full_text)

    # 코드 컨텍스트 수집
    code_context = ""
    file_info: dict | None = None

    # github_repo가 없으면 PAT으로 레포 자동 탐지 → 성공 시 DB에 저장
    if program and not program.get("github_repo"):
        detected = github_client.find_repo_by_name(program["name"])
        if detected:
            logger.info("레포 자동 탐지 성공: %s → %s", program["name"], detected)
            program = {**program, "github_repo": detected}
            _save_github_repo_to_db(program["name"], detected)
        else:
            code_context = (
                f"\n\n⚠️ **GitHub 레포 자동 탐지 실패** ({program['name']})\n"
                "Settings → 연결 프로그램에서 GitHub 레포를 직접 등록하세요."
            )

    if program and program.get("github_repo"):
        repo = program["github_repo"]
        try:
            branch = github_client.get_default_branch(repo)
            # 파일 경로: 현재 메시지 + 컨텍스트 전체에서 추출 (이전 메시지에 모듈 정보가 있을 수 있음)
            file_paths = _extract_file_paths(full_text)
            if failing_symbol:
                cls_name = failing_symbol.split(".")[0].lower()
                # 클래스명으로 파일 검색 (AgencyLog → agency_log.py 등 스네이크케이스도 시도)
                snake = re.sub(r'(?<!^)(?=[A-Z])', '_', failing_symbol.split(".")[0]).lower()
                for extra in [f"{cls_name}.py", f"{snake}.py"]:
                    if extra not in file_paths:
                        file_paths.append(extra)

            # 1차: 추출된 경로 후보로 직접 시도
            # IMPORTANT: failing_symbol 이 있으면 그 심볼의 **정의(class/def)** 가
            # 실제로 파일에 있어야 채택. 단순 언급(로그 태그/문자열 리터럴)은 거부.
            # 정의 없는 경우 skip → 3차 DB 미러가 basename 힌트로 정확히 찾음.
            cls_check = failing_symbol.split(".")[0] if failing_symbol else ""
            cls_def_pat = re.compile(
                r'(?:class|def)\s+' + re.escape(cls_check) + r'\b'
            ) if cls_check else None
            for fp in file_paths:
                try:
                    f = github_client.get_file(repo, fp, branch)
                    content = f["content"]
                    # 심볼 정의 검증 — 단순 substring 매칭은 로그 문자열 등에서 오탐
                    if cls_def_pat and not cls_def_pat.search(content):
                        logger.info("1차 후보 %s — '%s' 정의 없음, skip", fp, cls_check)
                        continue
                    snippet = (
                        _extract_relevant_section(content, failing_symbol)
                        if failing_symbol else content[:3000]
                    )
                    code_context += f"\n\n### {fp}\n```\n{snippet}\n```"
                    file_info = {"repo": repo, "path": fp, "sha": f["sha"], "branch": branch,
                                 "original": content}
                    logger.info("1차 hit: %s (%s 정의 발견)", fp, cls_check or "no-symbol")
                    break
                except FileNotFoundError:
                    continue
                except Exception as e:
                    logger.warning("파일 읽기 실패 %s/%s: %s", repo, fp, e)

            # 2차 폴백: GitHub code search (대괄호 없는 안정적 쿼리)
            if not file_info:
                code_search_queries = []
                if failing_symbol:
                    cls_name_orig = failing_symbol.split(".")[0]
                    # 괄호 없이 클래스명 단독 검색 (대괄호는 GitHub search 특수문자)
                    code_search_queries += [
                        f"class {cls_name_orig}",          # class AgencyLog
                        cls_name_orig,                     # AgencyLog (단독)
                    ]
                # 모듈명으로도 검색
                for fp in file_paths[:2]:
                    base = fp.split("/")[-1].replace(".py", "")
                    if base not in code_search_queries:
                        code_search_queries.append(base)

                logger.warning("1차 경로 실패 → code search: %s (repo=%s)", code_search_queries[:2], repo)
                for query in code_search_queries:
                    try:
                        found_paths = github_client.search_code_in_repo(repo, query)
                    except Exception as e:
                        logger.warning("code search 예외 [%s]: %s", query, e)
                        found_paths = []
                    for candidate in found_paths[:3]:
                        try:
                            f = github_client.get_file(repo, candidate, branch)
                            content = f["content"]
                            # 2차도 정의 기반 검증 (1차와 동일 정책)
                            if cls_def_pat and not cls_def_pat.search(content):
                                logger.info("2차 후보 %s — '%s' 정의 없음, skip",
                                            candidate, cls_check)
                                continue
                            snippet = (
                                _extract_relevant_section(content, failing_symbol)
                                if failing_symbol else content[:3000]
                            )
                            code_context += f"\n\n### {candidate}\n```\n{snippet}\n```"
                            file_info = {"repo": repo, "path": candidate, "sha": f["sha"],
                                         "branch": branch, "original": content}
                            logger.warning("code search 파일 발견: %s", candidate)
                            break
                        except Exception:
                            continue
                    if file_info:
                        break

            # 3차 폴백: DB 미러(repo_mirror)에서 심볼 검색 — 1~5ms, GitHub 호출 0
            if not file_info and failing_symbol:
                import time as _time
                from app.services import repo_mirror

                cls_orig = failing_symbol.split(".")[0]
                # 추출된 file_paths의 basename을 우선순위 힌트로 전달
                hint_basenames = list({
                    p.rsplit("/", 1)[-1]
                    for p in (file_paths or []) if p.endswith(".py")
                })

                _t0 = _time.monotonic()
                hit = repo_mirror.search_symbol(repo, cls_orig, hint_basenames)
                elapsed = _time.monotonic() - _t0

                if hit:
                    path = hit["path"]
                    content = hit["content"]
                    # 미러에 저장된 sha는 commit sha. 커밋용 blob sha는 별도 호출.
                    try:
                        f = github_client.get_file(repo, path, branch)
                        sha = f["sha"]
                    except Exception:
                        sha = ""
                    snippet = _extract_relevant_section(content, failing_symbol)
                    code_context += f"\n\n### {path}\n```\n{snippet}\n```"
                    file_info = {"repo": repo, "path": path, "sha": sha,
                                 "branch": branch, "original": content}
                    logger.warning("3차(DB미러) 파일 발견: %s (score=%s, %.1fms)",
                                   path, hit.get("score"), elapsed * 1000)
                else:
                    logger.warning("3차(DB미러) 파일 미발견 [repo=%s, symbol=%s, hints=%s] %.1fms",
                                   repo, cls_orig, hint_basenames, elapsed * 1000)

            if not file_info:
                tried_dirs = ["app/services", "app", "app/utils", "src", "utils", "core", "logs"]
                code_context = (
                    f"\n\n⚠️ 파일을 찾지 못했습니다 (레포: `{repo}`)\n"
                    f"- 시도한 직접 경로: {file_paths[:4]}\n"
                    f"- code search 쿼리: `class {failing_symbol.split('.')[0] if failing_symbol else '?'}`\n"
                    f"- 탐색한 디렉터리: {tried_dirs}\n"
                    f"- 찾는 심볼: `{failing_symbol}`\n"
                    f"→ 파일명이나 클래스명이 다르거나 레포 구조가 비표준일 수 있습니다."
                )

            # 파일은 찾았으나 실패 심볼 클래스가 없는 경우 → 클래스 정의 파일 추가 탐색
            if file_info and failing_symbol:
                cls_name = failing_symbol.split(".")[0]
                if not re.search(r'(?:class|def)\s+' + re.escape(cls_name) + r'\b',
                                 file_info["original"]):
                    original_path = file_info["path"]
                    logger.warning("%s이 %s에 없음 → 정의 파일 추가 탐색", cls_name, original_path)
                    for search_q in [f"class {cls_name}", f'"[{cls_name}]"']:
                        found_paths = github_client.search_code_in_repo(repo, search_q)
                        for candidate in found_paths[:3]:
                            if candidate == original_path:
                                continue
                            try:
                                f2 = github_client.get_file(repo, candidate, branch)
                                if re.search(r'(?:class|def)\s+' + re.escape(cls_name) + r'\b',
                                             f2["content"]) or f'"[{cls_name}]"' in search_q:
                                    section = _extract_relevant_section(f2["content"], failing_symbol)
                                    code_context += f"\n\n### {candidate} ({cls_name})\n```\n{section}\n```"
                                    file_info = {"repo": repo, "path": candidate,
                                                 "sha": f2["sha"], "branch": branch,
                                                 "original": f2["content"]}
                                    logger.warning("%s 정의 파일: %s", cls_name, candidate)
                                    break
                            except Exception:
                                continue
                        if file_info["path"] != original_path:
                            break

        except Exception as e:
            logger.warning("GitHub 접근 실패 [%s]: %s", repo, e)
            code_context = f"\n\n(GitHub 접근 실패: {e})"
            file_info = None  # 명시적 표시

    # ── DB 스키마 인트로스펙션 ──────────────────────────────
    # 파일을 찾았으면 그 코드에서 참조되는 DB 테이블의 실제 스키마 자동 첨부
    # (LLM 의 거짓 진술 방지 — 진짜 정보만 컨텍스트로)
    if file_info and program:
        try:
            from app.services import db_introspector
            schema_md = db_introspector.introspect_for_program(
                program["name"], file_info["original"]
            )
            if schema_md:
                code_context += "\n\n" + schema_md
                logger.info("DB 스키마 컨텍스트 첨부 [program=%s]: %d chars",
                            program["name"], len(schema_md))
        except Exception as e:
            logger.warning("DB introspector 실패: %s", e)

    # 이전 대화 컨텍스트
    history = ""
    if context_messages:
        for m in context_messages[-6:]:
            role = "유저" if m.get("role") == "user" else "에이전트"
            history += f"\n{role}: {m.get('content', '')[:300]}"

    # Claude 호출
    system_prompt = """당신은 maesil-agency의 개발 에이전트입니다. 시니어 풀스택 개발자 역할을 합니다.

## 기본 지침
- 응답은 항상 한국어로 작성
- 에러/코드 관련 구체적 요청이 있으면 분석 후 수정안 제시
- **메시지가 짧거나 단순 호출(예: "개발팀", "안녕")이면 1~2줄로 간단히 맞이하고 무엇을 도와줄지 물어볼 것. 긴 형식 목록 금지**

## 절대 금지
- ❌ 사용자에게 "파일을 공유해 주세요" / "코드를 올려주세요" / "보여주세요" 요청 금지
- ❌ 깃 레포 접근 권한이 시스템에 등록되어 있고, 백엔드가 알아서 파일을 찾아 제공함
- ❌ 스택트레이스나 추가 정보 요청 금지 — 이미 시스템이 자동으로 추출함

## 심볼 식별 가이드 (중요)
- 에러 로그의 `[XXX] method 예외` 형식에서 `XXX` 는 보통 **로거 태그(prefix)** 임 — 클래스명이 아닐 수 있음
- 예) `services.naver_ad.repository: [SyncLog] start 예외` →
   - 파일: `services/naver_ad/repository.py` (모듈 경로 그대로)
   - 클래스: 그 파일의 메인 클래스 (예: `NaverAdRepository`)
   - 실패 메서드: `start` (또는 `start` 가 호출하는 메서드 체인)
   - `class SyncLog` 는 존재하지 않을 수 있음 — 정상

## 분석 진행 원칙
- 제공된 파일이 **에러 로그의 모듈 경로와 일치** 하면 (예: `services.naver_ad.repository` ↔ `services/naver_ad/repository.py`) → **올바른 파일**. 분석 진행.
- 그 파일에서 `start` 같은 **메서드명을 검색** 해서 어느 클래스/함수에서 정의됐는지 찾고, 그 함수를 분석 대상으로.
- 메서드도 못 찾으면 그때서야 "관련 함수 식별 실패" 답변.
- ❌ "SyncLog 클래스가 없어서 분석 불가" 같이 표면적 판단으로 멈추지 말 것.

## ⚠️ 거짓 진술 금지 — 핵심 규칙
- ❌ "DB 에 접속해보니" / "테이블을 조회해보니" / "쿼리해보니" / "스키마를 확인했더니" 같은 표현 절대 사용 금지
- 너의 도구는 **코드 정독 + 시스템이 자동 첨부한 DB 스키마(있을 때만)** 뿐
- 자동 첨부되는 컨텍스트:
  * `### 파일경로` 헤더로 시작하는 코드 섹션 (이건 봤다고 말해도 됨)
  * `## 🗄️ DB 스키마 컨텍스트` 헤더로 시작하는 information_schema 결과 (이것도 봤다고 가능)
- 이 두 가지에 없는 정보는 **추론 또는 일반론** 으로 명시 — "코드 패턴상..." / "PostgREST 동작 일반론으로는..."

## ⚠️ 수행하지 않은 동작 주장 금지 — 핵심 규칙
너의 실제 동작 권한은 다음과 같다 — **이 외의 동작은 절대 했다고 주장 금지**:

1. **분석 + PROPOSED_FIX 생성** ✅
2. **PR 생성** (사용자가 `승인` 입력 시 execute_pending 트리거) ✅
3. **PR 미리보기 (diff)** ✅
4. **취소 (pending 폐기)** ✅
5. **PR 머지** (사용자가 `머지` 입력 시 merge_pending_pr 트리거 — 같은 대화에서 방금 만든 PR 만 가능) ✅

❌ **할 수 없는 동작 — 주장 금지**:
- 배포 트리거 (Render 가 머지 후 자동으로 처리)
- 서버 재시작
- DB 직접 수정
- 외부 시스템 호출 (HTTP, 메일 등)

응답에 "배포 시작됨", "서버 재시작 했습니다", "GitHub API 로 직접 확인했더니" 같은 문구는 **환각 + 사용자 오도. 금지**.

PR 생성 후 안내 문구는 시스템이 자동으로 "`머지` 입력하면 자동 머지" 추가함 — 너는 사용자에게 "GitHub 에서 직접 머지해주세요" 같이 능력 부정 표현 사용 금지. `머지` 키워드로 처리 가능함을 알릴 것.

## DB 스키마 컨텍스트 부재 처리
- `## 🗄️ DB 스키마 컨텍스트` 섹션이 없으면 → DB 상태에 대해 어떤 단언도 하지 말 것
- ❌ "테이블이 존재하지 않거나 접근 권한 없음" 같이 부재를 부정형으로 단언 금지
- ✅ "DB 스키마 정보가 첨부되지 않아 테이블 상태 확인 불가 — 코드 동작 기반 추론만 진행" 으로 명시
- 정보 부재와 부정 단언은 다름

## PostgREST / Supabase REST 호출 패턴 (자주 발생하는 함정)
코드가 `f'{url}/rest/v1/<table>'` 또는 Supabase 클라이언트로 호출하는 부분을 수정할 때:

1. **SQL 함수를 JSON 문자열로 못 보냄**:
   - ❌ `{'finished_at': 'now()'}` — PostgREST 가 문자열 `"now()"` 그대로 cast 시도 → 깨짐
   - ✅ `{'finished_at': datetime.now(timezone.utc).isoformat()}` — ISO 8601 문자열 → timestamptz cast 성공
   - ✅ DB 측에서 `DEFAULT now()` 또는 트리거로 처리 (이때만 클라이언트가 안 보내도 됨)

2. **컬럼 default · 트리거 모르면 임의 제거 금지**:
   - 클라이언트가 보내던 필드를 제거할 때, DB 가 자동으로 채워주지 않으면 NULL/누락으로 회귀
   - 모르면 "필드 제거" 대신 "올바른 형식으로 변환" 선택

3. **재시도/타임아웃 일관성**:
   - 같은 파일에 `_request_with_retry` 같은 헬퍼가 이미 있고 다른 함수들이 사용 중이면, 새 호출도 동일 헬퍼 경유
   - keep-alive 끊김(`RemoteDisconnected`, `Connection aborted`)은 retry 로 해결

4. **응답 객체 호환**:
   - 헬퍼가 반환하는 객체가 `requests.Response` 호환인지 확인 — 호출 측에서 `resp.ok`, `resp.json()`, `resp.status_code` 같은 접근 패턴 그대로 유지

5. **동일 패턴 다중 발생**:
   - 한 함수에서 발견한 안티패턴은 같은 파일/모듈 내 다른 함수에도 있을 가능성 높음
   - 수정안 만들 때 "다른 함수에도 같은 문제 있는지" 한 번 짚고, PROPOSED_FIX 여러 개 출력 가능

## 코드 수정 제안 시 형식
코드 수정이 필요한 경우, 변경이 필요한 함수/클래스만 출력하세요 (파일 전체 X).
백엔드가 자동으로 원본 파일에서 해당 함수를 찾아 교체합니다.

[PROPOSED_FIX]
파일: <파일경로>
함수명: <교체할 최상위 함수 또는 클래스 이름 (하나만)>
```python
<변경된 함수/클래스 전체 내용>
```
커밋메시지: <fix: 간단한 설명>
PR제목: <간단한 제목>
[/PROPOSED_FIX]"""

    failing_hint = f"\n실패 함수/클래스: `{failing_symbol}` — 이 심볼을 중심으로 분석하세요." if failing_symbol else ""
    read_file_hint = f"\n읽은 파일: `{file_info['path']}`" if file_info else ""

    user_prompt = f"""요청: {user_message}

프로그램: {program['name'] if program else '미특정'}
레포: {program.get('github_repo', '미등록') if program else '미등록'}{read_file_hint}{failing_hint}
{history}
{code_context}

위 정보를 바탕으로 응답해주세요. 구체적인 에러나 수정 요청이 있으면 분석하고, 없으면 짧게 맞이해주세요."""

    # ── 파일 미확인 상태에서 코드 수정 요청 → 차단 ─────────────────────
    # 실패 심볼을 알고 있는데 파일을 못 읽었으면 추측 분석 금지
    if file_info is None and failing_symbol and program and program.get("github_repo"):
        repo_tried = program.get("github_repo", "?")
        # GitHub 접근 에러가 code_context에 있으면 포함
        github_err = ""
        if "(GitHub 접근 실패:" in code_context:
            github_err = f"\n⚠️ **GitHub 오류**: `{code_context.strip()}`\n"
        tried_paths_str = ", ".join(f"`{p}`" for p in (file_paths or [])[:5]) or "`agencylog.py` 등"
        cls_name_s = failing_symbol.split('.')[0]
        return (
            f"🔒 **파일 미확인 — 코드 수정 불가**\n"
            f"{github_err}\n"
            f"레포 `{repo_tried}` 에서 `{failing_symbol}` 관련 파일을 찾지 못했습니다.\n\n"
            f"**시도한 경로 ({len(file_paths or [])}개):** {tried_paths_str}\n"
            f"**code search 쿼리:** `class {cls_name_s}`, `{cls_name_s}`\n"
            f"**전체 tree 재귀 탐색:** 레포 모든 .py 파일에서 클래스명/심볼 매칭 시도\n\n"
            f"**직접 경로를 알려주시면 바로 읽겠습니다:**\n"
            f"- `repository.py 파일 분석해줘`\n"
            f"- `app/repository.py 파일 읽어봐`\n"
            f"- `{cls_name_s}는 어느 파일에 있어? 경로 알려줘` (본인이 직접 입력)"
        )

    try:
        response = _call_claude(system_prompt, user_prompt)
    except Exception as e:
        return f"⚠️ AI 분석 실패: {e}"

    # PROPOSED_FIX 파싱 → pending action 저장
    fix_match = re.search(r'\[PROPOSED_FIX\](.*?)\[/PROPOSED_FIX\]', response, re.DOTALL)
    if fix_match and file_info:
        fix_block = fix_match.group(1).strip()
        code_match = re.search(r'```(?:\w+)?\n(.*?)```', fix_block, re.DOTALL)
        commit_match = re.search(r'커밋메시지:\s*(.+)', fix_block)
        pr_title_match = re.search(r'PR제목:\s*(.+)', fix_block)
        fn_name_match = re.search(r'함수명:\s*`?(\w+)`?', fix_block)

        if code_match:
            patch_code = code_match.group(1)
            commit_msg = commit_match.group(1).strip() if commit_match else "fix: AI 자동 수정"
            pr_title = pr_title_match.group(1).strip() if pr_title_match else commit_msg
            fn_name = fn_name_match.group(1).strip() if fn_name_match else None

            action_id = str(uuid.uuid4())[:8]
            branch_name = f"fix/agency-{action_id}"

            _pending[conversation_id] = {
                "action_id": action_id,
                "repo": file_info["repo"],
                "branch": branch_name,
                "base_branch": file_info["branch"],
                "path": file_info["path"],
                "patch_code": patch_code,
                "original_content": file_info.get("original", ""),
                "fn_name": fn_name,
                "sha": file_info["sha"],
                "commit_msg": commit_msg,
                "pr_title": pr_title,
                "pr_body": f"## AI 자동 수정\n\n{response[:1000]}\n\n---\n*maesil-agency 자동 생성*",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            response += (
                f"\n\n---\n✅ **수정안 준비 완료** (action: `{action_id}`)\n"
                f"📄 수정 파일: `{file_info['path']}` · 함수: `{fn_name or '전체'}`\n"
                f"`미리보기` → 실제 diff 확인 · `승인` → PR 생성 · `취소` → 폐기"
            )

    return response


# ─────────────────────────────────────────────────────────────────
# 승인 처리
# ─────────────────────────────────────────────────────────────────

def _smart_patch(original: str, patch_code: str, fn_name: str | None) -> str:
    """원본 파일에서 fn_name 함수/클래스를 patch_code로 교체.
    fn_name이 없거나 찾지 못하면 patch_code를 그대로 반환 (full-file 모드)."""
    if not original or not fn_name:
        return patch_code

    # def/async def/class 패턴으로 함수 시작 위치 탐색
    start_pat = re.compile(
        r'^([ \t]*)(?:async def |def |class )' + re.escape(fn_name) + r'[\s(:]',
        re.MULTILINE,
    )
    m = start_pat.search(original)
    if not m:
        return patch_code  # 원본에서 못 찾으면 패치 그대로

    fn_indent = m.group(1)
    start = m.start()

    # 같은 들여쓰기 레벨의 다음 def/class/decorator 위치를 함수 끝으로 간주
    end_pat = re.compile(
        r'\n' + re.escape(fn_indent) + r'(?:async def |def |class |@)',
        re.MULTILINE,
    )
    rest = original[start + 1:]  # start 다음부터 검색
    em = end_pat.search(rest)
    end = start + 1 + em.start() + 1 if em else len(original)

    return original[:start] + patch_code.rstrip('\n') + '\n\n\n' + original[end:]


def execute_pending(conversation_id: str) -> str:
    """pending action 실행 → PR 생성."""
    action = _pending.get(conversation_id)
    if not action:
        return "⚠️ 대기 중인 수정안이 없습니다. 먼저 수정 요청을 해주세요."

    repo = action["repo"]
    branch = action["branch"]
    base = action["base_branch"]

    # 패치 코드 → 최종 커밋 내용 결정
    patch_code = action.get("patch_code") or action.get("new_content", "")
    original = action.get("original_content", "")
    fn_name = action.get("fn_name")
    final_content = _smart_patch(original, patch_code, fn_name)

    try:
        # 1) 브랜치 생성
        github_client.create_branch(repo, branch, from_branch=base)

        # 2) 파일 커밋
        github_client.commit_file(
            repo=repo,
            path=action["path"],
            new_content=final_content,
            commit_message=action["commit_msg"],
            branch=branch,
            sha=action["sha"],
        )

        # 3) PR 생성
        pr = github_client.create_pr(
            repo=repo,
            title=action["pr_title"],
            body=action["pr_body"],
            head=branch,
            base=base,
        )

        # 완료 후 삭제 + 머지용 정보 보관
        del _pending[conversation_id]
        _recent_pr[conversation_id] = {
            "repo": repo,
            "pr_number": pr["number"],
            "pr_url": pr["html_url"],
            "pr_title": action["pr_title"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        return (
            f"✅ **PR 생성 완료**\n\n"
            f"**{action['pr_title']}**\n"
            f"🔗 {pr['html_url']}\n\n"
            f"검토 후 `머지` 입력하면 자동으로 머지 + Render 재배포 시작됩니다.\n"
            f"또는 GitHub UI 에서 직접 `Merge pull request` 클릭."
        )

    except Exception as e:
        logger.exception("execute_pending 실패")
        return f"❌ PR 생성 실패: {e}"


def merge_pending_pr(conversation_id: str) -> str:
    """대화에서 가장 최근 생성된 PR 머지. 안전 가드 포함."""
    info = _recent_pr.get(conversation_id)
    if not info:
        return (
            "⚠️ 머지할 PR 이 없습니다. 이 대화에서 PR 을 먼저 생성해주세요.\n"
            "(`승인` 으로 PR 생성 후 → `머지` 입력)"
        )

    repo = info["repo"]
    pr_number = info["pr_number"]

    try:
        result = github_client.merge_pull_request(
            repo=repo,
            pr_number=pr_number,
            method="squash",
            commit_title=info["pr_title"],
        )
        if result.get("merged"):
            # 머지 성공 — 더 이상 머지할 게 없으니 추적 해제
            _recent_pr.pop(conversation_id, None)
            return (
                f"✅ **PR #{pr_number} 머지 완료**\n\n"
                f"🔗 {info['pr_url']}\n"
                f"sha: `{result.get('sha', '?')[:8]}`\n\n"
                f"Render 가 자동으로 재배포를 시작합니다 (~2~3분)."
            )
        return f"⚠️ 머지 응답 이상: {result}"
    except Exception as e:
        logger.warning("merge_pending_pr 실패: %s", e)
        return (
            f"❌ PR #{pr_number} 머지 실패\n\n"
            f"사유: `{str(e)[:300]}`\n\n"
            f"GitHub UI 에서 직접 머지: {info['pr_url']}"
        )


def preview_pending(conversation_id: str) -> str:
    """대기 중인 수정안의 실제 diff를 출력. 커밋 전 검토용."""
    import difflib

    action = _pending.get(conversation_id)
    if not action:
        return "⚠️ 대기 중인 수정안이 없습니다."

    patch_code = action.get("patch_code") or action.get("new_content", "")
    original = action.get("original_content", "")
    fn_name = action.get("fn_name")
    final_content = _smart_patch(original, patch_code, fn_name)

    if not original:
        # 원본 없으면 최종 내용 그대로 표시
        preview = final_content[:4000]
        return (
            f"📄 **수정 파일**: `{action['path']}`\n"
            f"⚠️ 원본 파일 없음 — 전체 내용으로 커밋됩니다\n\n"
            f"```python\n{preview}\n```"
        )

    # unified diff 생성
    diff_lines = list(difflib.unified_diff(
        original.splitlines(keepends=True),
        final_content.splitlines(keepends=True),
        fromfile=f"a/{action['path']}",
        tofile=f"b/{action['path']}",
        lineterm="",
    ))

    if not diff_lines:
        return "⚠️ 변경 사항이 없습니다. 수정안이 원본과 동일합니다."

    diff_text = "".join(diff_lines)
    # 너무 길면 자르기
    if len(diff_text) > 6000:
        diff_text = diff_text[:6000] + "\n... (이하 생략)"

    changed_lines = sum(1 for l in diff_lines if l.startswith("+") or l.startswith("-"))

    return (
        f"📄 **수정 파일**: `{action['path']}`\n"
        f"🔧 **수정 함수**: `{fn_name or '(전체)'}`\n"
        f"📊 변경 라인: {changed_lines}줄\n\n"
        f"```diff\n{diff_text}\n```\n\n"
        f"`승인` → PR 생성 · `취소` → 폐기"
    )


def cancel_pending(conversation_id: str) -> str:
    if conversation_id in _pending:
        del _pending[conversation_id]
        return "🚫 수정안을 취소했습니다."
    return "취소할 대기 중인 수정안이 없습니다."


def is_approve(text: str) -> bool:
    t = text.strip().lower()
    return any(k in t for k in APPROVE_KEYWORDS) and len(t) < 20


def is_preview(text: str) -> bool:
    t = text.strip().lower()
    return any(k in t for k in {"미리보기", "preview", "diff", "확인", "뭐가바뀌어", "뭐바뀌"}) and len(t) < 15


def is_cancel(text: str) -> bool:
    t = text.strip().lower()
    return any(k in t for k in {"취소", "cancel", "no", "아니", "ㄴ"}) and len(t) < 10


def is_merge(text: str) -> bool:
    """짧은 머지 명령 감지 (생성된 PR이 있을 때만 라우터에서 처리)."""
    t = text.strip().lower()
    return any(k in t for k in {"머지", "merge", "머지해", "머지하자", "merge it"}) and len(t) < 20


__all__ = [
    "analyze_and_propose", "execute_pending", "preview_pending",
    "cancel_pending", "merge_pending_pr",
    "is_approve", "is_preview", "is_cancel", "is_merge",
]
