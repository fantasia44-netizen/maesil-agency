-- maesil-agency / Phase 3
-- maesil-insight DB 레지스트리 등록
-- /settings에서 URL과 service_role 키를 등록한 후 이 SQL 실행

-- db_registry에 api_key_ref 설정
UPDATE agent_work.db_registry
SET
    api_key_ref = 'm_insight_service_role',
    updated_at  = now()
WHERE name = 'maesil-insight';

-- maesil-insight 서비스 URL을 secrets에 등록하는 예시 (실제 값은 /settings에서 입력)
-- INSERT INTO agent_work.secrets (name, kind, value)
-- VALUES ('m_insight_service_role', 'supabase', 'YOUR_SERVICE_ROLE_KEY')
-- ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
