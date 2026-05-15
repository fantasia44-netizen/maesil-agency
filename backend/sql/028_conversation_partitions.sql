-- 028: conversation_messages 파티션 지원
-- message_type: 'normal' | 'summary'  (요약 파티션 마커)
-- is_archived:  오래된 메시지 중 요약에 흡수된 것 — 에이전트 컨텍스트에서 제외
--
-- 로딩 전략:
--   에이전트  → is_archived=false 메시지 + message_type='summary' (latest 1)
--   UI 전체보기 → is_archived=true 포함 전체 조회 (히스토리 뷰)

ALTER TABLE agent_work.conversation_messages
    ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'normal';

ALTER TABLE agent_work.conversation_messages
    ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- 요약 메시지 빠른 조회 (파티션 경계 탐색)
CREATE INDEX IF NOT EXISTS idx_conv_msgs_summary
    ON agent_work.conversation_messages(conversation_id, created_at DESC)
    WHERE message_type = 'summary';

-- 에이전트 컨텍스트 로딩 (archived 제외)
CREATE INDEX IF NOT EXISTS idx_conv_msgs_active
    ON agent_work.conversation_messages(conversation_id, created_at)
    WHERE is_archived = false;

COMMENT ON COLUMN agent_work.conversation_messages.message_type IS
    'normal: 일반 메시지 | summary: 이전 대화 AI 요약 파티션';
COMMENT ON COLUMN agent_work.conversation_messages.is_archived IS
    'true: 요약에 흡수된 오래된 메시지 — 에이전트 컨텍스트 로딩 시 제외';
