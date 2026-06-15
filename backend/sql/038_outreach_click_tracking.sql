-- 콜드 메일 클릭 추적 (오픈톡 링크 클릭 = 핵심 반응 지표)
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS clicked_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

-- 적용 후 PostgREST 스키마 캐시 리로드 권장.
