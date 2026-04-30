-- L2 스크립트 검증 필드 추가
-- is_verified: 관리자가 정답임을 확인한 스크립트
ALTER TABLE agent_work.maeyo_l2_scripts
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
