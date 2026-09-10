-- TCG Note(tcgnote.net) 자체 트래픽·도구사용 계측 테이블.
-- gbl_visits와 동일 구조(사이트 분리) — gbl 광고/통계가 tcg로 안 섞이게 별도 테이블.
-- 집계는 백엔드(app/routers/tcg.py)에서 Python으로 수행 → RPC 함수 불필요(테이블 하나만).
-- ⚠️ 반드시 maesil-HUB 프로젝트에서 실행(gbl_visits가 있는 그 프로젝트).
--    백엔드 _db()가 hub_configured면 maesil-hub(public)를 봄 — maesil-total에 만들면 백엔드가 못 찾아 insert가 조용히 실패함.
--    헷갈리면: `SELECT count(*) FROM public.gbl_visits;`가 에러 없이 도는 프로젝트 = maesil-hub.
CREATE TABLE IF NOT EXISTS public.tcg_visits (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    day        date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
    -- pageview | share | download | sim_run | pack_open | deck_build | counter_search
    event      text NOT NULL DEFAULT 'pageview',
    visitor    text,   -- 익명 방문자 토큰(localStorage). PII 아님.
    session    text,   -- 익명 세션 토큰(sessionStorage)
    path       text,   -- 경로(로케일 프리픽스로 언어 판별)
    ref        text,   -- 유입 referrer 호스트
    label      text,   -- 이벤트 상세(share 유형·팩 오픈 수·덱 id 등)
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tcg_visits_day    ON public.tcg_visits (day);
CREATE INDEX IF NOT EXISTS idx_tcg_visits_recent ON public.tcg_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_tcg_visits_event  ON public.tcg_visits (event);

ALTER TABLE public.tcg_visits ENABLE ROW LEVEL SECURITY;  -- 서비스 롤만(외부 직접접근 차단)
