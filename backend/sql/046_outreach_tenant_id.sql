-- maesil-agency / 멀티테넌트 SaaS — Phase 1: outreach 테이블 tenant_id + 테넌트별 dedup
-- 실행 위치: maesil-total Supabase → SQL Editor
-- ⚠️ 실행 전 DB 백업/스냅샷 필수. sql/045_tenants.sql 선행 필수.
-- ⚠️ 이 마이그레이션은 Phase 2 백엔드 코드(on_conflict tenant 변경)와 함께 배포해야 함.

-- 0) 가드: 기본 테넌트 존재 확인 (045 미실행 시 즉시 실패)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM agent_work.tenants) THEN
    RAISE EXCEPTION '기본 테넌트가 없습니다. sql/045_tenants.sql 을 먼저 실행하세요.';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 1) nullable tenant_id 컬럼 추가 (즉시·안전)
-- ---------------------------------------------------------------
ALTER TABLE agent_work.outreach_leads            ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE agent_work.outreach_touchpoints      ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE agent_work.outreach_scanned_content  ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE agent_work.outreach_suppression      ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE agent_work.snapshots                 ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- ---------------------------------------------------------------
-- 2) 기본 테넌트로 백필
-- ---------------------------------------------------------------
UPDATE agent_work.outreach_leads
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL;

-- touchpoints 는 소속 리드에서 파생, 없으면 기본 테넌트
UPDATE agent_work.outreach_touchpoints t
SET    tenant_id = l.tenant_id
FROM   agent_work.outreach_leads l
WHERE  t.lead_id = l.id AND t.tenant_id IS NULL;

UPDATE agent_work.outreach_touchpoints
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL;

UPDATE agent_work.outreach_scanned_content
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL;

UPDATE agent_work.outreach_suppression
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL;

-- snapshots: 영업 종류만 기본 테넌트로 (invite 등 다른 종류는 NULL 유지)
UPDATE agent_work.snapshots
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL
  AND  kind IN ('outreach_targets', 'proposal_draft');

-- ---------------------------------------------------------------
-- 3) NOT NULL + FK (백필 후) — leads/touchpoints/scanned_content/suppression
--    (snapshots 는 혼합 용도라 nullable 유지)
-- ---------------------------------------------------------------
ALTER TABLE agent_work.outreach_leads           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agent_work.outreach_touchpoints     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agent_work.outreach_scanned_content ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agent_work.outreach_suppression     ALTER COLUMN tenant_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE agent_work.outreach_leads ADD CONSTRAINT outreach_leads_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES agent_work.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE agent_work.outreach_touchpoints ADD CONSTRAINT outreach_touchpoints_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES agent_work.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE agent_work.outreach_scanned_content ADD CONSTRAINT outreach_scanned_content_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES agent_work.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE agent_work.outreach_suppression ADD CONSTRAINT outreach_suppression_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES agent_work.tenants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------
-- 4) 테넌트별 유니크/dedup 전환 (핵심 격리 변경)
-- ---------------------------------------------------------------
-- leads: (platform,platform_id) → (tenant_id,platform,platform_id)
ALTER TABLE agent_work.outreach_leads DROP CONSTRAINT IF EXISTS outreach_leads_platform_key;
DO $$ BEGIN
  ALTER TABLE agent_work.outreach_leads ADD CONSTRAINT outreach_leads_tenant_platform_key
    UNIQUE (tenant_id, platform, platform_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- scanned_content: PK (platform,content_id) → (tenant_id,platform,content_id)
ALTER TABLE agent_work.outreach_scanned_content DROP CONSTRAINT IF EXISTS outreach_scanned_content_pkey;
DO $$ BEGIN
  ALTER TABLE agent_work.outreach_scanned_content ADD CONSTRAINT outreach_scanned_content_pkey
    PRIMARY KEY (tenant_id, platform, content_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- suppression: PK (email) → (tenant_id,email)  [한 테넌트 수신거부가 타 테넌트를 막지 않게]
ALTER TABLE agent_work.outreach_suppression DROP CONSTRAINT IF EXISTS outreach_suppression_pkey;
DO $$ BEGIN
  ALTER TABLE agent_work.outreach_suppression ADD CONSTRAINT outreach_suppression_pkey
    PRIMARY KEY (tenant_id, email);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- touchpoints: UNIQUE(lead_id,touch_sequence) 유지(lead FK가 테넌트 함의). 필터용 인덱스만 추가.

-- ---------------------------------------------------------------
-- 5) 테넌트 스코프 복합 인덱스 (조회 패턴: tenant_id + status/score/email)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS outreach_leads_tenant_status_idx
  ON agent_work.outreach_leads (tenant_id, status);
CREATE INDEX IF NOT EXISTS outreach_leads_tenant_score_idx
  ON agent_work.outreach_leads (tenant_id, score DESC);
CREATE INDEX IF NOT EXISTS outreach_leads_tenant_email_idx
  ON agent_work.outreach_leads (tenant_id, contact_email) WHERE contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_touchpoints_tenant_status_idx
  ON agent_work.outreach_touchpoints (tenant_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS outreach_scanned_content_tenant_idx
  ON agent_work.outreach_scanned_content (tenant_id, platform);
CREATE INDEX IF NOT EXISTS snapshots_tenant_kind_idx
  ON agent_work.snapshots (tenant_id, kind) WHERE tenant_id IS NOT NULL;

-- ---------------------------------------------------------------
-- 6) PostgREST 스키마 캐시 리로드
-- ---------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- 검증(수동):
--   SELECT count(*) FROM agent_work.outreach_leads       WHERE tenant_id IS NULL;  -- 0
--   SELECT count(*) FROM agent_work.outreach_touchpoints WHERE tenant_id IS NULL;  -- 0
--   SELECT count(*) FROM agent_work.outreach_scanned_content WHERE tenant_id IS NULL; -- 0
--   SELECT count(*) FROM agent_work.outreach_suppression WHERE tenant_id IS NULL;  -- 0
