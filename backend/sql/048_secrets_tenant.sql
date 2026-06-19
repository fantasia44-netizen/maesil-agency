-- maesil-agency / 멀티테넌트 SaaS — Phase 3A: secrets 테넌트별 (전역 fallback 유지)
-- 실행 위치: maesil-total Supabase → SQL Editor
-- 기존 행 tenant_id=NULL = 전역(super_admin/fallback). 값 마이그레이션 0건.
-- ⚠️ Phase 3A 코드(get_tenant_secret + 수정된 upsert_secret)와 함께 배포.
--    (이 마이그가 name UNIQUE를 제거하므로, 구 upsert_secret의 on_conflict="name"이 깨짐)

-- 1) tenant_id 컬럼 (nullable = 전역)
ALTER TABLE agent_work.secrets ADD COLUMN IF NOT EXISTS tenant_id uuid;

COMMENT ON COLUMN agent_work.secrets.tenant_id IS '소속 테넌트(tenants.id). NULL=전역(fallback)';

-- 2) 기존 (name) 단일 유니크 제거 → 테넌트가 같은 name을 자기 것으로 가질 수 있게
--    (제약 이름은 환경마다 다를 수 있어 둘 다 시도)
ALTER TABLE agent_work.secrets DROP CONSTRAINT IF EXISTS secrets_name_key;
DROP INDEX IF EXISTS agent_work.secrets_name_key;

-- 3) 테넌트 행 유니크 (tenant_id, name) — NULL tenant는 여기서 dedup 안 됨(아래 partial로 처리)
DO $$ BEGIN
  ALTER TABLE agent_work.secrets ADD CONSTRAINT secrets_tenant_name_key UNIQUE (tenant_id, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) 전역(tenant_id IS NULL) name 유니크 — partial index
CREATE UNIQUE INDEX IF NOT EXISTS secrets_global_name_uniq
  ON agent_work.secrets (name) WHERE tenant_id IS NULL;

-- 5) 조회 인덱스
CREATE INDEX IF NOT EXISTS secrets_tenant_idx ON agent_work.secrets (tenant_id, name);

NOTIFY pgrst, 'reload schema';

-- 검증(수동): 기존 시크릿은 전부 tenant_id NULL = 전역
--   SELECT count(*) FROM agent_work.secrets WHERE tenant_id IS NOT NULL;  -- 0 (아직 테넌트별 없음)
