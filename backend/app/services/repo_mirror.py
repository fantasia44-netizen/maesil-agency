"""
repo_mirror — 등록된 GitHub 레포의 소스 파일을 maesil-total DB(`agent_work.repo_files`)에 미러링.

목적:
  - dev-agent 가 파일을 검색할 때 GitHub API 호출 없이 DB만으로 응답
  - 워커 여러 개여도 DB 공유 → tarball 한 번만 다운로드
  - 서버 재시작해도 캐시 유지

흐름:
  1) `sync_all_active()` — 5분 폴 사이클에서 호출
     - program_registry의 active + github_repo 등록된 모든 레포 반복
     - GitHub HEAD commit sha 조회
     - DB의 repo_sync_state.commit_sha 와 같으면 스킵 (네트워크 1콜만)
     - 다르면 tarball 다운 → 파일 단위 UPSERT + 사라진 파일 DELETE → state 갱신

  2) `search_symbol(repo, symbol, basenames)` — RPC 호출
     → agent_work.find_file_with_symbol (012_repo_files.sql)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.db.maesil_total_client import get_maesil_total_client
from app.services import github_client

logger = logging.getLogger(__name__)

# 한 번에 UPSERT 묶을 행 수 (Supabase API 페이로드 제한 회피)
_UPSERT_CHUNK = 50


def _registry_table():
    return get_maesil_total_client().schema("agent_work").table("program_registry")


def _files_table():
    return get_maesil_total_client().schema("agent_work").table("repo_files")


def _state_table():
    return get_maesil_total_client().schema("agent_work").table("repo_sync_state")


# ─────────────────────────────────────────────────────────────────
# GitHub helpers
# ─────────────────────────────────────────────────────────────────
def _head_commit_sha(repo: str, branch: str) -> str | None:
    """레포의 현재 HEAD commit sha 조회 (1 API 콜)."""
    try:
        r = httpx.get(
            f"{github_client.BASE}/repos/{repo}/commits/{branch}",
            headers=github_client._headers(),
            timeout=10,
        )
        if r.status_code == 200:
            return r.json().get("sha")
        logger.warning("HEAD sha 조회 실패 [%s@%s]: %d %s",
                       repo, branch, r.status_code, r.text[:200])
    except Exception as e:
        logger.warning("HEAD sha 예외 [%s@%s]: %s", repo, branch, e)
    return None


# ─────────────────────────────────────────────────────────────────
# Sync (per-repo)
# ─────────────────────────────────────────────────────────────────
def sync_repo(repo: str, branch: str = "main", force: bool = False) -> dict:
    """단일 레포 동기화. 변경 없으면 0콜+0행. 변경 있으면 tarball 1콜 + UPSERT."""
    out: dict = {"repo": repo, "branch": branch, "skipped": False,
                 "upserted": 0, "deleted": 0, "error": None}

    # 1) 현재 HEAD sha
    head_sha = _head_commit_sha(repo, branch)
    if not head_sha:
        out["error"] = "HEAD sha 조회 실패"
        _update_state(repo, branch, None, 0, error=out["error"])
        return out

    # 2) DB의 마지막 sync sha 와 비교
    if not force:
        try:
            resp = _state_table().select("commit_sha,file_count").eq("repo", repo).limit(1).execute()
            rows = resp.data or []
            if rows and rows[0].get("commit_sha") == head_sha:
                out["skipped"] = True
                out["upserted"] = rows[0].get("file_count") or 0
                _touch_state(repo, branch, head_sha)
                return out
        except Exception as e:
            logger.warning("sync state 조회 실패 [%s]: %s", repo, e)

    # 3) tarball 다운 + 파일 추출 (github_client 캐시도 활용)
    try:
        files = github_client.download_repo_files(repo, branch)
    except Exception as e:
        out["error"] = f"tarball 실패: {e}"
        _update_state(repo, branch, head_sha, 0, error=out["error"])
        return out

    # 4) UPSERT (청크 단위로)
    rows_to_upsert = [
        {
            "repo": repo,
            "path": p,
            "sha": head_sha,        # 파일 blob sha 대신 commit sha 저장 — 변경 추적엔 충분
            "content": content,
            "size_bytes": len(content.encode("utf-8", errors="ignore")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        for p, content in files.items()
    ]
    upserted = 0
    for i in range(0, len(rows_to_upsert), _UPSERT_CHUNK):
        chunk = rows_to_upsert[i:i + _UPSERT_CHUNK]
        try:
            _files_table().upsert(chunk, on_conflict="repo,path").execute()
            upserted += len(chunk)
        except Exception as e:
            logger.warning("repo_files upsert 실패 [%s] chunk=%d: %s", repo, i, e)
    out["upserted"] = upserted

    # 5) 사라진 파일 정리 (현재 sync에 포함되지 않은 path)
    try:
        existing = _files_table().select("path").eq("repo", repo).execute()
        existing_paths = {r["path"] for r in (existing.data or [])}
        current_paths = set(files.keys())
        stale = list(existing_paths - current_paths)
        if stale:
            # IN 절 길이 제한 회피 — 100개 단위로 삭제
            for j in range(0, len(stale), 100):
                _files_table().delete().eq("repo", repo).in_("path", stale[j:j + 100]).execute()
            out["deleted"] = len(stale)
    except Exception as e:
        logger.warning("repo_files stale cleanup 실패 [%s]: %s", repo, e)

    # 6) state 갱신
    _update_state(repo, branch, head_sha, upserted, error=None)
    logger.info("repo_mirror sync %s@%s: upsert=%d, delete=%d",
                repo, branch, upserted, out["deleted"])
    return out


def _update_state(repo: str, branch: str, commit_sha: str | None,
                  file_count: int, error: str | None) -> None:
    try:
        _state_table().upsert(
            {
                "repo": repo,
                "branch": branch,
                "commit_sha": commit_sha,
                "file_count": file_count,
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "last_error": error,
            },
            on_conflict="repo",
        ).execute()
    except Exception as e:
        logger.warning("repo_sync_state upsert 실패 [%s]: %s", repo, e)


def _touch_state(repo: str, branch: str, commit_sha: str) -> None:
    """skip 시에도 last_synced_at 갱신."""
    try:
        _state_table().update(
            {
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
                "branch": branch,
                "commit_sha": commit_sha,
            }
        ).eq("repo", repo).execute()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────
# Sync (all)
# ─────────────────────────────────────────────────────────────────
def sync_all_active() -> dict:
    """등록된 모든 active 프로그램의 github_repo 동기화."""
    try:
        resp = (
            _registry_table()
            .select("name, github_repo")
            .eq("is_active", True)
            .not_.is_("github_repo", "null")
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        logger.error("program_registry 조회 실패: %s", e)
        return {"error": str(e), "repos": []}

    # 중복 레포 제거 (program 여러 개가 같은 레포 가리킬 수 있음)
    repos = sorted({r["github_repo"] for r in rows if r.get("github_repo")})
    results = []
    for repo in repos:
        r = sync_repo(repo)
        results.append(r)
    return {"repos": results, "synced_at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────────────
# Search (DB 미러 → dev-agent 호출)
# ─────────────────────────────────────────────────────────────────
def search_symbol(
    repo: str,
    symbol: str,
    basenames: list[str] | None = None,
) -> dict | None:
    """심볼(클래스/함수/태그)이 포함된 가장 적합한 파일 1개 반환.

    Returns: { path, content, sha, score } 또는 None
    """
    try:
        client = get_maesil_total_client()
        resp = (
            client
            .schema("agent_work")
            .rpc(
                "find_file_with_symbol",
                {
                    "p_repo": repo,
                    "p_symbol": symbol,
                    "p_basenames": basenames or [],
                },
            )
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        return rows[0]
    except Exception as e:
        logger.warning("repo_mirror search 실패 [%s/%s]: %s", repo, symbol, e)
        return None


__all__ = ["sync_repo", "sync_all_active", "search_symbol"]
