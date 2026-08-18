-- 065: users.role 에 'gbl' 추가 (포켓몬 GO GBL 앱 전용 공개 유저)
--
-- 에이전시(super_admin/customer)와 분리된 외부 게이머 계정. tenant 없음.
-- GBL 데이터는 gbl_matches.user_id 로 유저별 격리(064). gbl role은 에이전시 라우트
-- (require_admin/require_tenant) 접근 불가 → 자연스럽게 GBL 기능만 사용.
-- 실행 위치: maesil-total Supabase → agent_work 스키마

ALTER TABLE agent_work.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE agent_work.users
    ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'customer', 'gbl'));

COMMENT ON COLUMN agent_work.users.role IS
    'super_admin: 개발자(본인) | customer: 매실인사이트 대표자 | gbl: 포켓몬GO GBL 앱 유저';

NOTIFY pgrst, 'reload schema';
