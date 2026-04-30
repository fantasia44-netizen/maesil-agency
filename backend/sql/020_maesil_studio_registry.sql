-- 020: maesil-studio 레지스트리 등록 + 레포 미러 연결

INSERT INTO agent_work.db_registry (name, display_name, supabase_url, is_active, notes)
VALUES ('maesil-studio', '매실 스튜디오', '', true, 'YouTube/콘텐츠 크리에이터 분석 (URL은 /settings에서 등록)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_work.program_registry
    (name, display_name, host_provider, is_active, db_registry_name, github_repo, notes)
VALUES (
    'maesil-studio',
    '매실 스튜디오 (Render)',
    'render',
    true,
    'maesil-studio',
    'fantasia44-netizen/maesil-studio',
    '유튜브 스튜디오 API 연동 서비스'
)
ON CONFLICT (name) DO UPDATE
    SET github_repo      = EXCLUDED.github_repo,
        db_registry_name = EXCLUDED.db_registry_name,
        display_name     = EXCLUDED.display_name,
        updated_at       = now();
