import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alert_channels, alerts, auth_router, chat, cs, growth, health, memory, outreach, programs, secrets_router, widgets

logger = logging.getLogger(__name__)


def _outreach_scanned_today() -> bool:
    """오늘 날짜에 outreach_scanned_content에 기록이 있으면 True (재시작 후 중복 스캔 방지)."""
    from datetime import datetime, timezone
    from app.db.maesil_total_client import get_maesil_total_client
    try:
        today_str = datetime.now(timezone.utc).date().isoformat()
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("outreach_scanned_content")
            .select("content_id")
            .gte("scanned_at", today_str)
            .limit(1)
            .execute()
        )
        return bool(resp.data)
    except Exception:
        return False


async def _poll_loop():
    """배포 직후 1회 즉시 실행 후 3분 간격 반복."""
    import asyncio
    from datetime import datetime, timezone
    from app.services import alert_dispatcher, render_logs, repo_mirror
    from app.services import program_health as ph_svc

    # 첫 실행은 즉시 (수집전 문제 방지)
    await asyncio.sleep(10)  # 서버 완전 기동 대기
    cycle = 0
    last_youtube_scan_date = None
    while True:
        try:
            await asyncio.to_thread(render_logs.poll_all)
            await asyncio.to_thread(ph_svc.check_all)
            await asyncio.to_thread(alert_dispatcher.dispatch_pending, 100)

            # CS 미답변 큐 처리 → feature_docs 자동 생성 (L2.5 축적)
            try:
                from app.services.feature_kb import process_queue as _fkb_queue
                fkb_result = await asyncio.to_thread(_fkb_queue, 5)
                if fkb_result.get("processed"):
                    logger.info("[scheduler] feature_kb queue processed=%d",
                                fkb_result["processed"])
            except Exception as e:
                logger.warning("[scheduler] feature_kb process_queue 실패: %s", e)

            # 레포 미러 동기화 — 매 사이클 실행하되 commit_sha 변동 없으면 1콜만 (스킵)
            try:
                mirror_result = await asyncio.to_thread(repo_mirror.sync_all_active)
                ok = sum(1 for r in mirror_result.get("repos", []) if not r.get("error"))
                logger.info("[scheduler] repo_mirror sync ok=%d/%d",
                            ok, len(mirror_result.get("repos", [])))
            except Exception as e:
                logger.warning("[scheduler] repo_mirror sync 실패: %s", e)

            # 멀티터치 팔로업 — 매 사이클 (3분마다)
            try:
                from app.services.outreach_followup import check_pending_followups
                fu_result = await asyncio.to_thread(check_pending_followups, 10)
                if fu_result.get("processed"):
                    logger.info("[scheduler] followup processed=%d", fu_result["processed"])
            except Exception as e:
                logger.warning("[scheduler] followup 실패: %s", e)

            # 콜드 드립 — 유튜버 콜드 메일 저속 발송 (기본 off, 세팅 후 활성)
            try:
                from app.services.outreach_cold_drip import process_cold_drip
                drip = await asyncio.to_thread(process_cold_drip)
                if drip.get("sent"):
                    logger.info("[scheduler] cold_drip sent → %s (%s/%s)",
                                drip.get("to"), drip.get("sent_today"), drip.get("cap"))
            except Exception as e:
                logger.warning("[scheduler] cold_drip 실패: %s", e)

            # Gmail 회신 감시 — 5사이클마다 (약 15분)
            if settings.enable_gmail_watcher and cycle % 5 == 0:
                try:
                    from app.services.gmail_watcher import watch_replies
                    reply_result = await asyncio.to_thread(watch_replies, 30)
                    if reply_result.get("found_replies"):
                        logger.info("[scheduler] gmail_watcher: 회신 %d건 발견",
                                    reply_result["found_replies"])
                except Exception as e:
                    logger.warning("[scheduler] gmail_watcher 실패: %s", e)

            # 멀티채널 영업 스캔 — 하루 1회
            try:
                today = datetime.now(timezone.utc).date()
                if last_youtube_scan_date != today:
                    if not await asyncio.to_thread(_outreach_scanned_today):
                        from app.services.outreach_pipeline import run_all_platforms
                        scan_result = await asyncio.to_thread(run_all_platforms)
                        logger.info("[scheduler] outreach scan done: leads=%d",
                                    scan_result.get("total_leads_upserted", 0))
                    else:
                        logger.info("[scheduler] outreach scan 오늘 이미 실행됨 — 스킵")
                    last_youtube_scan_date = today
            except Exception as e:
                logger.warning("[scheduler] outreach scan 실패: %s", e)

            cycle += 1
            logger.info("[scheduler] poll cycle %d done", cycle)
        except Exception as e:
            logger.error("[scheduler] poll error: %s", e)
        await asyncio.sleep(180)  # 3분 후 반복


def _warn_insecure_flags() -> None:
    """위험한 운영 플래그가 켜져 있으면 시작 시 경고."""
    import os
    if os.environ.get("CS_ALLOW_UNAUTH", "").lower() in ("1", "true", "yes"):
        logger.warning("⚠️ CS_ALLOW_UNAUTH 활성 — CS 엔드포인트가 무인증입니다. 운영에서 끄세요.")
    if os.environ.get("GROWTH_ALLOW_UNAUTH", "").lower() in ("1", "true", "yes"):
        logger.warning("⚠️ GROWTH_ALLOW_UNAUTH 활성 — Growth 엔드포인트가 무인증입니다. 운영에서 끄세요.")
    if settings.enable_debug_endpoints:
        logger.warning("⚠️ ENABLE_DEBUG_ENDPOINTS 활성 — /admin/* 디버그 엔드포인트가 노출됩니다.")
    if not settings.secrets_enc_key:
        logger.warning("⚠️ SECRETS_ENC_KEY 미설정 — 시크릿이 평문으로 저장됩니다. 설정을 권장합니다.")


@asynccontextmanager
async def lifespan(application: FastAPI):
    import asyncio
    _warn_insecure_flags()
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
app.include_router(growth.router)
app.include_router(outreach.router)
app.include_router(memory.router)


@app.get("/")
def root() -> dict:
    return {"service": "maesil-agency", "version": app.version}


def _require_debug_admin(x_admin_token: str | None) -> None:
    """관리자 디버그 엔드포인트 게이트.

    - ENABLE_DEBUG_ENDPOINTS=1 일 때만 동작(기본 비활성 → 404).
    - 토큰은 쿼리스트링이 아닌 X-Admin-Token 헤더로 전달(로그 노출 방지).
    - 상수시간 비교(hmac.compare_digest).
    """
    if not settings.enable_debug_endpoints:
        raise HTTPException(404, "Not Found")
    token = (x_admin_token or "").strip()
    if not token or not hmac.compare_digest(token, settings.api_bearer_token):
        raise HTTPException(403, "forbidden")


@app.get("/admin/dev-agent-debug")
def admin_dev_agent_debug(program_name: str = "maesil-sync-worker-1",
                          table_name: str = "naver_ad_sync_log",
                          x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> dict:
    """introspector 단독 진단 — 어느 단계에서 막히는지 추적."""
    _require_debug_admin(x_admin_token)

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
def admin_repo_mirror_sync(repo: str = "", force: bool = False,
                           x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> dict:
    """레포 미러 수동 동기화 (배포 직후 1회 또는 단일 레포 강제 갱신).

    - repo 비우면 전체, 지정시 해당 레포만
    - force=true 면 commit sha 같아도 강제 재다운
    """
    _require_debug_admin(x_admin_token)
    from app.services import repo_mirror
    if repo:
        return repo_mirror.sync_repo(repo, force=force)
    return repo_mirror.sync_all_active()


@app.get("/admin/inspect-insight")
def inspect_insight(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> dict:
    """임시: maesil-insight 스키마 탐색 (슈퍼어드민 전용, 작업 후 제거)."""
    _require_debug_admin(x_admin_token)
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


@app.get("/admin/inspect-insight-performance")
def inspect_insight_performance(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> dict:
    """maesil-insight 성과/광고 관련 테이블 전체 컬럼 목록 조회.
    insight_benchmark.py 쿼리 수정 전 실제 스키마 파악용.
    """
    _require_debug_admin(x_admin_token)
    try:
        from app.db.registry_client import get_db_client
        client = get_db_client("maesil-insight")

        # 성과/광고/매출/분석 관련 테이블 + 전체 컬럼
        cols_r = client.rpc("execute_readonly_sql", {
            "query": """
                SELECT
                    c.table_name,
                    c.column_name,
                    c.data_type,
                    c.ordinal_position
                FROM information_schema.columns c
                JOIN information_schema.tables t
                  ON t.table_name = c.table_name
                 AND t.table_schema = c.table_schema
                WHERE c.table_schema = 'public'
                  AND t.table_type = 'BASE TABLE'
                  AND (
                    c.table_name ILIKE ANY(ARRAY[
                      '%ad%','%roas%','%revenue%','%sales%','%profit%',
                      '%performance%','%report%','%stat%','%analytics%',
                      '%naver%','%coupang%','%kakao%','%channel%',
                      '%cost%','%spend%','%margin%','%income%','%sync%'
                    ])
                    OR c.column_name ILIKE ANY(ARRAY[
                      '%roas%','%revenue%','%sales%','%profit%','%margin%',
                      '%ad_cost%','%ad_spend%','%spend%','%cost%',
                      '%impressions%','%clicks%','%orders%','%conversion%'
                    ])
                  )
                ORDER BY c.table_name, c.ordinal_position
            """
        }).execute()

        # 테이블별 row count (규모 파악용)
        import re as _re
        tables = list({r["table_name"] for r in (cols_r.data or [])})
        counts: dict = {}
        for tbl in tables[:15]:  # 최대 15개
            # information_schema에서 가져온 값이지만 방어적으로 식별자 검증
            if not _re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tbl or ""):
                counts[tbl] = "skipped:invalid_ident"
                continue
            try:
                cnt_r = client.rpc("execute_readonly_sql", {
                    "query": f'SELECT COUNT(*) AS n FROM "{tbl}"'
                }).execute()
                counts[tbl] = (cnt_r.data or [{}])[0].get("n", "?")
            except Exception:
                counts[tbl] = "error"

        # 컬럼을 테이블별로 그룹핑
        by_table: dict = {}
        for row in (cols_r.data or []):
            tbl = row["table_name"]
            by_table.setdefault(tbl, []).append({
                "col": row["column_name"],
                "type": row["data_type"],
            })

        return {
            "tables_with_perf_columns": [
                {
                    "table": tbl,
                    "row_count": counts.get(tbl, "?"),
                    "columns": cols,
                }
                for tbl, cols in sorted(by_table.items())
            ]
        }
    except Exception as e:
        return {"error": str(e)}
