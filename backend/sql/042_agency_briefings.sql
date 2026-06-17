-- 영업/창고 에이전시 브리핑 결과 저장
CREATE TABLE IF NOT EXISTS agent_work.agency_briefings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_type TEXT NOT NULL,          -- 'sales' | 'warehouse'
    operator_id TEXT,
    status      TEXT NOT NULL DEFAULT 'ok',   -- 'ok' | 'error' | 'no_data'
    headline    TEXT,                   -- 1줄 요약
    sections    JSONB,                  -- [{title, body, data}]
    alerts      JSONB,                  -- [{level, message}]  warning/critical
    raw_data    JSONB,                  -- 수집된 원본 데이터 스냅샷
    error_msg   TEXT,
    period_from DATE,
    period_to   DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agency_briefings_type_created
    ON agent_work.agency_briefings (agency_type, created_at DESC);
