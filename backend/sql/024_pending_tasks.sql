-- 024: pending_tasks — Dev Agent 승인 대기 상태 DB 영속화
-- _pending, _recent_pr 딕셔너리를 프로세스 메모리 대신 DB에 저장.
-- Render 서버 재시작 시 승인 대기 PR 흐름이 유실되는 SPOF 제거.

CREATE TABLE IF NOT EXISTS agent_work.pending_tasks (
    task_id         text PRIMARY KEY,                        -- 'pr:{conv_id}' | 'recent_pr:{conv_id}'
    task_type       text NOT NULL,                           -- 'pr_approval' | 'recent_pr'
    payload         jsonb NOT NULL DEFAULT '{}',             -- 저장 데이터 (pending action / recent PR info)
    status          text NOT NULL DEFAULT 'pending',         -- pending | done | expired
    conversation_id text,                                    -- 소유 대화 ID
    operator_id     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 대화 ID 기반 빠른 조회
CREATE INDEX IF NOT EXISTS idx_pending_tasks_conv
    ON agent_work.pending_tasks(conversation_id, task_type);

-- 만료 정리용 인덱스
CREATE INDEX IF NOT EXISTS idx_pending_tasks_expires
    ON agent_work.pending_tasks(expires_at)
    WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON agent_work.pending_tasks
    TO anon, authenticated, service_role;
