"""
Settings 페이지에서 시스템 키를 등록/조회/테스트하는 API.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services import secrets as secrets_svc
from app.auth import require_bearer

router = APIRouter(prefix="/api/secrets", tags=["secrets"], dependencies=[Depends(require_bearer)])


class SecretUpsert(BaseModel):
    name: str
    value: str
    kind: str
    notes: str | None = None


@router.get("")
def list_secrets() -> list[dict]:
    return secrets_svc.list_secrets_masked()


@router.put("")
def upsert_secret(body: SecretUpsert) -> dict:
    if not body.name or not body.value or not body.kind:
        raise HTTPException(status_code=400, detail="name, value, kind are required")
    secrets_svc.upsert_secret(body.name, body.value, body.kind, body.notes)

    # maesil-insight service role 키 등록 시 db_registry api_key_ref 자동 연결
    if body.name == "m_insight_service_role":
        try:
            from app.db.maesil_total_client import get_maesil_total_client
            get_maesil_total_client().schema("agent_work").table("db_registry").update({
                "api_key_ref": "m_insight_service_role",
            }).eq("name", "maesil-insight").execute()
        except Exception:
            pass

    # maesil-insight Supabase URL이 등록되면 db_registry에도 동기화
    if body.name == "maesil_insight_supabase_url":
        try:
            from app.db.maesil_total_client import get_maesil_total_client
            get_maesil_total_client().schema("agent_work").table("db_registry").update({
                "supabase_url": body.value,
            }).eq("name", "maesil-insight").execute()
        except Exception:
            pass

    return {"ok": True}


@router.post("/{name}/test")
def test_secret(name: str) -> dict:
    value = secrets_svc.get_secret(name)
    if value is None:
        raise HTTPException(status_code=404, detail="secret not found")

    if name == "github_token":
        return _test_github_token(name, value)

    if name in ("maesil_insight_supabase_url", "maesil_total_supabase_url"):
        return _test_supabase_url(name, value)

    if name in ("m_insight_service_role", "MAESIL_TOTAL_SERVICE_ROLE_KEY"):
        return _test_supabase_key(name, value)

    if name == "anthropic_api_key":
        return _test_anthropic_key(name, value)

    if name == "agency_growth_token":
        return _test_growth_token(name, value)

    if name == "maesil_agency_url":
        return _test_supabase_url(name, value)  # HTTP 핑 재사용

    # 나머지 — 저장 여부만 확인
    secrets_svc.mark_tested(name, ok=True, error=None)
    return {"ok": True, "note": "값 저장 확인 (연결 테스트 미지원 항목)"}


def _test_github_token(name: str, token: str) -> dict:
    import httpx
    try:
        r = httpx.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=10,
        )
        if r.status_code == 200:
            login = r.json().get("login", "?")
            secrets_svc.mark_tested(name, ok=True, error=None)
            return {"ok": True, "note": f"GitHub 연결 성공 — @{login}"}
        secrets_svc.mark_tested(name, ok=False, error=f"HTTP {r.status_code}")
        raise HTTPException(status_code=400, detail=f"GitHub API 오류: HTTP {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        secrets_svc.mark_tested(name, ok=False, error=str(e)[:200])
        raise HTTPException(status_code=400, detail=f"GitHub 연결 실패: {e}")


def _test_supabase_url(name: str, url: str) -> dict:
    import httpx
    try:
        r = httpx.get(f"{url.rstrip('/')}/rest/v1/", timeout=8)
        ok = r.status_code in (200, 400, 401)  # 인증 없어도 엔드포인트가 살아있으면 OK
        if ok:
            secrets_svc.mark_tested(name, ok=True, error=None)
            return {"ok": True, "note": "Supabase URL 응답 확인"}
        secrets_svc.mark_tested(name, ok=False, error=f"HTTP {r.status_code}")
        raise HTTPException(status_code=400, detail=f"Supabase URL 응답 오류: HTTP {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        secrets_svc.mark_tested(name, ok=False, error=str(e)[:200])
        raise HTTPException(status_code=400, detail=f"Supabase URL 연결 실패: {e}")


def _test_supabase_key(name: str, key: str) -> dict:
    """서비스 롤 키는 URL 없이 단독 검증 불가 — 저장 여부만 확인."""
    secrets_svc.mark_tested(name, ok=True, error=None)
    return {"ok": True, "note": "키 저장 확인 (URL과 함께 사용 시 실제 연결 검증됨)"}


def _test_growth_token(name: str, value: str) -> dict:
    """GROWTH_INTERNAL_TOKEN과 일치 여부 확인."""
    import hmac
    import os
    env_token = os.environ.get("GROWTH_INTERNAL_TOKEN", "").strip()
    if not env_token:
        secrets_svc.mark_tested(name, ok=True, error=None)
        return {"ok": True, "note": "저장 확인 (서버 환경변수 GROWTH_INTERNAL_TOKEN 미설정 — Render에 등록 필요)"}
    if hmac.compare_digest(value.strip(), env_token):
        secrets_svc.mark_tested(name, ok=True, error=None)
        return {"ok": True, "note": "Growth Token 일치 확인"}
    secrets_svc.mark_tested(name, ok=False, error="token mismatch")
    raise HTTPException(status_code=400, detail="agency_growth_token이 서버 GROWTH_INTERNAL_TOKEN과 일치하지 않습니다.")


def _test_anthropic_key(name: str, key: str) -> dict:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
        secrets_svc.mark_tested(name, ok=True, error=None)
        return {"ok": True, "note": "Anthropic API 연결 성공"}
    except Exception as e:
        err = str(e)[:200]
        secrets_svc.mark_tested(name, ok=False, error=err)
        raise HTTPException(status_code=400, detail=f"Anthropic API 오류: {err}")
