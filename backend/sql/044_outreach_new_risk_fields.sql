-- 새 리스크 신호 필드 추가 (scorer v2)
-- 구 필드(sells_competing_tool, is_competitor_partner, has_negative_tool_content)는 유지(하위 호환)

ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS promotes_other_program  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_program_company       BOOLEAN DEFAULT FALSE;
