-- 021: maesil-insight program_registry에 github_repo 등록
-- dev-agent가 에러 분석 시 관련 소스 파일을 repo_mirror에서 조회하려면
-- program_registry.github_repo 가 설정되어 있어야 함.

INSERT INTO agent_work.program_registry
    (name, display_name, host_provider, is_active, db_registry_name, github_repo, notes)
VALUES (
    'maesil-insight',
    '매실 인사이트 (Render)',
    'render',
    true,
    'maesil-insight',
    'fantasia44-netizen/maesil-insight',
    '매출/정산 분석 서비스'
)
ON CONFLICT (name) DO UPDATE
    SET github_repo = EXCLUDED.github_repo,
        updated_at  = now();
