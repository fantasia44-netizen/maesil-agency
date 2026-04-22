-- maesil-agency / Phase 1 Day 1
-- Schema: agent_work
-- Purpose: agent workspace — runs, tool calls, audit logs, findings, costs
-- Target DB: autotool (Supabase)

create schema if not exists agent_work;

-- ---------------------------------------------------------------
-- runs: 에이전트 실행 이력 (conversation → task → agent_run 계층)
-- ---------------------------------------------------------------
create table if not exists agent_work.runs (
    id                uuid primary key default gen_random_uuid(),
    conversation_id   uuid,
    task_id           uuid,
    parent_run_id     uuid references agent_work.runs(id),
    agent_type        text not null,        -- 'sales' | 'finance' | 'cs' | 'warehouse' | 'developer' | 'tester' | 'orchestrator'
    model             text,                 -- e.g. 'claude-opus-4-7'
    input_tokens      int default 0,
    output_tokens     int default 0,
    cost_usd          numeric(12,6) default 0,
    status            text not null default 'running',  -- running | success | failed | timeout | cancelled
    error_reason      text,
    started_at        timestamptz not null default now(),
    ended_at          timestamptz,
    meta              jsonb default '{}'::jsonb
);

create index if not exists idx_runs_conversation on agent_work.runs(conversation_id);
create index if not exists idx_runs_task         on agent_work.runs(task_id);
create index if not exists idx_runs_parent       on agent_work.runs(parent_run_id);
create index if not exists idx_runs_agent_type   on agent_work.runs(agent_type);
create index if not exists idx_runs_status       on agent_work.runs(status);
create index if not exists idx_runs_started_at   on agent_work.runs(started_at desc);

-- ---------------------------------------------------------------
-- tool_calls: 도구 호출 1건 단위 로그
-- ---------------------------------------------------------------
create table if not exists agent_work.tool_calls (
    id              uuid primary key default gen_random_uuid(),
    run_id          uuid not null references agent_work.runs(id) on delete cascade,
    tool_name       text not null,                -- e.g. 'run_readonly_sql', 'create_snapshot'
    input_summary   jsonb default '{}'::jsonb,
    output_summary  jsonb default '{}'::jsonb,
    status          text not null default 'ok',   -- ok | error | timeout
    error_message   text,
    latency_ms      int,
    started_at      timestamptz not null default now(),
    ended_at        timestamptz
);

create index if not exists idx_tool_calls_run on agent_work.tool_calls(run_id);
create index if not exists idx_tool_calls_tool on agent_work.tool_calls(tool_name);

-- ---------------------------------------------------------------
-- query_audit: 실행된 SQL 감사 로그
-- ---------------------------------------------------------------
create table if not exists agent_work.query_audit (
    id              uuid primary key default gen_random_uuid(),
    run_id          uuid references agent_work.runs(id) on delete set null,
    db_name         text not null,
    template_key    text,                          -- NULL이면 admin 경로
    params          jsonb default '{}'::jsonb,
    sql_snippet     text,                          -- 로그용 (앞 2kb 정도)
    row_count       int,
    latency_ms      int,
    status          text not null default 'ok',    -- ok | error | timeout | denied
    error_message   text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_query_audit_db on agent_work.query_audit(db_name);
create index if not exists idx_query_audit_template on agent_work.query_audit(template_key);
create index if not exists idx_query_audit_created on agent_work.query_audit(created_at desc);

-- ---------------------------------------------------------------
-- findings: 에이전트가 만든 판단/근거 (공유 메모리 역할)
-- ---------------------------------------------------------------
create table if not exists agent_work.findings (
    id                uuid primary key default gen_random_uuid(),
    run_id            uuid references agent_work.runs(id) on delete set null,
    agent_type        text not null,
    kind              text not null,               -- 'insight' | 'anomaly' | 'improvement' | 'alert'
    title             text not null,
    body              text,
    evidence_refs     jsonb default '[]'::jsonb,   -- [{type, ref_id, note}]
    confidence_score  numeric(3,2),                -- 0.00 ~ 1.00 (운영자 피드백 반영)
    operator_feedback text,                        -- 'good' | 'bad' | NULL (null=미평가)
    created_at        timestamptz not null default now()
);

create index if not exists idx_findings_agent on agent_work.findings(agent_type);
create index if not exists idx_findings_kind on agent_work.findings(kind);
create index if not exists idx_findings_created on agent_work.findings(created_at desc);

-- ---------------------------------------------------------------
-- snapshots: 분석 결과 스냅샷 (sales/finance/...)
-- ---------------------------------------------------------------
create table if not exists agent_work.snapshots (
    id              uuid primary key default gen_random_uuid(),
    agent_type      text not null,
    kind            text not null,                 -- 'today_revenue' | 'channel_breakdown' | ...
    payload         jsonb not null,
    valid_until     timestamptz,                   -- TTL (null=무기한)
    created_at      timestamptz not null default now()
);

create index if not exists idx_snapshots_agent_kind on agent_work.snapshots(agent_type, kind, created_at desc);

-- ---------------------------------------------------------------
-- suggestions: 개선 제안 (cs/warehouse 등)
-- ---------------------------------------------------------------
create table if not exists agent_work.suggestions (
    id              uuid primary key default gen_random_uuid(),
    run_id          uuid references agent_work.runs(id) on delete set null,
    target_area     text not null,                 -- 'cs' | 'inventory' | 'pricing' | ...
    severity        text not null default 'info',  -- 'info' | 'warning' | 'critical'
    title           text not null,
    body            text,
    evidence_refs   jsonb default '[]'::jsonb,
    status          text not null default 'open',  -- 'open' | 'ack' | 'resolved' | 'dismissed'
    resolved_at     timestamptz,
    created_at      timestamptz not null default now()
);

create index if not exists idx_suggestions_area on agent_work.suggestions(target_area);
create index if not exists idx_suggestions_status on agent_work.suggestions(status);

-- ---------------------------------------------------------------
-- handoffs: 에이전트 간 인계
-- ---------------------------------------------------------------
create table if not exists agent_work.handoffs (
    id              uuid primary key default gen_random_uuid(),
    from_agent      text not null,
    to_agent        text not null,
    from_run_id     uuid references agent_work.runs(id) on delete set null,
    context_refs    jsonb default '[]'::jsonb,
    note            text,
    created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- widget_cache: 위젯 결과 캐시 (LLM 비의존 경로)
-- ---------------------------------------------------------------
create table if not exists agent_work.widget_cache (
    widget_key      text primary key,
    payload         jsonb not null,
    computed_at     timestamptz not null default now(),
    valid_until     timestamptz,
    source          text                           -- e.g. 'sql:sales.today_revenue_by_channel'
);

-- ---------------------------------------------------------------
-- widget_logs: 위젯 갱신 기록
-- ---------------------------------------------------------------
create table if not exists agent_work.widget_logs (
    id              uuid primary key default gen_random_uuid(),
    widget_key      text not null,
    status          text not null default 'ok',    -- ok | error | timeout | fallback
    latency_ms      int,
    error_message   text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_widget_logs_widget on agent_work.widget_logs(widget_key, created_at desc);

-- ---------------------------------------------------------------
-- cost_log: 모델별 토큰/비용 (runs를 보조하는 집계용)
-- ---------------------------------------------------------------
create table if not exists agent_work.cost_log (
    id              uuid primary key default gen_random_uuid(),
    run_id          uuid references agent_work.runs(id) on delete cascade,
    model           text not null,
    input_tokens    int default 0,
    output_tokens   int default 0,
    cost_usd        numeric(12,6) default 0,
    created_at      timestamptz not null default now()
);

create index if not exists idx_cost_log_model_created on agent_work.cost_log(model, created_at desc);
