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


def _extract_relevant_section(content: str, target_symbol: str, window_lines: int = 120) -> str:
    """파일에서 target_symbol(클래스/함수)이 정의된 섹션을 추출.
    못 찾으면 앞 3000자 반환."""
    class_name = target_symbol.split(".")[0]
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if re.search(r"(?:class|def)\s+" + re.escape(class_name) + r"\b", line):
            end = min(len(lines), i + window_lines)
            return "\n".join(lines[i:end])
    return content[:3000]


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
    """스택트레이스/로그에서 파일 경로 패턴 추출."""
    patterns = [
        r'File "([^"]+\.py)"',                      # Python traceback
        r'at ([^\s]+\.py):',                         # 일반
        r'([a-zA-Z_][a-zA-Z0-9_/]+\.py)',           # 단순 .py 경로
        r'([a-zA-Z_/]+\.(ts|tsx|js|jsx))',          # JS/TS
        r'"module":\s*"([a-zA-Z_][a-zA-Z0-9_/]+)"', # JSON 로그: "module": "repository"
        r'module["\s:=]+([a-zA-Z_][a-zA-Z0-9_/]+)', # module=xxx
    ]
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text):
            p = m.group(1)
            # /opt/render/project/src/ 같은 prefix 제거
            p = re.sub(r'^.*?/src/', '', p)
            p = re.sub(r'^.*?/project/', '', p)
            # 모듈명 → 파일 경로 후보 생성
            base = p.replace('.py', '').replace('.ts', '').replace('.tsx', '').replace('.js', '')
            candidates = [p] if '.' in p or '/' in p else [
                f"{base}.py",
                f"app/{base}.py",
                f"src/{base}.py",
                f"app/services/{base}.py",
                f"app/routers/{base}.py",
            ]
            for c in candidates:
                if c not in found:
                    found.append(c)
    return found[:8]  # 최대 8개 (후보 포함)


def _detect_program_from_text(text: str, programs: list[dict]) -> dict | None:
    """메시지에서 프로그램 이름 감지."""
    text_lower = text.lower()
    for p in programs:
        name = p["name"].lower()
        display = (p.get("display_name") or "").lower()
        if name in text_lower or (display and display in text_lower):
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
            # 실패 심볼이 있으면 해당 클래스명도 파일 경로 후보로 추가
            file_paths = _extract_file_paths(user_message)
            if failing_symbol:
                cls_name = failing_symbol.split(".")[0].lower()
                # 클래스명으로 파일 검색 (AgencyLog → agency_log.py 등 스네이크케이스도 시도)
                snake = re.sub(r'(?<!^)(?=[A-Z])', '_', failing_symbol.split(".")[0]).lower()
                for extra in [f"{cls_name}.py", f"{snake}.py"]:
                    if extra not in file_paths:
                        file_paths.append(extra)

            # 1차: 추출된 경로 후보로 직접 시도
            for fp in file_paths:
                try:
                    f = github_client.get_file(repo, fp, branch)
                    # 실패 심볼이 있으면 해당 섹션만 추출, 없으면 앞 3000자
                    snippet = (
                        _extract_relevant_section(f["content"], failing_symbol)
                        if failing_symbol else f["content"][:3000]
                    )
                    code_context += f"\n\n### {fp}\n```\n{snippet}\n```"
                    file_info = {"repo": repo, "path": fp, "sha": f["sha"], "branch": branch,
                                 "original": f["content"]}
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
                            snippet = (
                                _extract_relevant_section(f["content"], failing_symbol)
                                if failing_symbol else f["content"][:3000]
                            )
                            code_context += f"\n\n### {candidate}\n```\n{snippet}\n```"
                            file_info = {"repo": repo, "path": candidate, "sha": f["sha"],
                                         "branch": branch, "original": f["content"]}
                            logger.warning("code search 파일 발견: %s", candidate)
                            break
                        except Exception:
                            continue
                    if file_info:
                        break

            # 3차 폴백: 디렉터리 직접 탐색 (code search 인덱싱/rate-limit 실패 대비)
            if not file_info and failing_symbol:
                cls_lower = failing_symbol.split(".")[0].lower()
                snake = re.sub(r'(?<!^)(?=[A-Z])', '_', failing_symbol.split(".")[0]).lower()
                search_dirs = [
                    "app/services", "app", "app/utils", "app/models", "app/core",
                    "src/services", "src", "utils", "core", "logs", "",
                ]
                logger.warning("3차 디렉터리 탐색 시작: %s / %s (repo=%s)", cls_lower, snake, repo)
                for dir_path in search_dirs:
                    try:
                        dir_files = github_client.list_files(repo, dir_path, branch)
                        relevant = [
                            f for f in dir_files
                            if cls_lower in f.split("/")[-1].lower()
                            or snake in f.split("/")[-1].lower()
                        ]
                        for candidate in relevant[:3]:
                            try:
                                f = github_client.get_file(repo, candidate, branch)
                                if cls_lower in f["content"].lower():
                                    snippet = _extract_relevant_section(f["content"], failing_symbol)
                                    code_context += f"\n\n### {candidate}\n```\n{snippet}\n```"
                                    file_info = {"repo": repo, "path": candidate, "sha": f["sha"],
                                                 "branch": branch, "original": f["content"]}
                                    logger.warning("3차(디렉터리) 파일 발견: %s/%s", dir_path, candidate)
                                    break
                            except Exception:
                                continue
                        if file_info:
                            break
                    except Exception:
                        continue

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
            code_context = f"\n\n(GitHub 접근 실패: {e})"

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

        # 완료 후 삭제
        del _pending[conversation_id]

        return (
            f"✅ **PR 생성 완료**\n\n"
            f"**{action['pr_title']}**\n"
            f"🔗 {pr['html_url']}\n\n"
            f"PR을 검토 후 머지하면 Render가 자동 재배포합니다."
        )

    except Exception as e:
        logger.exception("execute_pending 실패")
        return f"❌ PR 생성 실패: {e}"


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


__all__ = [
    "analyze_and_propose", "execute_pending", "preview_pending",
    "cancel_pending", "is_approve", "is_preview", "is_cancel",
]
