-- 032_outreach_v4_patch.sql
-- outreach_leads 누락 컬럼 추가 (031 이후)

ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS partnership_fit_reason TEXT,
    ADD COLUMN IF NOT EXISTS last_touch_channel TEXT;

-- gmail_watcher에서 사용하는 인덱스 (emailed + reply 없는 리드 빠른 조회)
CREATE INDEX IF NOT EXISTS outreach_leads_reply_watch_idx
    ON agent_work.outreach_leads (status, reply_type, emailed_at)
    WHERE status = 'emailed' AND reply_type IS NULL;

COMMENT ON COLUMN agent_work.outreach_leads.partnership_fit_reason IS 'Haiku 심층분석 파트너십 적합 이유';
COMMENT ON COLUMN agent_work.outreach_leads.last_touch_channel IS '마지막 접촉 채널';
