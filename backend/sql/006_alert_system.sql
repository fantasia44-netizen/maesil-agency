-- maesil-agency / Phase A
-- Alert system: 감시 채널 등록 + 발송 이벤트 + Render 로그 폴링 커서
-- Target DB: autotool (Supabase) — agent_work 스키마

-- ---------------------------------------------------------------
-- alert_channels: 알림 수신 채널 (email / widget / 향후 slack 등)
-- ---------------------------------------------------------------
create table if not exists agent_work.alert_channels (
    id              uuid primary key default gen_random_uuid(),
    kind            text not null,                  -- 'email' | 'widget' | (future: 'slack' | 'webhook')
    target          text,                           -- email 주소 등. widget이면 NULL 허용
    label           text,                           -- UI 표시용
    severity_min    text not null default 'error',  -- 'info' | 'warning' | 'error' | 'critical'
    is_active       boolean not null default true,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_alert_channels_active on agent_work.alert_channels(is_active);
create index if not exists idx_alert_channels_kind on agent_work.alert_channels(kind);

-- ---------------------------------------------------------------
-- alert_events: 감지된 알림 이벤트 (발송 여부 무관)
-- ---------------------------------------------------------------
create table if not exists agent_work.alert_events (
    id              uuid primary key default gen_random_uuid(),
    program_name    text references agent_work.program_registry(name) on delete set null,
    severity        text not null default 'error',  -- 'info' | 'warning' | 'error' | 'critical'
    source          text,                           -- 'render-logs' | 'health-check' | 'user-error' | ...
    title           text not null,                  -- 한 줄 요약
    message         text,                           -- 본문 / 원문 로그
    dedup_key       text,                           -- 같은 키는 중복 발송 방지 (예: program:hash(message))
    raw             jsonb default '{}'::jsonb,      -- 원본 로그 항목
    sent_channels   jsonb default '[]'::jsonb,      -- [{channel_id, kind, sent_at, ok, error}]
    acknowledged_at timestamptz,                    -- 위젯에서 확인 처리한 시각
    acknowledged_by text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_alert_events_program on agent_work.alert_events(program_name, created_at desc);
create index if not exists idx_alert_events_severity on agent_work.alert_events(severity, created_at desc);
create index if not exists idx_alert_events_unack on agent_work.alert_events(acknowledged_at) where acknowledged_at is null;
create unique index if not exists uniq_alert_events_dedup
    on agent_work.alert_events(dedup_key)
    where dedup_key is not null;

-- ---------------------------------------------------------------
-- program_log_cursor: Render 로그 폴링 시 마지막 처리 시점 추적
-- ---------------------------------------------------------------
create table if not exists agent_work.program_log_cursor (
    program_name    text primary key references agent_work.program_registry(name) on delete cascade,
    last_seen_at    timestamptz not null default (now() - interval '5 minutes'),
    last_polled_at  timestamptz not null default now(),
    last_error      text,                            -- 마지막 폴링 실패 사유
    updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 권한 부여 (003_grants.sql 의 default privileges가 적용되지만 명시적으로 한 번 더)
-- ---------------------------------------------------------------
grant all privileges on agent_work.alert_channels    to service_role;
grant all privileges on agent_work.alert_events      to service_role;
grant all privileges on agent_work.program_log_cursor to service_role;
