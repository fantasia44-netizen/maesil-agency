"""
ratelimit.py — 경량 인메모리 레이트리밋 + 신뢰 가능한 클라이언트 IP 추출.

목적(글로벌 노출 대응):
- 공개/미인증 엔드포인트(/meta, /track, 가입, 비번재설정) 남용 완화.
- 로그인 잠금 등에서 `X-Forwarded-For` 최좌측(클라 조작 가능) 대신 신뢰 헤더 사용.

한계(의도적):
- 워커별 인메모리라 다중 워커에서 정확한 전역 제한은 아님(방어심층 1차선).
  진짜 방어선은 Cloudflare 레이트리밋 룰/Turnstile. 여기선 최소 방어.
"""
from __future__ import annotations

import time
import threading
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    """신뢰 가능한 클라이언트 IP.
    Cloudflare 뒤에서는 CF-Connecting-IP가 실제 원 IP(위조 불가 — CF가 덮어씀).
    최좌측 X-Forwarded-For는 클라이언트가 조작 가능하므로 신뢰하지 않는다.
    우선순위: CF-Connecting-IP → True-Client-IP → X-Real-IP → socket peer.
    """
    h = request.headers
    for name in ("cf-connecting-ip", "true-client-ip", "x-real-ip"):
        v = h.get(name)
        if v and v.strip():
            return v.strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, bucket: str, limit: int, window: int) -> None:
    """고정 슬라이딩 윈도우 레이트리밋. 초과 시 429.
    key = bucket|client_ip. window초 동안 limit회 허용.
    """
    ip = client_ip(request)
    key = f"{bucket}|{ip}"
    now = time.time()
    cutoff = now - window
    with _lock:
        dq = _hits[key]
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= limit:
            retry = int(dq[0] + window - now) + 1
            raise HTTPException(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
                                headers={"Retry-After": str(max(1, retry))})
        dq.append(now)
        # 메모리 누수 방지: 비어있는 오래된 키 정리(가끔)
        if len(_hits) > 20000:
            for k in [k for k, d in list(_hits.items()) if not d or d[-1] < cutoff]:
                _hits.pop(k, None)
