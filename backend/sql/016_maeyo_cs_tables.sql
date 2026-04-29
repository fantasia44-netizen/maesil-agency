-- 016_maeyo_cs_tables.sql
-- 매요 CS 엔진 중앙화 — 전 시스템 CS 대화/메시지/L2 대본 저장
-- Target: agent_work schema (maesil-agency Supabase)

-- ─────────────────────────────────────────────────────────────────
-- maeyo_conversations: 전 시스템 CS 대화 세션
-- ─────────────────────────────────────────────────────────────────
create table if not exists agent_work.maeyo_conversations (
    id           uuid primary key default gen_random_uuid(),
    program      text not null,        -- 'maesil-insight' | 'maesil-studio' | ...
    operator_id  text,                 -- 회사/운영자 ID (프로그램 내부 UUID)
    user_id      text,                 -- 앱 사용자 ID
    title        text,                 -- 첫 메시지 50자
    status       text not null default 'open',  -- open | resolved | escalated
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists idx_maeyo_conv_program    on agent_work.maeyo_conversations(program);
create index if not exists idx_maeyo_conv_operator   on agent_work.maeyo_conversations(operator_id);
create index if not exists idx_maeyo_conv_updated    on agent_work.maeyo_conversations(updated_at desc);

-- ─────────────────────────────────────────────────────────────────
-- maeyo_messages: CS 메시지 (감정/액션/힌트/레이어/피드백 완전 저장)
-- ─────────────────────────────────────────────────────────────────
create table if not exists agent_work.maeyo_messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references agent_work.maeyo_conversations(id) on delete cascade,
    role            text not null,          -- 'user' | 'assistant'
    content         text not null,
    -- assistant 전용 메타데이터
    emotion         text,                   -- love | thinking | doubt | ...
    action          jsonb,                  -- {label, url} or null
    hint            text,
    layer           text,                   -- 'l2' | 'l3' | 'fallback'
    script_id       text,                   -- 매칭된 L2 스크립트 ID
    tokens_used     int default 0,
    -- 관리자 품질 관리
    feedback        text,                   -- 'good' | 'bad' | null (관리자 평가)
    correction      text,                   -- 관리자가 수정한 올바른 답변
    corrected_by    text,                   -- 수정한 관리자 user_id
    corrected_at    timestamptz,
    created_at      timestamptz not null default now()
);

create index if not exists idx_maeyo_msg_conv      on agent_work.maeyo_messages(conversation_id);
create index if not exists idx_maeyo_msg_feedback  on agent_work.maeyo_messages(feedback) where feedback is not null;
create index if not exists idx_maeyo_msg_layer     on agent_work.maeyo_messages(layer);

-- ─────────────────────────────────────────────────────────────────
-- maeyo_l2_scripts: L2 FAQ 대본 DB화 (코드 배포 없이 수정 가능)
-- ─────────────────────────────────────────────────────────────────
create table if not exists agent_work.maeyo_l2_scripts (
    id          text primary key,                  -- 'Q001', 'Q002', ...
    program     text not null default 'common',    -- 'common' | 'maesil-insight' | ...
    triggers    jsonb not null default '[]',       -- 매칭 트리거 배열
    keywords    jsonb not null default '[]',       -- AND 매칭 키워드 배열
    emotion     text not null default 'thinking',
    message     text not null,
    action      jsonb,                             -- {label, url} or null
    hint        text,
    tts_key     text,
    is_active   boolean not null default true,
    sort_order  int not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_maeyo_l2_program   on agent_work.maeyo_l2_scripts(program, is_active);
create index if not exists idx_maeyo_l2_active     on agent_work.maeyo_l2_scripts(is_active, sort_order);
