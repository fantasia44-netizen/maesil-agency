-- maesil-agency / 대화 이력 저장
-- autotool DB agent_work 스키마에 실행

CREATE TABLE IF NOT EXISTS agent_work.conversations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text,                          -- 첫 사용자 메시지 앞 50자 자동 설정
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_work.conversation_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES agent_work.conversations(id) ON DELETE CASCADE,
    role            text NOT NULL,             -- 'user' | 'agent'
    agent_type      text,                      -- role=agent 일 때
    agent_display   text,
    content         text NOT NULL,
    cost_usd        numeric(12,6) DEFAULT 0,
    run_id          uuid,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON agent_work.conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON agent_work.conversations(updated_at DESC);
