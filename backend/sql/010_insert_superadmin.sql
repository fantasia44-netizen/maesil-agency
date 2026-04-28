-- super_admin 계정 최초 생성
-- Supabase SQL Editor에서 1회 실행 후 이 파일 삭제 권장

INSERT INTO agent_work.users (
    email,
    password_hash,
    role,
    display_name,
    is_active
)
VALUES (
    'support@maesil-insight.com',
    '$2b$12$C5XZ/NLkebvyVgBqIrq2.ezvpIhNkmn5e7mJRHL0o3XK0zW248U1G',
    'super_admin',
    '관리자',
    true
)
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role          = EXCLUDED.role,
        display_name  = EXCLUDED.display_name,
        is_active     = EXCLUDED.is_active,
        updated_at    = now();
