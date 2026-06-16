-- 039_outreach_touchpoint_body.sql
-- 발송 제목/본문 기록 컬럼 추가 (발송 이력 추적용)

ALTER TABLE agent_work.outreach_touchpoints
    ADD COLUMN IF NOT EXISTS sent_subject TEXT,
    ADD COLUMN IF NOT EXISTS sent_body    TEXT;

COMMENT ON COLUMN agent_work.outreach_touchpoints.sent_subject IS '실제 발송된 이메일 제목';
COMMENT ON COLUMN agent_work.outreach_touchpoints.sent_body    IS '실제 발송된 이메일 본문 HTML';
