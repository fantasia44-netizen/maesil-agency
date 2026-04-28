-- maesil-agency 자체 모니터링 등록
-- Supabase SQL Editor에서 실행

INSERT INTO agent_work.program_registry (name, display_name, host_provider, is_active, notes)
VALUES
  ('maesil-agency-backend',  'Agency 백엔드',  'render', true, 'maesil-agency FastAPI 서버 (자체 모니터링)'),
  ('maesil-agency-frontend', 'Agency 프론트',  'render', true, 'maesil-agency Next.js 프론트엔드')
ON CONFLICT (name) DO NOTHING;
