"""
render_logs — Render Logs API 폴링 + 에러 패턴 분류.

폴러 호출 흐름:
  1) program_registry에서 host_provider='render' AND host_service_id 등록된 프로그램 목록
  2) 프로그램별 program_log_cursor.last_seen_at ~ now() 구간 로그 조회
  3) 에러 패턴 매칭 → severity 분류
  4) alert_events에 dedup_key로 INSERT (중복 방지)
  5) cursor.last_seen_at 갱신

Render API:
  - GET /v1/services/{service_id}  → ownerId 조회 (캐시)
  - GET /v1/logs?ownerId=...&resource=<service_id>&startTime=...&endTime=...

API key는 secrets.render_api 에 저장됨.
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Iterable

import httpx

from app.db.maesil_total_client import get_maesil_total_client
from app.services.secrets import get_secret

logger = logging.getLogger(__name__)

RENDER_API_BASE = "https://api.render.com/v1"

# 제외 패턴 — 알려진 정상 경고 (alert 생성 안 함)
EXCLUDE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"데이터없음", re.I),
    re.compile(r"데이터 없음", re.I),
    re.compile(r"no data", re.I),
    re.compile(r"(trapped).*bcrypt", re.I),   # passlib bcrypt 버전 경고
    re.compile(r"error reading bcrypt", re.I),
    # graceful shutdown (배포 시 정상)
    re.compile(r"SHUTDOWN_EVENT\s+set", re.I),
    re.compile(r"신호\s*15\s*수신", re.I),
    re.compile(r"graceful shutdown", re.I),
    re.compile(r"\bSIGTERM\b"),
    # pip install 로그 (deprecated 키워드 잡혀서 들어옴)
    re.compile(r"^\s*Using cached\b", re.I),
    re.compile(r"^\s*Collecting\b.*deprecated", re.I),
    re.compile(r"^\s*Downloading\b.*\.whl", re.I),
    # Render 배포 진행 로그 (정상 동작 — 에러 아님)
    re.compile(r"==>\s+\S", re.I),                             # ==> Running / ==> Build (위치 무관)
    re.compile(r"\bgunicorn\b.*\b(--bind|--workers|--timeout|--worker-class|app:app)\b", re.I),  # gunicorn 기동 명령
    re.compile(r"\[INFO\]\s+Listening at:", re.I),             # gunicorn 리스닝 시작
    re.compile(r"Booting worker with pid", re.I),              # gunicorn 워커 부트
    re.compile(r"Worker\s+(booting|exiting|timeout)", re.I),   # gunicorn 워커 상태
    re.compile(r"\[\d+\]\s+\[\d+\]", re.I),                   # gunicorn pid 로그
    re.compile(r"Arbiter booting", re.I),                      # gunicorn arbiter 시작
    re.compile(r"Arbiter pid", re.I),                          # gunicorn arbiter pid
    # 에러 알림 메일 발송 로그 피드백 루프 차단
    # — "이메일 발송 성공/완료" 는 알림이 정상 발송됐다는 INFO 로그
    # — module이 email 이고 이메일 발송 관련 메시지면 무조건 제외
    re.compile(r"이메일\s*발송\s*(성공|완료|실패|시도)", re.I),
    re.compile(r'"msg":\s*"이메일\s*발송', re.I),
    re.compile(r'"module":\s*"email".*"msg":\s*"이메일', re.I),
    # maesil-agency 자체 알림 에이전트 동작 로그 (INFO여도 ERROR 키워드 포함)
    re.compile(r"\[maesil-agency\s*·\s*(ERROR|WARNING|INFO)\]", re.I),
    re.compile(r'"path":\s*"/api/v1/notify/', re.I),  # notify 엔드포인트 호출 로그
    # 네이버 광고 API — 지표 준비중(code=20007)은 정상 비즈니스 응답
    re.compile(r'"code"\s*:\s*20007', re.I),
    re.compile(r'지표\s*준비중', re.I),
]

# 에러 패턴 → severity 매핑 (위에서부터 우선)
SEVERITY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("critical", re.compile(r"\b(FATAL|CRITICAL|OOMKilled|out of memory|killed \(signal|segmentation fault|panic:)\b", re.I)),
    ("critical", re.compile(r"\bHTTP/\d\.\d\"\s+5\d\d\b")),                   # 5xx 응답
    ("critical", re.compile(r"\b(deploy failed|build failed)\b", re.I)),
    ("error",    re.compile(r"\b(ERROR|Exception|Traceback|unhandled rejection)\b")),
    ("error",    re.compile(r"\b(timeout|timed out)\b", re.I)),
    ("warning",  re.compile(r"\b(WARN|WARNING|deprecated)\b")),
]

# in-memory cache: service_id → owner_id (프로세스 수명 동안 유지)
_owner_cache: dict[str, str] = {}


# ─────────────────────────────────────────────────────────────────
# Render API helpers
# ─────────────────────────────────────────────────────────────────
def _api_key() -> str | None:
    return get_secret("render_api")


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }


def _resolve_owner_id(service_id: str, api_key: str, timeout: float = 10.0) -> str | None:
    """service_id → ownerId 변환 (캐시)."""
    if service_id in _owner_cache:
        return _owner_cache[service_id]

    try:
        resp = httpx.get(
            f"{RENDER_API_BASE}/services/{service_id}",
            headers=_headers(api_key),
            timeout=timeout,
        )
        if resp.status_code != 200:
            logger.warning("render_logs: service lookup failed %s — %s", resp.status_code, resp.text[:300])
            return None
        owner_id = (resp.json() or {}).get("ownerId")
        if owner_id:
            _owner_cache[service_id] = owner_id
        return owner_id
    except Exception:
        logger.exception("render_logs: service lookup error")
        return None


def _fetch_logs(service_id: str, owner_id: str, api_key: str, start: datetime, end: datetime,
                limit: int = 100, timeout: float = 30.0) -> list[dict]:
    """Render /v1/logs 호출. 시간순 오름차순으로 정렬해서 반환."""
    params = {
        "ownerId": owner_id,
        "resource": service_id,
        "startTime": start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "endTime":   end.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "limit": str(limit),
        "direction": "backward",
    }
    try:
        resp = httpx.get(f"{RENDER_API_BASE}/logs", headers=_headers(api_key), params=params, timeout=timeout)
    except httpx.ReadTimeout:
        logger.warning("render_logs: fetch timed out (service=%s), skipping this poll cycle", service_id)
        return []
    except Exception as e:
        logger.exception("render_logs: fetch failed")
        raise RuntimeError(f"render logs fetch failed: {e}") from e

    if resp.status_code != 200:
        raise RuntimeError(f"render logs HTTP {resp.status_code}: {resp.text[:300]}")

    data = resp.json() or {}
    # Render 응답 형식: { "logs": [{timestamp, message, ...}], "hasMore": bool }
    logs = data.get("logs") or data.get("data") or []
    # 오래된 것부터 처리
    logs.sort(key=lambda x: x.get("timestamp", ""))
    return logs


# ─────────────────────────────────────────────────────────────────
# 분류 + 적재
# ─────────────────────────────────────────────────────────────────
def _extract_title(msg: str, program_name: str) -> str:
    """로그 메시지에서 의미 있는 알림 제목 추출.
    ANSI 코드 제거 → JSON 구조화 로그이면 'msg' 필드 우선, 아니면 첫 줄."""
    if not msg:
        return f"{program_name} 로그 이상"
    stripped = _strip_ansi(msg).strip()
    # JSON 구조화 로그 시도
    if stripped.startswith("{"):
        import json as _json
        try:
            obj = _json.loads(stripped)
            inner_msg = obj.get("msg") or obj.get("message") or ""
            level = obj.get("level") or ""
            module = obj.get("module") or ""
            if inner_msg:
                prefix = f"[{module}] " if module else ""
                return f"{prefix}{inner_msg}"[:200]
        except Exception:
            pass
    return stripped.splitlines()[0][:200]


# ANSI 이스케이프 코드 제거 패턴 (Render 컬러 로그)
_ANSI_ESC = re.compile(r'\x1b\[[0-9;]*[mBCDHJKSTfhlmnpsu]|\(B')


def _strip_ansi(text: str) -> str:
    """ANSI 이스케이프 시퀀스 제거."""
    return _ANSI_ESC.sub("", text)


def classify(message: str) -> str | None:
    """에러 패턴 매칭 → severity. 매칭 안되면 None (스킵)."""
    if not message:
        return None
    # ANSI 코드 제거 후 분류 (Render 컬러 로그 오탐 방지)
    clean = _strip_ansi(message)
    # 제외 패턴 먼저 확인 — 정상 경고는 alert 생성 안 함
    for pat in EXCLUDE_PATTERNS:
        if pat.search(clean):
            return None
    for sev, pat in SEVERITY_PATTERNS:
        if pat.search(clean):
            return sev
    return None


def make_dedup_key(program_name: str, message: str) -> str:
    """같은 메시지 반복은 1번만 알림. 앞 200자만 사용."""
    norm = re.sub(r"\d+", "N", (message or "")[:200])  # 숫자 정규화 (ID/timestamp 차이 무시)
    h = hashlib.sha256(f"{program_name}|{norm}".encode("utf-8")).hexdigest()[:16]
    return f"{program_name}:{h}"


def _events_table():
    return get_maesil_total_client().schema("agent_work").table("alert_events")


def _cursor_table():
    return get_maesil_total_client().schema("agent_work").table("program_log_cursor")


def _registry_table():
    return get_maesil_total_client().schema("agent_work").table("program_registry")


def _list_render_programs() -> list[dict]:
    resp = (
        _registry_table()
        .select("name, display_name, host_service_id")
        .eq("is_active", True)
        .eq("host_provider", "render")
        .execute()
    )
    return [r for r in (resp.data or []) if r.get("host_service_id")]


def _get_cursor(program_name: str) -> datetime:
    resp = _cursor_table().select("last_seen_at").eq("program_name", program_name).limit(1).execute()
    rows = resp.data or []
    if rows and rows[0].get("last_seen_at"):
        return datetime.fromisoformat(rows[0]["last_seen_at"].replace("Z", "+00:00"))
    # 처음이면 5분 전부터
    return datetime.now(timezone.utc).replace(microsecond=0) - _five_minutes()


def _five_minutes():
    from datetime import timedelta
    return timedelta(minutes=5)


def _upsert_cursor(program_name: str, last_seen_at: datetime, error: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    _cursor_table().upsert(
        {
            "program_name": program_name,
            "last_seen_at": last_seen_at.astimezone(timezone.utc).isoformat(),
            "last_polled_at": now,
            "last_error": error,
            "updated_at": now,
        },
        on_conflict="program_name",
    ).execute()


def _insert_event(program_name: str, severity: str, title: str, message: str, raw: dict) -> bool:
    """dedup_key 충돌이면 무시. 새로 들어가면 True."""
    dedup_key = make_dedup_key(program_name, message)
    try:
        _events_table().insert(
            {
                "program_name": program_name,
                "severity": severity,
                "source": "render-logs",
                "title": title,
                "message": message[:4000],
                "dedup_key": dedup_key,
                "raw": raw or {},
            }
        ).execute()
        return True
    except Exception as e:
        # unique 충돌 등은 무시
        msg = str(e).lower()
        if "duplicate" in msg or "unique" in msg or "23505" in msg:
            return False
        logger.warning("alert_events insert error: %s", e)
        return False


# ─────────────────────────────────────────────────────────────────
# 메인 폴러
# ─────────────────────────────────────────────────────────────────
def poll_all() -> dict:
    """모든 active render 프로그램의 로그 폴링.

    Returns: {programs: [{name, fetched, new_events, error}], total_new_events: int}
    """
    api_key = _api_key()
    if not api_key:
        return {"error": "render_api 미설정 (/settings에서 등록)", "programs": [], "total_new_events": 0}

    now = datetime.now(timezone.utc).replace(microsecond=0)
    results: list[dict] = []
    total_new = 0

    for prog in _list_render_programs():
        name = prog["name"]
        service_id = prog["host_service_id"]
        owner_id = _resolve_owner_id(service_id, api_key)
        if not owner_id:
            results.append({"name": name, "error": "owner_id 조회 실패", "fetched": 0, "new_events": 0})
            _upsert_cursor(name, _get_cursor(name), error="owner_id lookup failed")
            continue

        start = _get_cursor(name)
        try:
            logs = _fetch_logs(service_id, owner_id, api_key, start, now)
        except Exception as e:
            results.append({"name": name, "error": str(e)[:300], "fetched": 0, "new_events": 0})
            _upsert_cursor(name, start, error=str(e)[:300])
            continue

        new_events = 0
        latest_ts = start
        for entry in logs:
            ts_str = entry.get("timestamp")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    if ts > latest_ts:
                        latest_ts = ts
                except Exception:
                    pass

            msg = entry.get("message") or ""
            sev = classify(msg)
            if not sev:
                continue
            title = _extract_title(msg, name)
            if _insert_event(name, sev, title, msg, entry):
                new_events += 1

        # 로그가 있었으면 latest_ts까지, 없었으면 now까지 cursor 전진.
        # (지연 도착 로그가 있으면 다음 폴에서 다시 잡히고, 중복은 dedup_key가 막음)
        new_cursor = latest_ts if logs else now
        _upsert_cursor(name, new_cursor, error=None)
        results.append({"name": name, "fetched": len(logs), "new_events": new_events})
        total_new += new_events

    return {"programs": results, "total_new_events": total_new, "polled_at": now.isoformat()}


# 외부 노출
__all__ = ["poll_all", "classify", "make_dedup_key"]
