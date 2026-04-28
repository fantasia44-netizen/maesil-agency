-- maesil-agency / Phase B
-- program_registry에 github_repo 컬럼 추가

alter table agent_work.program_registry
    add column if not exists github_repo text;   -- 예: 'fantasia44-netizen/maesil-total'

comment on column agent_work.program_registry.github_repo
    is 'GitHub 레포 경로 (owner/repo) — 코드 읽기/PR 생성에 사용';
