-- maesil-agency / 멀티테넌트 SaaS — Phase 0: tenants(워크스페이스) 테이블 + users.tenant_id
-- 실행 위치: maesil-total Supabase → SQL Editor
-- 순수 additive. 기존 super_admin 데이터는 기본 테넌트 1개로 매핑(동작 변화 없음).

-- ---------------------------------------------------------------
-- tenants: 영업 워크스페이스 — 데이터/시크릿/설정/과금의 격리 단위
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_work.tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    owner_user_id   uuid REFERENCES agent_work.users(id) ON DELETE SET NULL,
    plan            text NOT NULL DEFAULT 'trial'
                    CHECK (plan IN ('trial','starter','pro','internal')),
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','canceled')),
    trial_ends_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  agent_work.tenants IS '영업 SaaS 워크스페이스 — 데이터/시크릿/설정/과금 격리 단위';
COMMENT ON COLUMN agent_work.tenants.plan   IS 'trial|starter|pro|internal(기본 테넌트)';
COMMENT ON COLUMN agent_work.tenants.status IS 'active|suspended|canceled — suspended/canceled는 스케줄러가 제외';

-- users.tenant_id (소속 워크스페이스). nullable → 백필 후에도 nullable 유지(신규 가입 흐름은 Phase 8)
ALTER TABLE agent_work.users
    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES agent_work.tenants(id);

COMMENT ON COLUMN agent_work.users.tenant_id IS '소속 영업 워크스페이스(tenants.id)';

-- 기본 테넌트 1개 시드 — 최초 super_admin 소유, plan=internal. 이미 있으면(재실행) 스킵.
INSERT INTO agent_work.tenants (name, owner_user_id, plan, status)
SELECT '기본 워크스페이스', u.id, 'internal', 'active'
FROM   agent_work.users u
WHERE  u.role = 'super_admin'
  AND  NOT EXISTS (SELECT 1 FROM agent_work.tenants)
ORDER  BY u.created_at
LIMIT  1;

-- 기존 모든 users를 기본 테넌트로 백필
UPDATE agent_work.users
SET    tenant_id = (SELECT id FROM agent_work.tenants ORDER BY created_at LIMIT 1)
WHERE  tenant_id IS NULL
  AND  EXISTS (SELECT 1 FROM agent_work.tenants);

CREATE INDEX IF NOT EXISTS idx_users_tenant   ON agent_work.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner  ON agent_work.tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON agent_work.tenants(status);

-- 검증 쿼리(수동):
--   SELECT count(*) FROM agent_work.tenants;                          -- 1
--   SELECT count(*) FROM agent_work.users WHERE tenant_id IS NULL;    -- 0
