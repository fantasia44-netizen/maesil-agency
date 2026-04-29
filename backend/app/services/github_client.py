"""
github_client — GitHub REST API 래퍼.

용도:
  - 코드 파일 읽기 (분석 컨텍스트)
  - 브랜치 생성 / 파일 커밋 / PR 생성 (승인 후 실행)
  - 레포 tarball 일괄 다운로드 (in-memory 검색용)

인증: agent_work.secrets.github_token (classic PAT, repo 권한)
"""
from __future__ import annotations

import base64
import io
import logging
import tarfile
import time
from typing import Optional

import httpx

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)

BASE = "https://api.github.com"

# Tarball 캐시: (repo, branch) → (timestamp, {path: content})
_tarball_cache: dict[tuple[str, str], tuple[float, dict[str, str]]] = {}
_TARBALL_TTL = 300.0  # 5분


def _headers() -> dict[str, str]:
    token = get_secret("github_token")
    if not token:
        raise RuntimeError("github_token 미설정 (/settings에서 등록)")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# ─────────────────────────────────────────────────────────────────
# 읽기
# ─────────────────────────────────────────────────────────────────

def get_file(repo: str, path: str, branch: str = "main") -> dict:
    """파일 내용 반환. { content: str, sha: str, path: str }"""
    url = f"{BASE}/repos/{repo}/contents/{path}"
    r = httpx.get(url, headers=_headers(), params={"ref": branch}, timeout=10)
    if r.status_code == 404:
        raise FileNotFoundError(f"{repo}/{path} 파일 없음 (branch={branch})")
    r.raise_for_status()
    data = r.json()
    raw = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    return {"content": raw, "sha": data["sha"], "path": path, "repo": repo}


def list_files(repo: str, path: str = "", branch: str = "main") -> list[str]:
    """디렉터리 내 파일 경로 목록."""
    url = f"{BASE}/repos/{repo}/contents/{path}" if path else f"{BASE}/repos/{repo}/contents"
    r = httpx.get(url, headers=_headers(), params={"ref": branch}, timeout=10)
    r.raise_for_status()
    items = r.json() if isinstance(r.json(), list) else []
    return [item["path"] for item in items if item.get("type") == "file"]


def list_dir_entries(repo: str, path: str = "", branch: str = "main") -> list[dict]:
    """디렉터리 항목 목록 (파일 + 하위 디렉터리 모두).
    반환: [{"path": str, "type": "file"|"dir", "name": str}]
    """
    url = f"{BASE}/repos/{repo}/contents/{path}" if path else f"{BASE}/repos/{repo}/contents"
    r = httpx.get(url, headers=_headers(), params={"ref": branch}, timeout=10)
    r.raise_for_status()
    items = r.json() if isinstance(r.json(), list) else []
    return [
        {"path": item["path"], "type": item.get("type", ""), "name": item.get("name", "")}
        for item in items
        if item.get("type") in ("file", "dir")
    ]


def get_default_branch(repo: str) -> str:
    """레포의 기본 브랜치 이름 반환 (main / master 등)."""
    r = httpx.get(f"{BASE}/repos/{repo}", headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json().get("default_branch", "main")


def list_user_repos() -> list[str]:
    """인증된 PAT로 접근 가능한 모든 레포 (owner/repo 형식)."""
    results = []
    page = 1
    while True:
        r = httpx.get(
            f"{BASE}/user/repos",
            headers=_headers(),
            params={"per_page": 100, "page": page, "type": "all"},
            timeout=15,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        results.extend(repo["full_name"] for repo in batch)
        if len(batch) < 100:
            break
        page += 1
    return results


def find_repo_by_name(program_name: str) -> str | None:
    """프로그램 이름으로 GitHub 레포 자동 감지.
    1차: 정확 매칭 (끝부분)
    2차: 인스턴스 번호 제거 후 정확 매칭 (예: maesil-sync-worker-1 → maesil-sync-worker)
    3차: 포함 매칭
    4차: 토큰 다수 일치 점수 매칭 (fuzzy)
    """
    import re as _re
    try:
        repos = list_user_repos()
        name_lower = program_name.lower()

        # 1차: 정확 매칭
        for repo in repos:
            if repo.lower().split("/")[-1] == name_lower:
                return repo

        # 2차: 뒤쪽 -숫자 (인스턴스 번호) 제거 후 정확 매칭
        stripped = _re.sub(r'-\d+$', '', name_lower)
        if stripped != name_lower:
            for repo in repos:
                if repo.lower().split("/")[-1] == stripped:
                    logger.info("레포 인스턴스 번호 제거 매칭: %s → %s", program_name, repo)
                    return repo

        # 3차: 포함 매칭 (양방향)
        for repo in repos:
            rname = repo.lower().split("/")[-1]
            if name_lower in rname or rname in name_lower:
                return repo
        if stripped != name_lower:
            for repo in repos:
                rname = repo.lower().split("/")[-1]
                if stripped in rname or rname in stripped:
                    return repo

        # 4차: 토큰 다수 일치 점수 (- 와 _ 를 토큰 구분자로)
        tokens = {t for t in _re.split(r'[-_]', stripped) if len(t) >= 3}
        if tokens:
            best_repo, best_score = None, 0
            for repo in repos:
                rname = repo.lower().split("/")[-1]
                rtokens = {t for t in _re.split(r'[-_]', rname) if len(t) >= 3}
                score = len(tokens & rtokens)
                if score > best_score:
                    best_repo, best_score = repo, score
            # 토큰 2개 이상 겹치거나 (전체 토큰 대비 절반 이상이면 채택)
            if best_repo and (best_score >= 2 or best_score >= len(tokens) / 2):
                logger.info("레포 토큰 매칭: %s → %s (score=%d)", program_name, best_repo, best_score)
                return best_repo
    except Exception as e:
        logger.warning("레포 자동 감지 실패 [%s]: %s", program_name, e)
    return None


def download_repo_files(
    repo: str,
    branch: str = "main",
    extensions: tuple[str, ...] = (".py", ".ts", ".tsx", ".js", ".jsx"),
    skip_dirs: tuple[str, ...] = (
        "node_modules/", "__pycache__/", ".git/", ".github/",
        "dist/", "build/", "static/", "assets/", "images/",
        "public/", ".next/", ".cache/", "coverage/",
    ),
    max_file_bytes: int = 512 * 1024,  # 파일당 512KB 상한 (대용량 자동생성 파일 차단)
    timeout: float = 30.0,
) -> dict[str, str]:
    """레포 전체를 tarball로 1번에 받아서 메모리에 펼침. {path: content} 반환.

    캐싱: 5분 TTL — 같은 (repo, branch) 재호출시 네트워크 안 탐.
    개별 get_file 호출 N번 대비 5~10배 빠름 (HTTP 1번).
    """
    cache_key = (repo, branch)
    now = time.monotonic()
    cached = _tarball_cache.get(cache_key)
    if cached and now - cached[0] < _TARBALL_TTL:
        logger.info("tarball 캐시 HIT: %s@%s (%d files)", repo, branch, len(cached[1]))
        return cached[1]

    url = f"{BASE}/repos/{repo}/tarball/{branch}"
    t0 = time.monotonic()
    # tarball은 redirect (codeload.github.com) 으로 가므로 follow_redirects 필수
    with httpx.Client(follow_redirects=True, timeout=timeout) as client:
        r = client.get(url, headers=_headers())
        r.raise_for_status()
        data = r.content
    download_secs = time.monotonic() - t0
    logger.info("tarball 다운로드 %s@%s: %.1fMB / %.1fs",
                repo, branch, len(data) / (1024 * 1024), download_secs)

    files: dict[str, str] = {}
    t1 = time.monotonic()
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        for member in tar:
            if not member.isfile():
                continue
            name = member.name
            # tarball 최상단 디렉터리 제거 (예: "owner-repo-sha/app/foo.py" → "app/foo.py")
            if "/" in name:
                name = name.split("/", 1)[1]
            if not name.endswith(extensions):
                continue
            if any(tok in name for tok in skip_dirs):
                continue
            if member.size > max_file_bytes:
                continue
            try:
                f = tar.extractfile(member)
                if f is None:
                    continue
                files[name] = f.read().decode("utf-8", errors="replace")
            except Exception:
                continue
    extract_secs = time.monotonic() - t1
    logger.info("tarball 추출 %s@%s: %d files / %.2fs (다운=%.1fs)",
                repo, branch, len(files), extract_secs, download_secs)

    _tarball_cache[cache_key] = (now, files)
    return files


def invalidate_tarball_cache(repo: Optional[str] = None) -> None:
    """커밋 후 캐시 무효화 (선택). repo=None이면 전체."""
    if repo is None:
        _tarball_cache.clear()
        return
    keys = [k for k in _tarball_cache if k[0] == repo]
    for k in keys:
        _tarball_cache.pop(k, None)


def get_repo_tree(repo: str, branch: str = "main") -> list[str]:
    """레포 전체 파일 경로 목록 (재귀). 파일 찾기 폴백용."""
    r = httpx.get(
        f"{BASE}/repos/{repo}/git/trees/{branch}",
        headers=_headers(),
        params={"recursive": "1"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    return [item["path"] for item in data.get("tree", []) if item.get("type") == "blob"]


def search_code_in_repo(repo: str, query: str) -> list[str]:
    """GitHub code search API로 레포 내 코드가 들어있는 파일 경로 목록 반환.
    예: search_code_in_repo('owner/repo', 'class AgencyLog')
    """
    try:
        r = httpx.get(
            f"{BASE}/search/code",
            headers=_headers(),
            params={"q": f"{query} repo:{repo}"},
            timeout=15,
        )
        r.raise_for_status()
        return [item["path"] for item in r.json().get("items", [])]
    except Exception as e:
        logger.warning("코드 검색 실패 [%s] %r: %s", repo, query, e)
        return []


def find_file_in_repo(repo: str, filename: str, branch: str = "main") -> list[str]:
    """레포 트리에서 파일명이 포함된 경로 목록 반환 (대소문자 무시)."""
    try:
        all_paths = get_repo_tree(repo, branch)
        lower = filename.lower().replace(".py", "").replace(".ts", "")
        return [p for p in all_paths if lower in p.lower().split("/")[-1]]
    except Exception as e:
        logger.warning("find_file_in_repo 실패 %s/%s: %s", repo, filename, e)
        return []


def get_recent_commits(repo: str, branch: str = "main", n: int = 5) -> list[dict]:
    """최근 커밋 n건. [{sha, message, author, date}]"""
    r = httpx.get(
        f"{BASE}/repos/{repo}/commits",
        headers=_headers(),
        params={"sha": branch, "per_page": n},
        timeout=10,
    )
    r.raise_for_status()
    return [
        {
            "sha": c["sha"][:8],
            "message": (c["commit"]["message"] or "").splitlines()[0][:100],
            "author": c["commit"]["author"]["name"],
            "date": c["commit"]["author"]["date"],
        }
        for c in r.json()
    ]


# ─────────────────────────────────────────────────────────────────
# 쓰기 (승인 후 실행)
# ─────────────────────────────────────────────────────────────────

def create_branch(repo: str, new_branch: str, from_branch: str = "main") -> str:
    """브랜치 생성. 이미 있으면 그냥 반환."""
    # from_branch 의 HEAD sha 조회
    r = httpx.get(
        f"{BASE}/repos/{repo}/git/ref/heads/{from_branch}",
        headers=_headers(), timeout=10,
    )
    r.raise_for_status()
    sha = r.json()["object"]["sha"]

    r2 = httpx.post(
        f"{BASE}/repos/{repo}/git/refs",
        headers=_headers(),
        json={"ref": f"refs/heads/{new_branch}", "sha": sha},
        timeout=10,
    )
    if r2.status_code == 422:  # 이미 존재
        return new_branch
    r2.raise_for_status()
    return new_branch


def commit_file(
    repo: str,
    path: str,
    new_content: str,
    commit_message: str,
    branch: str,
    sha: str,  # 기존 파일의 blob sha (업데이트 시 필수)
) -> dict:
    """단일 파일 커밋. { commit_sha, html_url }"""
    encoded = base64.b64encode(new_content.encode()).decode()
    r = httpx.put(
        f"{BASE}/repos/{repo}/contents/{path}",
        headers=_headers(),
        json={
            "message": commit_message,
            "content": encoded,
            "sha": sha,
            "branch": branch,
        },
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "commit_sha": data["commit"]["sha"][:8],
        "html_url": data["content"]["html_url"],
    }


def create_pr(
    repo: str,
    title: str,
    body: str,
    head: str,           # 브랜치명
    base: str = "main",
) -> dict:
    """PR 생성. { number, html_url }"""
    r = httpx.post(
        f"{BASE}/repos/{repo}/pulls",
        headers=_headers(),
        json={"title": title, "body": body, "head": head, "base": base},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    return {"number": data["number"], "html_url": data["html_url"]}


def get_pr_status(repo: str, pr_number: int) -> dict:
    """PR 상태/머지 가능성 조회.
    Returns: { state, mergeable, mergeable_state, merged, head_sha, html_url, base_branch }
    - state: 'open' | 'closed'
    - mergeable: True/False/None (None = GitHub 가 계산 중)
    - mergeable_state: 'clean' | 'dirty' | 'blocked' | 'unstable' | 'behind' | 'unknown'
    """
    r = httpx.get(
        f"{BASE}/repos/{repo}/pulls/{pr_number}",
        headers=_headers(),
        timeout=15,
    )
    r.raise_for_status()
    d = r.json()
    return {
        "state": d.get("state"),
        "mergeable": d.get("mergeable"),
        "mergeable_state": d.get("mergeable_state"),
        "merged": d.get("merged", False),
        "head_sha": d.get("head", {}).get("sha"),
        "html_url": d.get("html_url"),
        "base_branch": d.get("base", {}).get("ref"),
        "title": d.get("title"),
    }


def merge_pull_request(
    repo: str,
    pr_number: int,
    method: str = "squash",   # 'merge' | 'squash' | 'rebase'
    commit_title: str | None = None,
    commit_message: str | None = None,
) -> dict:
    """PR 머지. 안전 가드 포함:
    - 이미 머지됐으면 idempotent (같은 결과 반환)
    - mergeable = False / state != 'open' 이면 RuntimeError
    Returns: { merged, sha, message, html_url }
    """
    # 1) 사전 상태 체크
    status = get_pr_status(repo, pr_number)
    if status["merged"]:
        return {
            "merged": True, "sha": status["head_sha"],
            "message": f"PR #{pr_number} 는 이미 머지됨",
            "html_url": status["html_url"],
        }
    if status["state"] != "open":
        raise RuntimeError(f"PR #{pr_number} 는 open 상태가 아님 (state={status['state']})")
    if status["mergeable"] is False:
        raise RuntimeError(
            f"PR #{pr_number} 머지 불가 (mergeable_state={status['mergeable_state']}). "
            "충돌 해결 또는 CI 통과 필요."
        )
    # mergeable is None — GitHub 가 계산 중. 한 번 더 시도해볼 만함

    # 2) 머지 호출
    payload: dict = {"merge_method": method}
    if commit_title:
        payload["commit_title"] = commit_title
    if commit_message:
        payload["commit_message"] = commit_message

    r = httpx.put(
        f"{BASE}/repos/{repo}/pulls/{pr_number}/merge",
        headers=_headers(),
        json=payload,
        timeout=20,
    )
    if r.status_code == 200:
        d = r.json()
        return {
            "merged": True, "sha": d.get("sha"),
            "message": d.get("message", "merged"),
            "html_url": status["html_url"],
        }
    # 405/409 등은 명확한 사유 함께 반환
    raise RuntimeError(
        f"PR #{pr_number} 머지 실패: HTTP {r.status_code} — {r.text[:300]}"
    )


__all__ = [
    "get_file", "list_files", "list_dir_entries", "get_default_branch",
    "get_repo_tree", "find_file_in_repo", "search_code_in_repo",
    "list_user_repos", "find_repo_by_name",
    "get_recent_commits", "create_branch", "commit_file", "create_pr",
    "get_pr_status", "merge_pull_request",
]
