import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alert_channels, alerts, auth_router, chat, cs, health, programs, secrets_router, widgets

logger = logging.getLogger(__name__)


async def _poll_loop():
    """배포 직후 1회 즉시 실행 후 3분 간격 반복."""
    import asyncio
    from app.services import alert_dispatcher, render_logs, repo_mirror
    from app.services import program_health as ph_svc

    # 첫 실행은 즉시 (수집전 문제 방지)
    await asyncio.sleep(10)  # 서버 완전 기동 대기
    cycle = 0
    while True:
        try:
            render_logs.poll_all()
            ph_svc.check_all()          # 헬스 체크 → program_health 기록
            alert_dispatcher.dispatch_pending(limit=100)

            # 레포 미러 동기화 — 매 사이클 실행하되 commit_sha 변동 없으면 1콜만 (스킵)
            try:
                mirror_result = repo_mirror.sync_all_active()
                ok = sum(1 for r in mirror_result.get("repos", []) if not r.get("error"))
                logger.info("[scheduler] repo_mirror sync ok=%d/%d",
                            ok, len(mirror_result.get("repos", [])))
            except Exception as e:
                logger.warning("[scheduler] repo_mirror sync 실패: %s", e)

            cycle += 1
            logger.info("[scheduler] poll cycle %d done", cycle)
        except Exception as e:
            logger.error("[scheduler] poll error: %s", e)
        await asyncio.sleep(180)  # 3분 후 반복


@asynccontextmanager
async def lifespan(application: FastAPI):
    import asyncio
    task = asyncio.create_task(_poll_loop())
    logger.info("[scheduler] 3분 폴링 스케줄러 시작")
    yield
    task.cancel()
    logger.info("[scheduler] 스케줄러 종료")


app = FastAPI(title="maesil-agency", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth_router.router)
app.include_router(secrets_router.router)
app.include_router(widgets.router)
app.include_router(chat.router)
app.include_router(programs.router)
app.include_router(alert_channels.router)
app.include_router(alerts.router)
app.include_router(cs.router)


@app.get("/")
def root() -> dict:
    return {"service": "maesil-agency", "version": app.version}


@app.get("/admin/dev-agent-debug")
def admin_dev_agent_debug(token: str = "", program_name: str = "maesil-sync-worker-1",
                          table_name: str = "naver_ad_sync_log") -> dict:
    """introspector 단독 진단 — 어느 단계에서 막히는지 추적."""
    from app.config import settings
    if token != settings.api_bearer_token:
        from fastapi import HTTPException
        raise HTTPException(403, "forbidden")

    from app.services import db_introspector

    out: dict = {"program_name": program_name, "table_name": table_name}

    # Step 1: DB 매핑
    try:
        db_name = db_introspector.get_program_db_name(program_name)
        out["step1_db_name"] = db_name
    except Exception as e:
        out["step1_error"] = str(e)
        return out

    if not db_name:
        out["error"] = "DB 매핑 실패 (program_registry.db_registry_name 없고 fallback도 매칭 안 됨)"
        return out

    # Step 2: 테이블 스키마 조회
    try:
        schema = db_introspector.get_table_schema(db_name, table_name)
        out["step2_schema_raw"] = schema
    except Exception as e:
        out["step2_error"] = str(e)
        return out

    # Step 3: 마크다운 포맷
    try:
        md = db_introspector.format_schema_markdown(schema) if schema else "(no schema)"
        out["step3_markdown_preview"] = md[:1500]
    except Exception as e:
        out["step3_error"] = str(e)
        return out

    # Step 4: 실제 코드(샘플)에서 테이블 추출
    sample_code = (
        "url, key = _supabase_config()\n"
        "sess.post(f'{url}/rest/v1/naver_ad_sync_log', ...)"
    )
    try:
        out["step4_extracted_tables"] = db_introspector.extract_referenced_tables(sample_code)
    except Exception as e:
        out["step4_error"] = str(e)

    # Step 5: 통합 함수 호출
    try:
        out["step5_full_markdown"] = db_introspector.introspect_for_program(
            program_name, sample_code
        )[:2000]
    except Exception as e:
        out["step5_error"] = str(e)

    return out


@app.post("/admin/repo-mirror/sync")
def admin_repo_mirror_sync(token: str = "", repo: str = "", force: bool = False) -> dict:
    """레포 미러 수동 동기화 (배포 직후 1회 또는 단일 레포 강제 갱신).

    - repo 비우면 전체, 지정시 해당 레포만
    - force=true 면 commit sha 같아도 강제 재다운
    """
    from app.config import settings
    if token != settings.api_bearer_token:
        from fastapi import HTTPException
        raise HTTPException(403, "forbidden")
    from app.services import repo_mirror
    if repo:
        return repo_mirror.sync_repo(repo, force=force)
    return repo_mirror.sync_all_active()


@app.get("/admin/inspect-insight")
def inspect_insight(token: str = "") -> dict:
    """임시: maesil-insight 스키마 탐색 (슈퍼어드민 전용, 작업 후 제거)."""
    from app.config import settings
    if token != settings.api_bearer_token:
        from fastapi import HTTPException
        raise HTTPException(403, "forbidden")
    try:
        from app.db.registry_client import get_db_client
        client = get_db_client("maesil-insight")

        # 테이블 목록
        tables_r = client.rpc("execute_readonly_sql", {
            "query": """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """
        }).execute()

        # operator/user 관련 컬럼
        cols_r = client.rpc("execute_readonly_sql", {
            "query": """
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name ILIKE ANY(ARRAY['%operat%','%user%','%account%','%member%','%company%','%compan%'])
                ORDER BY table_name, ordinal_position
            """
        }).execute()

        return {
            "tables": [r.get("table_name") for r in (tables_r.data or [])],
            "operator_related_columns": cols_r.data or [],
        }
    except Exception as e:
        return {"error": str(e)}
