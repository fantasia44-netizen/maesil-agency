-- 025: maeyo_l2_scripts — 승인 워크플로우 status 컬럼 추가
-- 관리자 correction이 곧바로 is_verified=True가 되는 오염 리스크 제거.
-- 흐름: 자동 등록(draft) → 관리자 검토 → 승인(active) / 거부(is_active=false)

ALTER TABLE agent_work.maeyo_l2_scripts
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 기존 스크립트는 모두 즉시 활성화 (하위 호환)
UPDATE agent_work.maeyo_l2_scripts
    SET status = 'active'
    WHERE status != 'draft';

-- status 기반 빠른 필터 인덱스 (program별 active 스크립트 조회가 핫패스)
CREATE INDEX IF NOT EXISTS idx_l2_status_program
    ON agent_work.maeyo_l2_scripts(status, program)
    WHERE is_active = true;

COMMENT ON COLUMN agent_work.maeyo_l2_scripts.status IS
    'draft: 관리자 correction 자동 등록 — 검토 대기 중 (L2 매칭 제외)
     active: 관리자 승인 완료 — L2 매칭에 포함
     (비활성화는 is_active=false 사용)';
