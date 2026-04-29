-- 015_alert_ack_note.sql
-- PR 머지 자동 확인 처리 시 사유 기록용 컬럼

ALTER TABLE agent_work.alert_events
    ADD COLUMN IF NOT EXISTS acknowledged_note text;
