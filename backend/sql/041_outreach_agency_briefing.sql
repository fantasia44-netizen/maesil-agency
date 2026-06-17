-- 광고대행사 AI 브리핑 결과 저장
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS agency_briefing JSONB;

-- 적용 후 PostgREST 스키마 캐시 리로드 권장.
