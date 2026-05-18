-- 029: maeyo_l2_scripts에 user_role 컬럼 추가
-- 인사이트 내 사용자 유형별 CS 대본 분리
-- user_role: NULL(공통) | 'seller' | 'partner' | 'agency'

ALTER TABLE agent_work.maeyo_l2_scripts
  ADD COLUMN IF NOT EXISTS user_role text DEFAULT NULL
    CHECK (user_role IN ('seller', 'partner', 'agency'));

-- 인덱스: program + user_role 복합 조회 최적화
CREATE INDEX IF NOT EXISTS idx_l2_scripts_program_role
  ON agent_work.maeyo_l2_scripts (program, user_role)
  WHERE is_active = true;

COMMENT ON COLUMN agent_work.maeyo_l2_scripts.user_role IS
  'NULL=공통(모든 역할), seller=일반 셀러, partner=파트너, agency=광고대행주';
