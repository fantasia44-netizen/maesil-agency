-- maesil-agency / Phase 1 Day 1
-- Purpose: service_role 에 agent_work 스키마 읽기/쓰기 권한 부여
-- Run once after 001 + 002.

grant usage on schema agent_work to service_role;
grant all privileges on all tables in schema agent_work to service_role;
grant all privileges on all sequences in schema agent_work to service_role;
grant all privileges on all functions in schema agent_work to service_role;

-- 이후 새 테이블/시퀀스/함수에도 자동 부여
alter default privileges in schema agent_work
    grant all privileges on tables to service_role;
alter default privileges in schema agent_work
    grant all privileges on sequences to service_role;
alter default privileges in schema agent_work
    grant all privileges on functions to service_role;
