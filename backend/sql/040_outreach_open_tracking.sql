-- 이메일 오픈 추적 (1×1 픽셀 방식)
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS opened_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS open_count  INTEGER NOT NULL DEFAULT 0;

-- 적용 후 PostgREST 스키마 캐시 리로드 권장.
