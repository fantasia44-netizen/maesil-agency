"""TenantContext — 요청/스케줄러 단위로 해석되는 테넌트 식별.

멀티테넌트 격리의 단일 소스. 모든 outreach 서비스는 명시적 tenant_id를 받는다
(암묵적 전역 금지 — 스케줄러가 한 프로세스에서 여러 테넌트를 돌기 때문).

- HTTP: auth.require_tenant 디펜던시가 JWT/유저에서 해석해 주입.
- 스케줄러: _poll_loop가 활성 테넌트를 순회하며 tenant_id를 명시 전달.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    plan: str | None = None
    status: str | None = None
