-- maesil-agency / Phase 1 Day 1
-- Registries: db_registry, program_registry, secrets
-- Target DB: autotool (Supabase)

-- ---------------------------------------------------------------
-- db_registry: 연결 대상 Supabase 프로젝트 목록
-- ---------------------------------------------------------------
create table if not exists agent_work.db_registry (
    id              uuid primary key default gen_random_uuid(),
    name            text not null unique,           -- 'autotool' | 'maesil-insight' | ...
    display_name    text,
    supabase_url    text not null,
    api_key_ref     text,                           -- agent_work.secrets.name 참조
    schema_hint     jsonb default '{}'::jsonb,      -- 운영자 승인본
    schema_draft    jsonb default '{}'::jsonb,      -- LLM introspection 초안 (미승인)
    approved_at     timestamptz,
    approved_by     text,
    is_active       boolean not null default true,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- program_registry: Render 등 외부 호스팅된 프로그램 목록
-- ---------------------------------------------------------------
create table if not exists agent_work.program_registry (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null unique,           -- 'autotool' | 'maesil-insight' | ...
    display_name        text,
    host_provider       text,                           -- 'render' | 'vercel' | 'self' | ...
    host_service_id     text,                           -- Render service id 등
    host_api_key_ref    text,                           -- agent_work.secrets.name 참조 (예: 'render_api')
    health_url          text,                           -- 직접 ping 가능한 /health 엔드포인트 (옵션)
    db_registry_name    text references agent_work.db_registry(name) on delete set null,
    is_active           boolean not null default true,
    notes               text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- secrets: DB에 저장되는 API 키/토큰 (Phase 1: 평문 + RLS로 보호)
-- ---------------------------------------------------------------
create table if not exists agent_work.secrets (
    id              uuid primary key default gen_random_uuid(),
    name            text not null unique,           -- 'render_api' | 'm_insight_service_role' | ...
    kind            text not null,                  -- 'render' | 'supabase' | 'anthropic' | 'openai' | 'other'
    value           text not null,                  -- Phase 1 평문, Phase 2 암호화
    key_version     int not null default 1,
    last_used_at    timestamptz,
    last_tested_at  timestamptz,
    last_test_ok    boolean,
    last_test_error text,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_secrets_kind on agent_work.secrets(kind);

-- ---------------------------------------------------------------
-- program_health: 주기 조회한 서버/DB 상태 스냅샷
-- ---------------------------------------------------------------
create table if not exists agent_work.program_health (
    id              uuid primary key default gen_random_uuid(),
    program_name    text not null references agent_work.program_registry(name) on delete cascade,
    server_status   text,                           -- 'up' | 'down' | 'degraded' | 'unknown'
    db_status       text,                           -- 'up' | 'down' | 'unknown'
    response_time_ms int,
    error_count_1h  int default 0,
    traffic_1h      int default 0,                  -- 요청 수 등
    raw             jsonb default '{}'::jsonb,      -- 원본 응답
    checked_at      timestamptz not null default now()
);

create index if not exists idx_program_health_program_checked on agent_work.program_health(program_name, checked_at desc);

-- ---------------------------------------------------------------
-- query_templates: 허용된 쿼리 템플릿 (Phase 1은 YAML 우선, 이 테이블은 향후 전환용)
-- ---------------------------------------------------------------
create table if not exists agent_work.query_templates (
    id                  uuid primary key default gen_random_uuid(),
    key                 text not null unique,       -- 'sales.today_revenue_by_channel'
    db_name             text not null,              -- 'autotool' | 'maesil-insight'
    sql                 text not null,
    params              jsonb default '[]'::jsonb,
    allowed_agents      jsonb default '[]'::jsonb,  -- ["sales", "finance"]
    description         text,
    approved            boolean not null default false,
    approved_by         text,
    approved_at         timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 초기 시드 (autotool 자기 자신 등록)
-- ---------------------------------------------------------------
insert into agent_work.db_registry (name, display_name, supabase_url, is_active, notes)
values
  ('autotool', '자사 통합 운영(autotool)', 'https://pbocckpuiyzijspqpvqz.supabase.co', true, '에이전트 작업 허브 / agent_work 스키마 호스트'),
  ('maesil-insight', '매실 인사이트', '', true, '온라인 매출/광고/CS 분석 (URL은 /settings에서 등록)')
on conflict (name) do nothing;

insert into agent_work.program_registry (name, display_name, host_provider, is_active, db_registry_name, notes)
values
  ('autotool', 'autotool (Render)', 'render', true, 'autotool', 'Render 서비스 ID는 /settings에서 등록'),
  ('maesil-insight', 'maesil-insight (Render)', 'render', true, 'maesil-insight', 'Render 서비스 ID는 /settings에서 등록')
on conflict (name) do nothing;
