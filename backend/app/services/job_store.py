"""
인메모리 잡 스토어 — 백그라운드 에이전트 결과 임시 보관.

Render 싱글 워커 환경 기준 (멀티 워커면 Redis/DB로 교체).
TTL 10분 후 자동 만료.
"""
from __future__ import annotations

import threading
import time
from typing import Any

_lock: threading.Lock = threading.Lock()
_store: dict[str, dict[str, Any]] = {}  # run_id → job

_TTL = 600  # 10분


def create(run_id: str, owner: str | None = None) -> None:
    with _lock:
        _store[run_id] = {"status": "pending", "result": None, "ts": time.monotonic(), "owner": owner}


def complete(run_id: str, result: dict[str, Any]) -> None:
    with _lock:
        if run_id in _store:
            _store[run_id] = {"status": "done", "result": result, "ts": time.monotonic()}


def fail(run_id: str, error: str) -> None:
    with _lock:
        if run_id in _store:
            _store[run_id] = {"status": "error", "result": {"error": error}, "ts": time.monotonic()}


def get(run_id: str) -> dict[str, Any] | None:
    with _lock:
        job = _store.get(run_id)
        if job is None:
            return None
        if time.monotonic() - job["ts"] > _TTL:
            del _store[run_id]
            return None
        return dict(job)


def evict_expired() -> None:
    now = time.monotonic()
    with _lock:
        expired = [k for k, v in _store.items() if now - v["ts"] > _TTL]
        for k in expired:
            del _store[k]
