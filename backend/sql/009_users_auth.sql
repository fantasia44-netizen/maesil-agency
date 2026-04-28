-- maesil-agency / 멀티테넌트 인증 시스템
-- users 테이블 + 기존 테이블 user_id 추가
-- 실행 위치: maesil-total Supabase → SQL Editor

-- ---------------------------------------------------------------
-- users: maesil-agency 계정 (super_admin + 매실인사이트 대표자)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_work.users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text UNIQUE NOT NULL,
    password_hash   text NOT NULL,
    role            text NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('super_admin', 'customer')),
    -- 매실인사이트 operator_id (customer 전용 — 이 값으로 데이터 격리)
    insight_operator_id  uuid,
    display_name    text,
    is_active       bool NOT NULL DEFAULT true,
    created_by      uuid REFERENCES agent_work.users(id) ON DELETE SET NULL,
    last_login_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON agent_work.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON agent_work.users(role);

COMMENT ON TABLE  agent_work.users IS 'maesil-agency 로그인 계정';
COMMENT ON COLUMN agent_work.users.role IS 'super_admin: 개발자(본인) | customer: 매실인사이트 대표자';
COMMENT ON COLUMN agent_work.users.insight_operator_id IS '매실인사이트 DB의 operator_id — 데이터 격리 키';

-- ---------------------------------------------------------------
-- conversations: user_id 추가 (대화 격리)
-- ---------------------------------------------------------------
ALTER TABLE agent_work.conversations
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES agent_work.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent_work.conversations(user_id);

-- ---------------------------------------------------------------
-- alert_channels: user_id 추가 (채널별 개인 설정)
-- ---------------------------------------------------------------
ALTER TABLE agent_work.alert_channels
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES agent_work.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------
-- super_admin 초기 계정 생성 헬퍼 (실제 비밀번호는 /api/auth/register로 생성)
-- 아래 INSERT는 직접 실행하지 말고 /api/auth/setup 엔드포인트 사용
-- ---------------------------------------------------------------
-- 참고용: 해시는 bcrypt, Python에서 passlib.hash.bcrypt.hash("비밀번호")
