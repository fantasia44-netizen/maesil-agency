"""
program_registry CRUD — settings 페이지에서 감시 대상 프로그램 등록/수정.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_bearer
from app.db.maesil_total_client import get_maesil_total_client

router = APIRouter(prefix="/api/programs", tags=["programs"], dependencies=[Depends(require_bearer)])

ALLOWED_PROVIDERS = {"render", "vercel", "self", "other"}


def _table():
    return get_maesil_total_client().schema("agent_work").table("program_registry")


class ProgramIn(BaseModel):
    name: str
    display_name: str | None = None
    host_provider: str | None = None       # 'render' | 'vercel' | 'self' | 'other'
    host_service_id: str | None = None     # Render srv-xxx 등
    health_url: str | None = None          # /health 엔드포인트
    notes: str | None = None
    is_active: bool = True


class ProgramPatch(BaseModel):
    display_name: str | None = None
    host_provider: str | None = None
    host_service_id: str | None = None
    health_url: str | None = None
    github_repo: str | None = None   # 예: "fantasia44-netizen/maesil-total"
    notes: str | None = None
    is_active: bool | None = None


@router.get("")
def list_programs() -> list[dict]:
    resp = _table().select("*").order("name").execute()
    return resp.data or []


@router.post("")
def create_program(body: ProgramIn) -> dict:
    if not body.name.strip():
        raise HTTPException(400, detail="name 필수")
    if body.host_provider and body.host_provider not in ALLOWED_PROVIDERS:
        raise HTTPException(400, detail=f"host_provider는 {sorted(ALLOWED_PROVIDERS)} 중 하나")

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "name": body.name.strip(),
        "display_name": (body.display_name or "").strip() or body.name.strip(),
        "host_provider": body.host_provider or None,
        "host_service_id": (body.host_service_id or "").strip() or None,
        "health_url": (body.health_url or "").strip() or None,
        "notes": body.notes,
        "is_active": body.is_active,
        "updated_at": now,
    }
    resp = _table().insert(payload).execute()
    rows = resp.data or []
    return rows[0] if rows else {"ok": True}


@router.patch("/{name}")
def update_program(name: str, body: ProgramPatch) -> dict:
    update: dict = {}
    if body.display_name is not None:
        update["display_name"] = body.display_name.strip() or None
    if body.host_provider is not None:
        if body.host_provider and body.host_provider not in ALLOWED_PROVIDERS:
            raise HTTPException(400, detail=f"host_provider는 {sorted(ALLOWED_PROVIDERS)} 중 하나")
        update["host_provider"] = body.host_provider or None
    if body.host_service_id is not None:
        update["host_service_id"] = body.host_service_id.strip() or None
    if body.health_url is not None:
        update["health_url"] = body.health_url.strip() or None
    if body.github_repo is not None:
        update["github_repo"] = body.github_repo.strip() or None
    if body.notes is not None:
        update["notes"] = body.notes
    if body.is_active is not None:
        update["is_active"] = body.is_active

    if not update:
        return {"ok": True, "noop": True}

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = _table().update(update).eq("name", name).execute()
    rows = resp.data or []
    if not rows:
        raise HTTPException(404, detail="program not found")
    return rows[0]


@router.get("/{name}/test-github")
def test_github_access(name: str) -> dict:
    """GitHub 레포 접근 진단: 브랜치 조회 + 루트 디렉터리 목록 반환.
    dev agent 파일 탐색 실패 원인 파악용."""
    from app.services import github_client

    rows = _table().select("name, github_repo").eq("name", name).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, detail="program not found")
    repo = rows[0].get("github_repo")
    if not repo:
        return {"ok": False, "error": "github_repo 미설정", "name": name}

    result: dict = {"name": name, "repo": repo, "ok": True}
    try:
        branch = github_client.get_default_branch(repo)
        result["branch"] = branch
    except Exception as e:
        result["ok"] = False
        result["error"] = f"get_default_branch 실패: {e}"
        return result

    try:
        entries = github_client.list_dir_entries(repo, "", branch)
        result["root_dirs"] = [e["path"] for e in entries if e["type"] == "dir"]
        result["root_py_files"] = [e["path"] for e in entries if e["type"] == "file" and e["path"].endswith(".py")]
        result["root_total_files"] = len([e for e in entries if e["type"] == "file"])
    except Exception as e:
        result["ok"] = False
        result["error"] = f"list_dir_entries 실패: {e}"
        return result

    return result


@router.post("/{name}/test")
def test_program(name: str) -> dict:
    """헬스 URL ping + Render API 상태 조회.
    - health_url 있으면 → GET 요청 → 응답코드/시간 반환
    - host_service_id 있으면 → Render API로 서비스 상태 조회
    """
    import time
    import httpx
    from app.services.secrets import get_secret

    rows = _table().select("*").eq("name", name).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, detail="program not found")
    prog = rows[0]

    results: dict = {"name": name, "ok": True, "checks": []}

    # 1) health_url ping
    health_url = prog.get("health_url")
    if health_url:
        try:
            t0 = time.monotonic()
            r = httpx.get(health_url, timeout=10, follow_redirects=True)
            ms = int((time.monotonic() - t0) * 1000)
            ok = r.status_code < 400
            results["checks"].append({
                "kind": "health_url",
                "url": health_url,
                "status_code": r.status_code,
                "response_ms": ms,
                "ok": ok,
            })
            if not ok:
                results["ok"] = False
        except Exception as e:
            results["checks"].append({"kind": "health_url", "url": health_url, "ok": False, "error": str(e)})
            results["ok"] = False

    # 2) Render API 서비스 상태 조회
    service_id = prog.get("host_service_id")
    if service_id and prog.get("host_provider") == "render":
        api_key = get_secret("render_api")
        if api_key:
            try:
                r = httpx.get(
                    f"https://api.render.com/v1/services/{service_id}",
                    headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                    timeout=10,
                )
                if r.status_code == 200:
                    data = r.json()
                    results["checks"].append({
                        "kind": "render_api",
                        "service_id": service_id,
                        "ok": True,
                        "service_name": data.get("name"),
                        "state": data.get("suspended", "active"),
                        "type": data.get("type"),
                    })
                else:
                    results["checks"].append({
                        "kind": "render_api",
                        "service_id": service_id,
                        "ok": False,
                        "error": f"HTTP {r.status_code}: {r.text[:200]}",
                    })
                    results["ok"] = False
            except Exception as e:
                results["checks"].append({"kind": "render_api", "service_id": service_id, "ok": False, "error": str(e)})
                results["ok"] = False
        else:
            results["checks"].append({"kind": "render_api", "ok": False, "error": "render_api 시크릿 미설정"})

    if not results["checks"]:
        results["ok"] = False
        results["note"] = "health_url 또는 host_service_id(render) 중 하나 이상 등록 필요"

    return results
