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

    # 코드 컨텍스트 수집
    code_context = ""
    file_info: dict | None = None

    # github_repo가 없으면 PAT으로 레포 자동 탐지
    if program and not program.get("github_repo"):
        detected = github_client.find_repo_by_name(program["name"])
        if detected:
            logger.info("레포 자동 탐지 성공: %s → %s", program["name"], detected)
            program = {**program, "github_repo": detected}
        else:
            code_context = (
                f"\n\n⚠️ **GitHub 레포 자동 탐지 실패** ({program['name']})\n"
                "Settings → 연결 프로그램에서 GitHub 레포를 직접 등록하세요."
            )

    if program and program.get("github_repo"):
        repo = program["github_repo"]
        try:
            branch = github_client.get_default_branch(repo)
            file_paths = _extract_file_paths(user_message)

            # 1차: 추출된 경로 후보로 직접 시도
            for fp in file_paths:
                try:
                    f = github_client.get_file(repo, fp, branch)
                    code_context += f"\n\n### {fp}\n```\n{f['content'][:3000]}\n```"
                    file_info = {"repo": repo, "path": fp, "sha": f["sha"], "branch": branch,
                                 "original": f["content"]}
                    break
                except FileNotFoundError:
                    continue
                except Exception as e:
                    logger.warning("파일 읽기 실패 %s/%s: %s", repo, fp, e)

            # 2차 폴백: 레포 트리 전체 검색으로 파일 찾기
            if not file_info and file_paths:
                logger.info("경로 후보 실패 → 레포 트리 검색: %s", file_paths)
                for fp in file_paths:
                    basename = fp.split("/")[-1].replace(".py", "").replace(".ts", "")
                    found = github_client.find_file_in_repo(repo, basename, branch)
                    for candidate in found[:3]:
                        try:
                            f = github_client.get_file(repo, candidate, branch)
                            code_context += f"\n\n### {candidate} (트리검색)\n```\n{f['content'][:3000]}\n```"
                            file_info = {"repo": repo, "path": candidate, "sha": f["sha"],
                                         "branch": branch, "original": f["content"]}
                            break
                        except Exception:
                            continue
                    if file_info:
                        break

            if not file_info:
                code_context = f"\n\n(파일 읽기 시도: {file_paths} — 레포 `{repo}` 에서 파일을 찾지 못했습니다)"

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

    user_prompt = f"""요청: {user_message}

프로그램: {program['name'] if program else '미특정'}
레포: {program.get('github_repo', '미등록') if program else '미등록'}
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
        fn_name_match = re.search(r'함수명:\s*(\w+)', fix_block)

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

            response += f"\n\n---\n✅ **수정안 준비 완료** (action: `{action_id}`)\n`승인` 이라고 입력하면 PR을 생성합니다. `취소` 로 취소 가능."

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


def cancel_pending(conversation_id: str) -> str:
    if conversation_id in _pending:
        del _pending[conversation_id]
        return "🚫 수정안을 취소했습니다."
    return "취소할 대기 중인 수정안이 없습니다."


def is_approve(text: str) -> bool:
    t = text.strip().lower()
    return any(k in t for k in APPROVE_KEYWORDS) and len(t) < 20


def is_cancel(text: str) -> bool:
    t = text.strip().lower()
    return any(k in t for k in {"취소", "cancel", "no", "아니", "ㄴ"}) and len(t) < 10


__all__ = ["analyze_and_propose", "execute_pending", "cancel_pending", "is_approve", "is_cancel"]
