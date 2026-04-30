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
# 영속 저장은 agent_work.dev_pr_history (사이트 재시작·새 대화에서도 조회)
_recent_pr: dict[str, dict[str, Any]] = {}


def _save_pr_history(
    conversation_id: str, repo: str, pr_number: int, pr_url: str,
    pr_title: str | None, base_branch: str | None, head_branch: str | None,
    file_path: str | None, fn_name: str | None,
) -> None:
    try:
        get_maesil_total_client().schema("agent_work").table("dev_pr_history").upsert(
            {
                "conversation_id": conversation_id,
                "repo": repo,
                "pr_number": pr_number,
                "pr_url": pr_url,
                "pr_title": pr_title,
                "base_branch": base_branch,
                "head_branch": head_branch,
                "file_path": file_path,
                "fn_name": fn_name,
                "status": "open",
            },
            on_conflict="repo,pr_number",
        ).execute()
    except Exception as e:
        logger.warning("dev_pr_history 저장 실패: %s", e)


def _auto_ack_alerts_for_pr(repo: str, pr_number: int, pr_title: str | None,
                             file_path: str | None) -> int:
    """PR 머지 시 관련 미확인 알림 자동 확인 처리.
    같은 프로그램(repo 기준)의 미확인 alert_events 중 file_path/module 관련된 것 ack.
    반환: ack 처리한 알림 수."""
    try:
        client = get_maesil_total_client()
        # repo → program_name 매핑 (program_registry)
        prog_resp = (
            client.schema("agent_work").table("program_registry")
            .select("name")
            .eq("github_repo", repo)
            .execute()
        )
        program_names = [r["name"] for r in (prog_resp.data or [])]
        if not program_names:
            return 0

        now = datetime.now(timezone.utc).isoformat()
        ack_count = 0

        # 모듈명 힌트 (file_path에서 추출)
        module_hints: list[str] = []
        if file_path:
            # services/naver_ad/repository.py → ['naver_ad', 'repository']
            parts = file_path.replace(".py", "").replace("/", ".").split(".")
            module_hints = [p for p in parts if len(p) > 3]

        for prog_name in program_names:
            # 미확인 알림 조회
            alerts_resp = (
                client.schema("agent_work").table("alert_events")
                .select("id, title, message")
                .eq("program_name", prog_name)
                .is_("acknowledged_at", "null")
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            for alert in (alerts_resp.data or []):
                content = f"{alert.get('title', '')} {alert.get('message', '')}".lower()
                # 관련 알림인지 판단: 모듈 힌트 or PR 제목 키워드
                is_related = any(h.lower() in content for h in module_hints)
                if not is_related and pr_title:
                    # PR 제목의 주요 키워드 매칭
                    title_words = [w for w in re.split(r'\W+', pr_title) if len(w) > 4]
                    is_related = any(w.lower() in content for w in title_words[:5])
                if is_related:
                    try:
                        client.schema("agent_work").table("alert_events").update(
                            {"acknowledged_at": now,
                             "acknowledged_note": f"PR #{pr_number} 머지로 자동 확인 처리"}
                        ).eq("id", alert["id"]).execute()
                        ack_count += 1
                        logger.info("alert 자동 ack [%s]: alert_id=%s (PR #%d)",
                                    prog_name, alert["id"], pr_number)
                    except Exception as e:
                        logger.warning("alert ack 실패 [%s]: %s", alert["id"], e)

        return ack_count
    except Exception as e:
        logger.warning("_auto_ack_alerts_for_pr 실패: %s", e)
        return 0


def _mark_pr_merged(repo: str, pr_number: int, pr_url: str | None = None,
                    pr_title: str | None = None) -> None:
    """PR 머지 완료를 DB 에 마킹 + 관련 미확인 알림 자동 확인 처리.
    UPDATE 가 0행 매칭일 수 있으므로 (행 자체가 없는 경우) UPSERT 로 처리."""
    payload = {
        "repo": repo,
        "pr_number": pr_number,
        "status": "merged",
        "merged_at": datetime.now(timezone.utc).isoformat(),
    }
    if pr_url:
        payload["pr_url"] = pr_url
    if pr_title:
        payload["pr_title"] = pr_title

    try:
        # 1) UPDATE 우선 — 행이 있으면 status/merged_at 만 갱신
        upd = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("dev_pr_history")
            .update({"status": "merged", "merged_at": payload["merged_at"]})
            .eq("repo", repo)
            .eq("pr_number", pr_number)
            .execute()
        )
        updated_rows = len(upd.data or [])
        logger.info("_mark_pr_merged UPDATE %s#%d → %d rows: %s",
                    repo, pr_number, updated_rows, upd.data)

        # 2) UPDATE 가 0행이면 (ex: 백필 안 된 PR) UPSERT 로 INSERT
        if updated_rows == 0:
            payload.setdefault("conversation_id", "merged-only")
            payload.setdefault("pr_url", pr_url or f"https://github.com/{repo}/pull/{pr_number}")
            ins = (
                get_maesil_total_client()
                .schema("agent_work")
                .table("dev_pr_history")
                .upsert(payload, on_conflict="repo,pr_number")
                .execute()
            )
            logger.info("_mark_pr_merged UPSERT fallback %s#%d: %s",
                        repo, pr_number, ins.data)

        # 3) 관련 미확인 알림 자동 ack
        # file_path 는 dev_pr_history 에서 조회
        file_path: str | None = None
        try:
            hist = (
                get_maesil_total_client()
                .schema("agent_work").table("dev_pr_history")
                .select("file_path").eq("repo", repo).eq("pr_number", pr_number)
                .limit(1).execute()
            )
            rows = hist.data or []
            if rows:
                file_path = rows[0].get("file_path")
        except Exception:
            pass

        acked = _auto_ack_alerts_for_pr(repo, pr_number, pr_title, file_path)
        if acked:
            logger.info("PR #%d 머지 → 관련 알림 %d개 자동 확인 처리", pr_number, acked)

    except Exception as e:
        logger.exception("dev_pr_history merged 마킹 실패: %s", e)


def _find_overlapping_prs(
    repo: str,
    file_path: str | None,
    fn_name: str | None,
    failing_symbol: str | None = None,
) -> list[dict]:
    """같은 파일/함수에 대해 이미 만들어진 PR (open/merged) 목록.
    중복 fix 생성 방지에 사용. 최근 30일 이내.

    매칭 전략 (우선순위순):
    1) file_path 직접 매칭
    2) 파일 basename이 PR 제목에 포함 (백필 PR 등 file_path 미등록 케이스)
    3) failing_symbol 이 PR 제목에 포함 (예: 'SyncLog.start' → PR #1 타이틀 매칭)
    """
    try:
        from datetime import timedelta
        client = get_maesil_total_client()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        all_rows = (
            client.schema("agent_work").table("dev_pr_history")
            .select("pr_number, pr_url, pr_title, status, fn_name, file_path, created_at, merged_at")
            .eq("repo", repo)
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(30)
            .execute().data
        ) or []

        matched: list[dict] = []
        seen_nums: set[int] = set()

        def _add(row: dict) -> None:
            n = row.get("pr_number")
            if n not in seen_nums:
                seen_nums.add(n)
                matched.append(row)

        # 1) file_path 직접 매칭
        if file_path:
            for r in all_rows:
                if r.get("file_path") == file_path:
                    _add(r)

        # 2) 파일 basename → PR 제목 검색
        if file_path:
            basename = file_path.rsplit("/", 1)[-1].replace(".py", "").lower()
            if basename:
                for r in all_rows:
                    title = (r.get("pr_title") or "").lower()
                    if basename in title:
                        _add(r)

        # 3) failing_symbol → PR 제목 검색 (예: "SyncLog.start", "log_sync_start")
        if failing_symbol:
            hints = [failing_symbol.lower()]
            # "SyncLog.start" → "synclog", "start" 도 개별 추가 (짧은 단어 제외)
            for part in failing_symbol.replace(".", "_").split("_"):
                if len(part) >= 5:
                    hints.append(part.lower())
            for r in all_rows:
                title = (r.get("pr_title") or "").lower()
                if any(h in title for h in hints):
                    _add(r)

        # fn_name 필터 — 명시된 경우만 (None 이면 모두 통과)
        if fn_name:
            matched = [r for r in matched if not r.get("fn_name") or r["fn_name"] == fn_name]

        return matched[:10]
    except Exception as e:
        logger.warning("_find_overlapping_prs 실패 [%s/%s]: %s", repo, file_path, e)
        return []


def _trigger_mirror_refresh_if_stale(repo: str, max_age_seconds: int = 300) -> None:
    """미러가 max_age 초 이상 stale 이면 동기화 트리거 (인라인, 빠르면 0.5s)."""
    try:
        from app.services import repo_mirror
        client = get_maesil_total_client()
        r = (
            client.schema("agent_work").table("repo_sync_state")
            .select("last_synced_at").eq("repo", repo).limit(1).execute()
        )
        rows = r.data or []
        if not rows:
            repo_mirror.sync_repo(repo)
            return
        last = rows[0].get("last_synced_at")
        if not last:
            repo_mirror.sync_repo(repo)
            return
        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - last_dt).total_seconds()
        if age > max_age_seconds:
            logger.info("미러 stale (%.0fs) — 강제 동기화: %s", age, repo)
            repo_mirror.sync_repo(repo)
    except Exception as e:
        logger.warning("미러 freshness 체크 실패: %s", e)


def _lookup_pr_in_history(pr_number: int, conversation_id: str | None = None) -> dict | None:
    """dev_pr_history 에서 PR 번호로 조회.
    같은 대화 우선 → 못 찾으면 최근 생성 순."""
    try:
        client = get_maesil_total_client()
        if conversation_id:
            r = (
                client.schema("agent_work").table("dev_pr_history")
                .select("repo, pr_number, pr_url, pr_title, status")
                .eq("conversation_id", conversation_id)
                .eq("pr_number", pr_number)
                .limit(1).execute()
            )
            rows = r.data or []
            if rows:
                logger.info("_lookup_pr_in_history same-conv hit: #%d conv=%s", pr_number, conversation_id)
                return rows[0]
        # 전역에서 가장 최근
        r = (
            client.schema("agent_work").table("dev_pr_history")
            .select("repo, pr_number, pr_url, pr_title, status")
            .eq("pr_number", pr_number)
            .order("created_at", desc=True)
            .limit(1).execute()
        )
        rows = r.data or []
        if rows:
            logger.info("_lookup_pr_in_history global hit: #%d → %s (status=%s)",
                        pr_number, rows[0].get("repo"), rows[0].get("status"))
            return rows[0]
        logger.warning("_lookup_pr_in_history: #%d — DB에 행 없음 (백필 미적용?)", pr_number)
        return None
    except Exception as e:
        logger.warning("dev_pr_history 조회 실패 [pr=%d]: %s", pr_number, e)
        return None


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
    예: '[Scheduler] auto_recovery 실패' → 'Scheduler.auto_recovery'
    예: 'AgencyLog.start failed' → 'AgencyLog.start'
    예: '"POST /app/api/competitor/register-group" 500' → 'competitor.register_group'
    예: '[naver_ad_api_client] [NaverAd] POST /stat-reports → 400:' → 'NaverAd.stat_reports'
    """
    # Python logger 포맷: module.path: [ClassName] /endpoint 메시지
    # 예: services.marketplace.naver_ad_api_client: [NaverAd] /stat-reports 지표 준비중
    m = re.search(
        r'[a-z_][a-z0-9_.]+:\s+\[([A-Z][a-zA-Z0-9_]+)\]\s+(?:(?:POST|GET|PUT|DELETE|PATCH)\s+)?(/[^\s\n,]+)',
        text, re.I
    )
    if m:
        path_last = m.group(2).strip('/').split('/')[-1].replace('-', '_')
        return f"{m.group(1)}.{path_last}"

    # [module] [ClassName] HTTP_METHOD /path → 숫자 패턴 (API 클라이언트 로그)
    # 예: [naver_ad_api_client] [NaverAd] POST /stat-reports → 400:
    m = re.search(
        r'\[[a-z_][a-z0-9_]+\]\s+\[([A-Z][a-zA-Z0-9_]+)\]\s+(?:POST|GET|PUT|DELETE|PATCH)\s+(/[^\s→\n]+)',
        text, re.I
    )
    if m:
        path_last = m.group(2).strip('/').split('/')[-1].replace('-', '_')
        return f"{m.group(1)}.{path_last}"

    # [ClassName] HTTP_METHOD /path → 숫자 (모듈 없는 버전)
    m = re.search(
        r'\[([A-Z][a-zA-Z0-9_]+)\]\s+(?:POST|GET|PUT|DELETE|PATCH)\s+(/[^\s→\n]+)\s*→\s*\d',
        text, re.I
    )
    if m:
        path_last = m.group(2).strip('/').split('/')[-1].replace('-', '_')
        return f"{m.group(1)}.{path_last}"

    # [ClassName] method 예외|실패|오류|에러|error|failed 패턴 (가장 흔한 패턴)
    m = re.search(
        r'\[([A-Z][a-zA-Z0-9_]+)\]\s+(\w+)\s+(예외|실패|오류|에러|error|failed)',
        text, re.I
    )
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    # ClassName.method_name 패턴
    m = re.search(r'\b([A-Z][a-zA-Z0-9]+)\.([a-z_]\w+)\b', text)
    if m and m.group(1) not in {"File", "GET", "POST", "PUT", "DELETE", "HTTP"}:
        return f"{m.group(1)}.{m.group(2)}"
    # HTTP access log 5xx — URL 마지막 2 세그먼트를 심볼로
    # "POST /app/api/competitor/register-group HTTP/1.1" 500
    m = re.search(
        r'"(?:POST|GET|PUT|DELETE|PATCH)\s+(/[^\s"]*)\s+HTTP/[\d.]+"\s+5\d\d\b',
        text, re.I
    )
    if m:
        _SKIP = {"app", "api", "v1", "v2", "v3", ""}
        parts = [p for p in m.group(1).split("/") if p not in _SKIP]
        if len(parts) >= 2:
            return f"{parts[-2]}.{parts[-1].replace('-', '_')}"
        elif parts:
            return parts[-1].replace("-", "_")
    return None


def _is_logger_tag_symbol(text: str, symbol: str) -> bool:
    """symbol이 '[ClassName] method 예외' 패턴에서 추출된 로거 태그인지 확인.
    로거 태그이면 class 정의 검증을 건너뜀 (Scheduler, SyncLog 등은 클래스가 아님)."""
    if not symbol:
        return False
    cls_part = symbol.split(".")[0]
    return bool(re.search(r'\[' + re.escape(cls_part) + r'\]', text))


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
            if re.match(r'class\s+' + re.escape(class_part) + r'[\s(:]', stripped):
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
                if len(merged) <= _MAX_SECTION_CHARS:
                    return merged
                # 클래스가 너무 크고 메서드명을 알면 → 해당 메서드 집중 추출
                if method_part:
                    class_lines = lines[i:end_idx]
                    for mi, cl in enumerate(class_lines):
                        if re.search(r"\bdef\s+" + re.escape(method_part) + r"\s*\(", cl):
                            m_end = len(class_lines)
                            for mk in range(mi + 1, len(class_lines)):
                                s = class_lines[mk]
                                stripped_mk = s.lstrip()
                                if stripped_mk and stripped_mk.startswith("def ") and (len(s) - len(stripped_mk)) <= 4:
                                    m_end = mk
                                    break
                            class_head = "\n".join(class_lines[:30])
                            method_body = "\n".join(class_lines[mi:m_end])
                            targeted = (
                                header
                                + "\n\n# ─── 관련 클래스 (상단) ───\n" + class_head
                                + "\n    # ... (중략) ...\n"
                                + f"\n# ─── {method_part} 메서드 ───\n" + method_body
                            )
                            return targeted[:_MAX_SECTION_CHARS]
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
    - 로거 브라켓 모듈명: [naver_ad_api_client] → services/marketplace/naver_ad_api_client.py 등
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
                f"services/{base}.py",
                f"services/marketplace/{base}.py",
                f"services/naver_ad/{base}.py",
                f"db/{base}.py",
                f"models/{base}.py",
                f"repositories/{base}.py",
                f"core/{base}.py",
                f"infrastructure/{base}.py",
            ]
            for c in candidates:
                if c not in found:
                    found.append(c)

    # 로거 브라켓 모듈명 추출: [naver_ad_api_client] [NaverAd] ...
    # 첫 번째 소문자 브라켓 태그 = 실제 Python 모듈명
    for m in re.finditer(r'^\[([a-z][a-z0-9_]+)\]', text, re.MULTILINE):
        mod = m.group(1)
        for prefix in [
            "services/marketplace",
            "services/naver_ad",
            "services",
            "app/services",
            "",
        ]:
            fp = f"{prefix}/{mod}.py" if prefix else f"{mod}.py"
            if fp not in found:
                found.append(fp)

    return found[:16]  # 최대 16개


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


# ─────────────────────────────────────────────────────────────────
# 거짓 진술 감지 + 자동 정정 레이어
# LLM 이 컨텍스트에 없는 정보를 "확인했다"고 주장하는 패턴을 차단
# ─────────────────────────────────────────────────────────────────

# (패턴, 대체 메시지) 목록
# 대체 메시지가 None 이면 해당 문장 전체 삭제
_HALLUCINATION_PATTERNS: list[tuple[re.Pattern, str | None]] = [
    # DB 직접 접근 주장
    (re.compile(r"DB\s*[에을]\s*(접속|조회|쿼리|확인)해\s*보[니면]", re.I),
     "[정정] DB에 직접 접근하지 않았습니다 — 코드 기반 추론입니다"),
    (re.compile(r"테이블\s*[을를]\s*(조회|확인|쿼리)해\s*보[니면]", re.I),
     "[정정] 테이블을 직접 조회하지 않았습니다"),
    # 테이블 없음 단언 (DB 스키마 컨텍스트 없을 때)
    (re.compile(r"테이블이\s*(존재하지\s*않|없[거어]|미존재)", re.I),
     "[정정] DB 스키마 정보가 없어 테이블 존재 여부를 확인할 수 없습니다"),
    (re.compile(r"접근\s*권한\s*(이\s*없|없[거어])", re.I),
     "[정정] 접근 권한 여부를 코드에서 확인할 수 없습니다"),
    # 로그/서버 직접 확인 주장
    (re.compile(r"(Render|서버)\s*(로그|상태)[를을]\s*(확인|조회)해\s*보[니면]", re.I),
     "[정정] 서버 로그를 직접 조회하지 않았습니다 — 제공된 에러 메시지 기반입니다"),
    (re.compile(r"GitHub\s*(API|레포)[를을]\s*(직접\s*)?(확인|조회)했[더으]니", re.I),
     "[정정] GitHub API를 직접 호출해 확인하지 않았습니다"),
    # 배포/재시작 완료 주장
    (re.compile(r"배포\s*(시작|완료|됐|되었)\s*[습니다됩]", re.I),
     "[정정] 배포는 Render가 머지 후 자동 처리합니다 — 직접 트리거하지 않았습니다"),
    (re.compile(r"서버\s*(재시작|재배포)\s*(했|완료|됐)", re.I),
     "[정정] 서버 재시작은 직접 실행할 수 없습니다"),
    # ── 사용자에게 정보 요청 (가장 빈번한 위반) ─────────────────────────
    # "알려주세요", "보내주세요", "공유해주세요", "첨부해주세요"
    (re.compile(r"(알려|보내|공유|첨부)\s*주\s*(세요|시겠어요|시면|시기\s*바랍)", re.I), None),
    # "붙여주시면", "붙여주세요", "붙여넣어 주시면" (넣어 삽입 케이스 포함)
    (re.compile(r"붙여\s*(넣어\s*)?주\s*(세요|시면|시겠)", re.I), None),
    # "확인해주세요", "확인해주시면"
    (re.compile(r"확인\s*(해|하여|하고)\s*주\s*(세요|시면|시겠)", re.I), None),
    (re.compile(r"확인\s*(결과|후)\s*(알려|보내)\s*주", re.I), None),
    # "직접 확인이 필요합니다", "별도 확인이 필요합니다"
    (re.compile(r"(직접|별도|수동)\s*확인이?\s*(필요|요청|요망)", re.I), None),
    # "어느 파일인지", "디렉터리 구조", "경로를 알려"
    (re.compile(r"(디렉터리|폴더|경로)\s*(구조|정보|내용)[를을]?\s*(알려|보내|공유|확인)", re.I), None),
    # "스택트레이스를 보내주세요", "전체 로그를 보내주세요"
    (re.compile(r"(스택트레이스|스택\s*트레이스|전체\s*로그|full\s*log)[를을]?\s*(보내|공유|첨부|알려)", re.I), None),
    # "알고 계신가요?", "요청드리고 싶은 것", 간접 요청 패턴
    (re.compile(r"알고\s*(계신가요|계세요|있으신가요|있으세요)\s*[?？]?", re.I), None),
    (re.compile(r"요청드리고\s*싶", re.I), None),
    (re.compile(r"(전달|제공|확인)\s*된다면\s*.{0,20}(분석|확인|파악)\s*(가능|드릴)", re.I), None),
    (re.compile(r"(완전히\s*)?전달된다면", re.I), None),
    (re.compile(r"다음\s*(알림|로그|에러)[에서]?\s*(완전히|전체|full)", re.I), None),
]


def _sanitize_response(response: str, has_db_schema: bool = False) -> str:
    """LLM 응답에서 거짓 진술 패턴을 감지하고 정정/삭제.

    - DB 직접 접근 주장 → 정정 문구로 교체
    - 테이블 없음 단언 (스키마 컨텍스트 없을 때) → 정정
    - 사용자에게 추가 정보 요청 → 해당 문장 삭제
    - 배포/재시작 완료 주장 → 정정
    """
    lines = response.split("\n")
    cleaned: list[str] = []
    corrections: list[str] = []

    for line in lines:
        replaced = False
        for pat, replacement in _HALLUCINATION_PATTERNS:
            # DB 스키마가 컨텍스트에 있으면 "테이블 없음" 패턴은 체크 안 함
            # (실제 스키마를 보고 내린 판단일 수 있으므로)
            if has_db_schema and pat.pattern in (
                r"테이블이\s*(존재하지\s*않|없[거어]|미존재)",
                r"접근\s*권한\s*(이\s*없|없[거어])",
            ):
                continue
            if pat.search(line):
                if replacement is None:
                    # 줄 통째로 삭제 (사용자 요청 금지 등)
                    logger.warning("거짓 진술 차단 — 문장 삭제: %s", line[:80])
                    replaced = True
                    break
                else:
                    # 정정 문구로 교체
                    corrected = f"> ⚠️ {replacement}"
                    cleaned.append(corrected)
                    corrections.append(pat.pattern[:40])
                    logger.warning("거짓 진술 감지 → 정정: pat=%s | line=%s",
                                   pat.pattern[:40], line[:80])
                    replaced = True
                    break
        if not replaced:
            cleaned.append(line)

    result = "\n".join(cleaned)
    return result


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

    # ── 1순위: 이력 우선 조회 ─────────────────────────────────────────
    # 같은 심볼/프로그램에 대해 이미 머지된 PR이 있으면 분석 시작 전에 바로 반환.
    # "이미 수정됐는데 또 분석하는" 낭비 차단.
    if failing_symbol and program and program.get("github_repo"):
        repo_for_check = program["github_repo"]
        already_fixed = _find_overlapping_prs(
            repo_for_check, None, None, failing_symbol=failing_symbol
        )
        merged_prs = [p for p in already_fixed if p.get("status") == "merged"]
        if merged_prs:
            latest = merged_prs[0]
            pr_num = latest.get("pr_number", "?")
            pr_url = latest.get("pr_url", "")
            pr_title = latest.get("pr_title", "")
            merged_at = latest.get("merged_at") or latest.get("created_at") or ""
            merged_at_str = ""
            if merged_at:
                try:
                    dt = datetime.fromisoformat(merged_at.replace("Z", "+00:00"))
                    merged_at_str = dt.strftime("%m/%d %H:%M")
                except Exception:
                    merged_at_str = merged_at[:16]
            logger.info("이미 수정된 이슈 — 분석 스킵: %s → PR #%s (%s)",
                        failing_symbol, pr_num, repo_for_check)

            # 머지된 PR의 실제 diff 가져오기
            diff_section = ""
            if isinstance(pr_num, int):
                diff = github_client.get_pr_diff(repo_for_check, pr_num)
                if diff:
                    diff_section = f"\n\n## 📝 수정 내용 (PR #{pr_num} diff)\n\n{diff}"

            return (
                f"## ✅ 이미 수정된 이슈입니다\n\n"
                f"**`{failing_symbol}`** 관련 수정이 이미 머지됐습니다.\n\n"
                f"- **PR #{pr_num}**: {pr_title}\n"
                f"- 🔗 {pr_url}\n"
                f"- 머지 시각: {merged_at_str}\n\n"
                f"이 알림은 PR 머지 **이전**에 발생한 에러입니다.\n"
                f"현재 코드에는 수정이 반영된 상태이므로 추가 조치가 필요 없습니다.\n\n"
                f"> 동일 에러가 머지 이후에도 계속 발생한다면 다시 알려주세요."
                f"{diff_section}"
            )

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
        # 분석 전 미러 freshness 체크 — stale 이면 강제 sync (이미 머지된 fix 가
        # 미러에 반영 안 된 채로 분석돼서 같은 fix 또 만들어지는 사고 방지)
        _trigger_mirror_refresh_if_stale(repo)
        try:
            branch = github_client.get_default_branch(repo)
            # 파일 경로: 현재 메시지 + 컨텍스트 전체에서 추출 (이전 메시지에 모듈 정보가 있을 수 있음)
            file_paths = _extract_file_paths(full_text)
            cls_check = failing_symbol.split(".")[0] if failing_symbol else ""
            symbol_is_tag = _is_logger_tag_symbol(full_text, failing_symbol) if failing_symbol else False
            # URL 기반 심볼 감지 — HTTP access log에서 추출된 경우 (lowercase class part)
            # 예: competitor.register_group (URL 세그먼트) vs AgencyLog.start (Python 클래스)
            is_url_symbol = (
                bool(failing_symbol) and not symbol_is_tag
                and bool(cls_check) and cls_check[0].islower()
            )

            if failing_symbol:
                cls_name = failing_symbol.split(".")[0].lower()
                method_name_sym = failing_symbol.split(".")[1] if "." in failing_symbol else ""
                snake = re.sub(r'(?<!^)(?=[A-Z])', '_', failing_symbol.split(".")[0]).lower()

                if is_url_symbol:
                    # HTTP 라우트 파일 — 공통 경로 접두사 우선 시도
                    for prefix in ["routes", "blueprints", "app/routes", "app/blueprints", "api", "views"]:
                        for name in [cls_name, snake]:
                            fp = f"{prefix}/{name}.py"
                            if fp not in file_paths:
                                file_paths.append(fp)
                else:
                    for extra in [f"{cls_name}.py", f"{snake}.py"]:
                        if extra not in file_paths:
                            file_paths.append(extra)

            # 1차: 추출된 경로 후보로 직접 시도
            # IMPORTANT: failing_symbol 이 있으면 그 심볼의 **정의(class/def)** 가
            # 실제로 파일에 있어야 채택. 단순 언급(로그 태그/문자열 리터럴)은 거부.
            # 단, [ClassName] 형식의 로거 태그에서 추출된 심볼은 클래스 정의가
            # 파일에 없어도 정상 — 경로 매칭 우선 (Scheduler, SyncLog 등 대부분 이 케이스).
            if is_url_symbol and method_name_sym:
                # URL 라우트: class 정의 대신 method(=실제 핸들러 함수명)로 검증
                cls_def_pat = re.compile(r'def\s+' + re.escape(method_name_sym) + r'\b')
                logger.info("URL 심볼 [%s] — cls_def_pat → def %s 검증", cls_check, method_name_sym)
            elif cls_check and not symbol_is_tag:
                cls_def_pat = re.compile(r'(?:class|def)\s+' + re.escape(cls_check) + r'\b')
            else:
                cls_def_pat = None
            if symbol_is_tag:
                logger.info("로거 태그 심볼 [%s] — cls_def_pat 체크 면제, 경로 매칭 우선", cls_check)
            for fp in file_paths:
                try:
                    f = github_client.get_file(repo, fp, branch)
                    content = f["content"]
                    # 심볼 정의 검증 — 단순 substring 매칭은 로그 문자열 등에서 오탐
                    # (로거 태그에서 추출된 경우 이 검증 면제)
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
                    method_name_orig = failing_symbol.split(".")[1] if "." in failing_symbol else ""
                    if is_url_symbol:
                        # URL 기반: 실제 핸들러 함수명 + URL 하이픈 표기 검색
                        url_seg = method_name_orig.replace("_", "-") if method_name_orig else ""
                        if method_name_orig:
                            code_search_queries += [
                                f"def {method_name_orig}",       # def register_group
                                f'"{url_seg}"',                  # "register-group" (Flask route 데코레이터)
                                method_name_orig,                # register_group 단독
                            ]
                        code_search_queries += [cls_name_orig]  # competitor (파일명 매칭 폴백)
                    elif symbol_is_tag:
                        # 로거 태그인 경우: 클래스 정의 대신 메서드명으로 검색
                        # (예: auto_recovery, start 등 실제 함수명이 더 정확)
                        if method_name_orig:
                            code_search_queries += [
                                f"def {method_name_orig}",     # def auto_recovery
                                method_name_orig,              # auto_recovery 단독
                            ]
                    else:
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

                # 브라켓 모듈명 폴백: [naver_ad_api_client] → naver_ad_api_client
                if not code_search_queries:
                    for bm in re.finditer(r'^\[([a-z][a-z0-9_]+)\]', full_text, re.MULTILINE):
                        q = bm.group(1)
                        if q not in code_search_queries:
                            code_search_queries.append(q)
                            break

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

            # 3차 폴백: DB 미러(repo_mirror) — 심볼 검색 or 경로 직접 조회 (1~5ms, GitHub 호출 0)
            if not file_info:
                import time as _time
                from app.services import repo_mirror

                hint_basenames = list({
                    p.rsplit("/", 1)[-1]
                    for p in (file_paths or []) if p.endswith(".py")
                })
                _t0 = _time.monotonic()
                hit = None

                if failing_symbol:
                    # 심볼 기반 검색 (기존 로직)
                    cls_orig = failing_symbol.split(".")[0]
                    hit = repo_mirror.search_symbol(repo, cls_orig, hint_basenames)
                    if not hit:
                        logger.warning("3차(DB미러) 심볼 미발견 [repo=%s, symbol=%s] %.1fms",
                                       repo, cls_orig, (_time.monotonic() - _t0) * 1000)

                if not hit and file_paths:
                    # 경로 기반 직접 조회 — failing_symbol 없어도 동작
                    for _fp in file_paths[:8]:
                        _h = repo_mirror.get_file_by_path(repo, _fp)
                        if _h:
                            hit = _h
                            logger.warning("3차(DB미러 경로) 파일 발견: %s (%.1fms)",
                                           _fp, (_time.monotonic() - _t0) * 1000)
                            break

                if hit:
                    path = hit["path"]
                    content = hit["content"]
                    try:
                        f = github_client.get_file(repo, path, branch)
                        sha = f["sha"]
                    except Exception:
                        sha = hit.get("sha", "")
                    snippet = (
                        _extract_relevant_section(content, failing_symbol)
                        if failing_symbol else content[:_MAX_SECTION_CHARS]
                    )
                    code_context += f"\n\n### {path}\n```\n{snippet}\n```"
                    file_info = {"repo": repo, "path": path, "sha": sha,
                                 "branch": branch, "original": content}
                else:
                    logger.warning("3차(DB미러) 전체 미발견 [repo=%s, paths=%s] %.1fms",
                                   repo, file_paths[:3], (_time.monotonic() - _t0) * 1000)

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
            # symbol_is_tag=True 면 [NaverAd] 같은 로거 태그 — 클래스 정의 파일 탐색 불필요
            if file_info and failing_symbol and not symbol_is_tag:
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

            # ── URL 심볼 추가 파일 수집 ─────────────────────────────────────
            # HTTP access log 기반 심볼: 라우트 핸들러 + 레포 파일 2개 수집.
            if is_url_symbol and file_info:
                _url_cls = failing_symbol.split(".")[0] if failing_symbol else ""
                _repo_candidates: list[str] = []   # 레포 파일 후보
                _route_candidates: list[str] = []  # 라우트 파일 후보
                _orig_txt = file_info.get("original", "")

                # 1) import 구문에서 레포 경로 추출
                #    from repositories.competitor_repo import CompetitorRepo
                for _imp in re.finditer(
                    r'from\s+([\w.]*' + re.escape(_url_cls) + r'[\w.]*)\s+import',
                    _orig_txt, re.I
                ):
                    _mod = _imp.group(1).replace(".", "/") + ".py"
                    if _mod != file_info["path"]:
                        _repo_candidates.append(_mod)

                # 2) 문자열 리터럴에서 모듈 경로 추출
                #    'repositories.competitor_repo.CompetitorRepo'
                for _lit in re.finditer(
                    r"""['"]([a-z_][a-z0-9_.]*\.""" + re.escape(_url_cls) + r"""[a-z0-9_.]*)['"]\s*[,:\}]""",
                    _orig_txt, re.I
                ):
                    _parts = _lit.group(1).rsplit(".", 1)[0]  # 클래스명 제거
                    _mod = _parts.replace(".", "/") + ".py"
                    if _mod != file_info["path"] and _mod not in _repo_candidates:
                        _repo_candidates.append(_mod)

                # 3) 라우트 파일 후보
                for _pfx in ["routes", "blueprints", "app/routes", "app/blueprints", "views"]:
                    _route_candidates.append(f"{_pfx}/{_url_cls}.py")

                # 4) 레포 파일 1개 + 라우트 파일 1개 각각 수집
                def _try_read(candidates: list[str]) -> bool:
                    for _fp in candidates[:4]:
                        if f"### {_fp}" in code_context:
                            continue
                        try:
                            _xf = github_client.get_file(repo, _fp, branch)
                            _xs = _extract_relevant_section(_xf["content"], failing_symbol)
                            code_context_ref.append(f"\n\n### {_fp}\n```\n{_xs}\n```")
                            logger.info("URL 심볼 추가 파일: %s", _fp)
                            return True
                        except (FileNotFoundError, Exception):
                            continue
                    return False

                code_context_ref: list[str] = []
                _try_read(_repo_candidates)
                _try_read(_route_candidates)
                code_context += "".join(code_context_ref)

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

    # ── 중복 PR 감지 ───────────────────────────────────────────────
    # 같은 파일에 이미 만들어진 PR (open/merged) 이 있으면 LLM 컨텍스트로 알려줌
    # → '이미 수정 PR 있음' 인지하고 중복 fix 생성 방지
    overlap_md = ""
    if file_info:
        try:
            overlaps = _find_overlapping_prs(
                file_info["repo"], file_info["path"], None,
                failing_symbol=failing_symbol,
            )
            if overlaps:
                lines = ["## 📋 같은 파일의 기존 PR (중복 fix 방지)"]
                for o in overlaps[:5]:
                    status = o.get("status", "?")
                    badge = "✅ merged" if status == "merged" else f"⏳ {status}"
                    lines.append(
                        f"- {badge} [PR #{o['pr_number']}]({o['pr_url']}) — "
                        f"{o.get('pr_title', '?')} (fn: {o.get('fn_name') or '?'})"
                    )
                lines.append(
                    "\n**중요**: 위 PR 중 'merged' 상태의 fix 가 현재 파일 코드에 "
                    "이미 반영돼 있을 수 있음. 또 다른 fix 만들기 전에 중복 여부 확인. "
                    "'open' PR 이 같은 함수면 새로 만들지 말고 그 PR 안내."
                )
                overlap_md = "\n".join(lines)
                code_context += "\n\n" + overlap_md
                logger.info("기존 PR %d개 발견 [%s/%s]",
                            len(overlaps), file_info["repo"], file_info["path"])
        except Exception as e:
            logger.warning("overlap PR 조회 실패: %s", e)

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

## 정보가 부족하거나 잘린 경우 처리 원칙
- 알림/로그 내용이 **중간에 잘렸거나 truncate** 된 경우:
  ✅ "알림 내용이 잘려 있어 전체 에러를 확인할 수 없습니다. 확인 가능한 정보 기반으로만 분석합니다."
  ❌ "전체 내용을 보내주세요" / "본문을 공유해주세요" — **절대 금지**
- 파일을 찾지 못한 경우: 찾지 못했다고 솔직히 말하고, 알 수 있는 것만 분석
- 어떤 경우에도 사용자에게 추가 정보를 요청하지 않음 — 시스템이 자동으로 수집하게 되어 있음

## 알림 래퍼 처리 (중요)
알림 제목/내용이 **이메일 발송 성공** 로그인 경우:
- 이것은 피드백 루프 — 알림 메일 발송 자체가 다시 알림으로 잡힌 것
- **진짜 에러는 `msg` 필드 안에 중첩된 JSON에 있음**
  예: `"msg": "이메일 발송 성공: [maesil-agency · ERROR] maesil-insight — {\"level\": \"ERROR\", \"module\": \"repository\", ...}"`
- 중첩된 JSON을 파싱해서 `"module"`, `"msg"`, `"level"` 필드를 추출하고 **그것을 분석 대상으로 삼을 것**
- 절대 "이 알림은 정상입니다, 실제 에러 로그를 보내주세요" 라고 하지 말 것 — 이미 중첩 JSON에 에러가 있음

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
            f"🔒 **파일 탐색 실패 — GitHub 트리 기반 재시도 필요**\n"
            f"{github_err}\n"
            f"레포 `{repo_tried}` 에서 `{failing_symbol}` 관련 파일을 자동으로 찾지 못했습니다.\n\n"
            f"**시도한 경로 ({len(file_paths or [])}개):** {tried_paths_str}\n"
            f"**code search 쿼리:** `class {cls_name_s}`, `{cls_name_s}`\n\n"
            f"파일 경로를 메시지에 포함하면 바로 분석할 수 있습니다.\n"
            f"예) `app/services/{cls_name_s.lower()}.py 분석해줘`"
        )

    try:
        response = _call_claude(system_prompt, user_prompt)
    except Exception as e:
        return f"⚠️ AI 분석 실패: {e}"

    # ── 거짓 진술 검출 + 차단 ─────────────────────────────────────────
    response = _sanitize_response(response, has_db_schema="🗄️ DB 스키마 컨텍스트" in code_context)

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

    # LLM이 0-indent로 작성한 patch_code를 원본 함수의 들여쓰기 수준으로 맞춤
    if fn_indent and not patch_code.startswith(fn_indent):
        indented_lines = [
            fn_indent + line if line.strip() else line
            for line in patch_code.rstrip('\n').split('\n')
        ]
        patch_code = '\n'.join(indented_lines)

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

        # 완료 후 삭제 + 머지용 정보 보관 (in-memory + DB 영속)
        del _pending[conversation_id]
        _recent_pr[conversation_id] = {
            "repo": repo,
            "pr_number": pr["number"],
            "pr_url": pr["html_url"],
            "pr_title": action["pr_title"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _save_pr_history(
            conversation_id=conversation_id,
            repo=repo,
            pr_number=pr["number"],
            pr_url=pr["html_url"],
            pr_title=action["pr_title"],
            base_branch=action.get("base_branch"),
            head_branch=action.get("branch"),
            file_path=action.get("path"),
            fn_name=action.get("fn_name"),
        )

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


_PR_URL_PAT = re.compile(
    r"https?://github\.com/([\w.-]+/[\w.-]+)/pull/(\d+)"
)
# #N 매칭. 좌·우 경계 모두 negative lookbehind/ahead 으로 '숫자만 아니면 OK'.
# 이렇게 하면 'PR#1머지', '머지#1확인', '[#1]', '(#1)', 시작 위치, 어디든 매칭.
# (버전번호 'v1.2#3' 같은 경우 '2' 가 숫자라 lookbehind 로 차단)
_PR_HASH_PAT = re.compile(r"(?<!\d)#(\d+)(?!\d)")


def _latest_open_pr() -> dict | None:
    """dev_pr_history 에서 가장 최근 open PR 반환 (PR 번호 미지정 머지 명령 fallback)."""
    try:
        client = get_maesil_total_client()
        r = (
            client.schema("agent_work").table("dev_pr_history")
            .select("repo, pr_number, pr_url, pr_title, status")
            .eq("status", "open")
            .order("created_at", desc=True)
            .limit(1).execute()
        )
        rows = r.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.warning("_latest_open_pr 조회 실패: %s", e)
        return None


def _extract_pr_reference(
    message: str,
    context_messages: list[dict] | None,
) -> tuple[str, int] | None:
    """메시지/컨텍스트/전체 대화 DB 에서 PR 참조 추출.

    1) 현재 메시지·컨텍스트에 https://github.com/owner/repo/pull/N → 직접 사용
    2) #N → 현재 컨텍스트의 program 매칭으로 repo 추론
    3) #N → dev_pr_history DB 조회 (새 대화에서도 유효, 가장 신뢰)
    4) #N → 일반 conversation_messages cross-conversation 검색
    5) #N 없음 → dev_pr_history 최근 open PR fallback (번호 없이 "머지해줘" 케이스)
    """
    texts = [message or ""]
    if context_messages:
        texts += [m.get("content", "") for m in context_messages[-15:]]
    full = "\n".join(texts)

    # 1순위: PR URL (현재 컨텍스트)
    m = _PR_URL_PAT.search(full)
    if m:
        return (m.group(1), int(m.group(2)))

    # PR 번호 추출 — 없으면 5순위(최근 open PR fallback)로 바로 이동
    h = _PR_HASH_PAT.search(full)
    if h:
        pr_num = int(h.group(1))

        # 2순위: #N + 컨텍스트의 program 매칭
        try:
            programs = _all_programs()
            prog = _detect_program_from_text(full, programs)
            if prog and prog.get("github_repo"):
                logger.info("_extract_pr_reference 2순위 (program): #%d → %s",
                            pr_num, prog["github_repo"])
                return (prog["github_repo"], pr_num)
        except Exception:
            pass

        # 3순위: dev_pr_history 에서 직접 조회 (가장 신뢰 — 새 대화에서도 유효)
        hist = _lookup_pr_in_history(pr_num)
        if hist:
            logger.info("_extract_pr_reference 3순위 (dev_pr_history): #%d → %s",
                        pr_num, hist["repo"])
            return (hist["repo"], pr_num)
        else:
            logger.warning("_extract_pr_reference 3순위 실패: pr_number=%d DB 조회 결과 없음 "
                           "(dev_pr_history 백필 확인 필요)", pr_num)

        # 4순위: 일반 conversation_messages 에서 cross-conversation 검색
        try:
            client = get_maesil_total_client()
            for pat in [f"%/pull/{pr_num}%", f"%#{pr_num}%"]:
                resp = (
                    client.schema("agent_work")
                    .table("conversation_messages")
                    .select("content")
                    .eq("agent_type", "developer")
                    .ilike("content", pat)
                    .order("created_at", desc=True)
                    .limit(20)
                    .execute()
                )
                for row in (resp.data or []):
                    content = row.get("content") or ""
                    u = _PR_URL_PAT.search(content)
                    if u and int(u.group(2)) == pr_num:
                        logger.info("_extract_pr_reference 4순위 (conv_msgs): #%d → %s",
                                    pr_num, u.group(1))
                        return (u.group(1), pr_num)
        except Exception as e:
            logger.warning("conversation_messages PR 검색 실패: %s", e)

        return None  # 번호는 있지만 repo를 못 찾음

    # 5순위: PR 번호 자체가 없는 경우 → 최근 open PR fallback
    # ("머지해줘" / "그거 머지" 같이 번호 생략한 케이스)
    latest = _latest_open_pr()
    if latest:
        logger.info("_extract_pr_reference 5순위 (latest open): #%d → %s",
                    latest["pr_number"], latest["repo"])
        return (latest["repo"], latest["pr_number"])

    return None


def merge_pending_pr(
    conversation_id: str,
    user_message: str = "",
    context_messages: list[dict] | None = None,
) -> str:
    """대화에서 머지 요청 처리. 안전 가드 포함.

    탐색 순서:
      1) 메시지/컨텍스트에 PR URL 있으면 그것 머지
      2) #N + program 매칭으로 추론
      3) _recent_pr[conversation_id] (이 대화에서 방금 만든 PR)
    """
    repo: str | None = None
    pr_number: int | None = None

    # 1) 메시지/컨텍스트에서 PR 참조 추출
    ref = _extract_pr_reference(user_message, context_messages)
    if ref:
        repo, pr_number = ref

    # 2) 없으면 _recent_pr fallback
    if not repo:
        info = _recent_pr.get(conversation_id)
        if info:
            repo = info["repo"]
            pr_number = info["pr_number"]
        else:
            # 3) 마지막 수단 — dev_pr_history 최근 open PR
            latest = _latest_open_pr()
            if latest:
                repo = latest["repo"]
                pr_number = latest["pr_number"]
                logger.info("merge_pending_pr: PR 번호 미지정 → dev_pr_history 최근 open PR #%d (%s) 사용",
                            pr_number, repo)
            else:
                return (
                    "⚠️ 머지할 PR 정보를 찾지 못했습니다.\n"
                    "다음 중 한 가지 형식으로 다시 요청해 주세요:\n"
                    "- `https://github.com/owner/repo/pull/N 머지`\n"
                    "- `PR #N 머지` (이전 메시지에 프로그램 이름이 언급된 경우)\n"
                    "- 같은 대화에서 `승인` 으로 PR 만든 직후 `머지`"
                )

    # PR URL — _recent_pr 또는 dev_pr_history 에서 조회
    info_local = _recent_pr.get(conversation_id) or {}
    pr_url = info_local.get("pr_url")
    pr_title = info_local.get("pr_title")
    if not pr_url:
        # dev_pr_history 에서 URL/title 보완
        hist2 = _lookup_pr_in_history(pr_number)
        if hist2:
            pr_url = hist2.get("pr_url")
            pr_title = pr_title or hist2.get("pr_title")
    pr_url = pr_url or f"https://github.com/{repo}/pull/{pr_number}"

    try:
        result = github_client.merge_pull_request(
            repo=repo,
            pr_number=pr_number,
            method="squash",
            commit_title=pr_title,
        )
        if result.get("merged"):
            # 머지 성공 — 추적 해제 (있었다면) + DB history 도 업데이트
            _recent_pr.pop(conversation_id, None)
            _mark_pr_merged(repo, pr_number, pr_url=pr_url, pr_title=pr_title)
            return (
                f"✅ **PR #{pr_number} 머지 완료** (`{repo}`)\n\n"
                f"🔗 {pr_url}\n"
                f"sha: `{result.get('sha', '?')[:8] if result.get('sha') else '?'}`\n\n"
                f"Render 가 자동으로 재배포를 시작합니다 (~2~3분)."
            )
        return f"⚠️ 머지 응답 이상: {result}"
    except Exception as e:
        logger.warning("merge_pending_pr 실패: %s", e)
        return (
            f"❌ PR #{pr_number} (`{repo}`) 머지 실패\n\n"
            f"사유: `{str(e)[:300]}`\n\n"
            f"GitHub UI 에서 직접 머지: {pr_url}"
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
    """짧은 머지 명령 감지 (빠른 패스 — LLM 분류 보조).
    1) '머지' / 'merge' 키워드 (가장 강한 신호)
    2) 'PR #N' / '#N' 만 있는 짧은 메시지 + 분석 키워드 부재
    """
    t = text.strip()
    t_lower = t.lower()
    if len(t_lower) < 30 and any(
        k in t_lower for k in {"머지", "merge", "머지해", "머지하자", "merge it"}
    ):
        return True
    if len(t) <= 25 and _PR_HASH_PAT.search(t):
        analyze_kws = {"분석", "원인", "왜", "체크", "보여", "내용"}
        if not any(k in t_lower for k in analyze_kws):
            return True
    return False


# ─────────────────────────────────────────────────────────────────
# LLM 기반 의도 분류 (키워드 매칭의 brittle 함 보완)
# ─────────────────────────────────────────────────────────────────
def classify_action(
    message: str,
    has_pending: bool = False,
    has_recent_pr: bool = False,
) -> dict | None:
    """LLM 으로 사용자 메시지를 dev-agent 액션 카테고리로 분류.

    반환:
      {
        "action": "preview" | "approve" | "merge" | "cancel" | "analyze" | "chat",
        "pr_number": int | None,   # 머지일 때만 의미 있음
        "confidence": "high" | "medium" | "low",
      }
    실패시 None — 호출 측은 keyword 폴백 사용.
    """
    import anthropic
    from app.services.secrets import get_secret
    api_key = get_secret("anthropic_api_key")
    if not api_key:
        return None

    state_lines = []
    if has_pending:
        state_lines.append("- 진행 중인 수정안 있음 (preview/approve/cancel 가능)")
    if has_recent_pr:
        state_lines.append("- 최근 생성된 PR 있음 (merge 가능)")
    state_block = "\n".join(state_lines) or "- 진행 중인 수정안 / 최근 PR 없음"

    system = f"""사용자가 dev-agent에 보낸 메시지의 의도를 분류하라.

**현재 상태:**
{state_block}

**가능한 액션:**
- preview: 수정안 diff 미리보기 ("미리보기", "diff 보여줘", "뭐가 바뀌어")
- approve: 수정안 승인 → PR 생성 ("승인", "ok", "좋아", "진행해", "만들어")
- merge: PR 머지 ("머지", "합쳐", "PR #N 머지", "#N", "PR #1만 입력해도 머지 의도")
- cancel: 진행 취소 ("취소", "no", "아니야", "그만")
- analyze: 새 에러/이슈/코드 질문 분석 (에러 로그 / 알림 / 질문 / 명령)
- chat: 인사·잡담·시스템 질문 ("안녕", "고마워", "ai야 너는?")

**규칙:**
- 메시지가 짧고 PR 번호만 있으면 (예: "PR #1", "#2") → merge
- 새 알림이나 에러 메시지 / 코드 질문이면 → analyze
- 진행 중인 수정안 없는데 preview/approve/cancel 분류하지 말 것
- 최근 PR 없는데 merge 분류 가능 (메시지의 #N 또는 URL 로 식별)

**PR 번호 추출:** 메시지에 #N, PR N, /pull/N 같은 패턴 있으면 정수로.

**응답 형식 (JSON 만, 다른 텍스트 금지):**
{{"action": "...", "pr_number": null 또는 정수, "confidence": "high|medium|low"}}
"""
    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=80,
            system=system,
            messages=[{"role": "user", "content": message[:500]}],
        )
        text = resp.content[0].text.strip()
        # JSON 추출 (코드블록 제거 등 robust 하게)
        import json
        # ```json ... ``` 형식이면 본문만
        m = re.search(r'\{[^{}]*\}', text)
        if not m:
            return None
        data = json.loads(m.group(0))
        action = (data.get("action") or "").lower()
        if action not in {"preview", "approve", "merge", "cancel", "analyze", "chat"}:
            return None
        return {
            "action": action,
            "pr_number": data.get("pr_number") if isinstance(data.get("pr_number"), int) else None,
            "confidence": data.get("confidence") or "medium",
        }
    except Exception as e:
        logger.warning("classify_action 실패: %s", e)
        return None


# ─────────────────────────────────────────────────────────────────
# 기능 설명 모드 (CS ↔ Dev 연동 — feature_kb 생성용)
# ─────────────────────────────────────────────────────────────────

def explain_feature(question: str, program: str) -> dict | None:
    """CS 에이전트가 모르는 기능 질문을 분석해 feature_docs 항목 생성.

    Returns:
        {keywords: [...], answer: "...", code_refs: [...]} 또는 None
    """
    programs = _all_programs()
    prog = next((p for p in programs if p["name"] == program), None)
    if not prog or not prog.get("github_repo"):
        logger.warning("explain_feature: 프로그램 레지스트리 미등록 [%s]", program)
        return None

    repo = prog["github_repo"]

    code_context = ""
    code_refs: list[str] = []
    try:
        from app.services import repo_mirror
        kw_tokens = re.findall(r'[가-힣a-zA-Z_]{2,}', question)
        for kw in kw_tokens[:5]:
            hit = repo_mirror.search_symbol(repo, kw, [])
            if hit:
                path = hit["path"]
                content = hit["content"]
                code_context += f"\n\n### {path}\n```\n{content[:3000]}\n```"
                code_refs.append(path)
                break
    except Exception as e:
        logger.warning("explain_feature 코드 검색 실패: %s", e)

    system_prompt = """당신은 maesil SaaS의 기능 설명 전문가입니다.
고객 질문과 관련 코드를 분석해서 CS 에이전트가 사용할 수 있는 기능 설명을 생성하세요.

응답 형식 (JSON만, 다른 텍스트 금지):
{"keywords": ["키워드1", "키워드2"], "answer": "설명", "code_refs": ["파일경로"]}

규칙:
- answer: 기술 용어 없이 쉬운 말로, 2~3문장, 마크다운·이모지 금지
- keywords: 이 질문을 재매칭할 2~5개 핵심 키워드"""

    user_prompt = (
        f"프로그램: {program}\n고객 질문: {question}\n"
        + (code_context if code_context else "(관련 코드 없음 — 일반 SaaS 기능 기준으로 설명)")
    )

    try:
        response = _call_claude(system_prompt, user_prompt, max_tokens=500)
        m = re.search(r'\{.*\}', response, re.DOTALL)
        if not m:
            return None
        import json as _json
        data = _json.loads(m.group(0))
        return {
            "keywords": data.get("keywords") or [],
            "answer": data.get("answer") or "",
            "code_refs": data.get("code_refs") or code_refs,
        }
    except Exception as e:
        logger.warning("explain_feature LLM 실패: %s", e)
        return None


__all__ = [
    "analyze_and_propose", "execute_pending", "preview_pending",
    "cancel_pending", "merge_pending_pr",
    "is_approve", "is_preview", "is_cancel", "is_merge",
    "explain_feature",
]
