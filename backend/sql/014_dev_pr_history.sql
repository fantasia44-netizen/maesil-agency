-- 014_dev_pr_history.sql
-- dev-agent 가 생성한 PR 이력. 새 대화에서도 이전 PR 참조·머지 가능하게.

CREATE TABLE IF NOT EXISTS agent_work.dev_pr_history (
    id              uuid primary key default gen_random_uuid(),
    conversation_id text not null,
    repo            text not null,
    pr_number       int  not null,
    pr_url          text not null,
    pr_title        text,
    base_branch     text,
    head_branch     text,
    file_path       text,
    fn_name         text,
    status          text not null default 'open',  -- open | merged | closed
    created_at      timestamptz not null default now(),
    merged_at       timestamptz,
    UNIQUE (repo, pr_number)
);

CREATE INDEX IF NOT EXISTS dev_pr_history_conv_idx
    ON agent_work.dev_pr_history (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dev_pr_history_repo_pr_idx
    ON agent_work.dev_pr_history (repo, pr_number);

CREATE INDEX IF NOT EXISTS dev_pr_history_open_idx
    ON agent_work.dev_pr_history (status, created_at DESC)
    WHERE status = 'open';

-- 백필 — 이미 만들어진 PR #1, #2 등록
INSERT INTO agent_work.dev_pr_history
    (conversation_id, repo, pr_number, pr_url, pr_title, status)
VALUES
    ('backfill', 'fantasia44-netizen/maesil-insight', 1,
     'https://github.com/fantasia44-netizen/maesil-insight/pull/1',
     '[fix] SyncLog.start — 직접 sess.post → _request_with_retry 교체',
     'open'),
    ('backfill', 'fantasia44-netizen/maesil-insight', 2,
     'https://github.com/fantasia44-netizen/maesil-insight/pull/2',
     'fix(naver_ad): log_sync_finish PostgREST 타입 오류 및 keep-alive 드롭 재시도 누락 수정',
     'open')
ON CONFLICT (repo, pr_number) DO NOTHING;
