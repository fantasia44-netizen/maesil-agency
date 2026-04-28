"""
github_client — GitHub REST API 래퍼.

용도:
  - 코드 파일 읽기 (분석 컨텍스트)
  - 브랜치 생성 / 파일 커밋 / PR 생성 (승인 후 실행)

인증: agent_work.secrets.github_token (classic PAT, repo 권한)
"""
from __future__ import annotations

import base64
import logging

import httpx

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)

BASE = "https://api.github.com"


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
    url = f"{BASE}/repos/{repo}/contents/{path}"
    r = httpx.get(url, headers=_headers(), params={"ref": branch}, timeout=10)
    r.raise_for_status()
    items = r.json() if isinstance(r.json(), list) else []
    return [item["path"] for item in items if item.get("type") == "file"]


def get_default_branch(repo: str) -> str:
    """레포의 기본 브랜치 이름 반환 (main / master 등)."""
    r = httpx.get(f"{BASE}/repos/{repo}", headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json().get("default_branch", "main")


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


__all__ = [
    "get_file", "list_files", "get_default_branch", "get_repo_tree", "find_file_in_repo",
    "get_recent_commits", "create_branch", "commit_file", "create_pr",
]
