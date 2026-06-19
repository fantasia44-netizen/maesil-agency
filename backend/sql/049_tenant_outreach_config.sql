-- maesil-agency / 멀티테넌트 SaaS — Phase 4: 테넌트별 영업 설정/키워드/타임존
-- 실행 위치: maesil-total Supabase → SQL Editor
-- 전역 settings.outreach_* → 테넌트별. 기본 테넌트는 현재 config.py 기본값으로 시드(동작 동일).
-- ⚠️ Phase 4 코드(tenant_config 로더)와 함께 배포.

CREATE TABLE IF NOT EXISTS agent_work.tenant_outreach_config (
    tenant_id           uuid PRIMARY KEY REFERENCES agent_work.tenants(id) ON DELETE CASCADE,
    cold_drip_enabled   bool    NOT NULL DEFAULT false,
    daily_cap           int     NOT NULL DEFAULT 100,
    drip_grades         text    NOT NULL DEFAULT 'S,A,B,C',
    send_start_hour     int     NOT NULL DEFAULT 8,
    send_end_hour       int     NOT NULL DEFAULT 20,
    timezone            text    NOT NULL DEFAULT 'Asia/Seoul',   -- 하드코딩 KST 대체
    quiet_hours         bool    NOT NULL DEFAULT true,
    ad_prefix           bool    NOT NULL DEFAULT true,
    kakao_url           text    DEFAULT 'https://open.kakao.com/o/sg6QOxDg',
    sender_info         text    DEFAULT '매실인사이트 · support@maesil-insight.com',
    influencer_subject  text    DEFAULT '광고비 -75% 줄인 실제 데이터, 영상 소재로 써보실래요?',
    agency_subject      text    DEFAULT '무료체험 — {company}님 네이버·쿠팡 광고 리포트 10분 자동화',
    unsubscribe_base_url text   DEFAULT '',
    keywords_youtube    text[],     -- NULL = 코드 기본 키워드 사용
    keywords_naver      text[],
    gmail_connected     bool    NOT NULL DEFAULT false,   -- OAuth 연결 완료 표시(편의)
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_work.tenant_outreach_config IS '테넌트별 영업 발송 설정 — 전역 settings.outreach_* 대체';

-- 기본 테넌트 시드: 현재 운영값과 동일하게(콜드드립 ON, 나머지는 기본값).
-- 이미 있으면(재실행) 스킵.
INSERT INTO agent_work.tenant_outreach_config (tenant_id, cold_drip_enabled)
SELECT id, true
FROM   agent_work.tenants
WHERE  plan = 'internal'
  AND  NOT EXISTS (SELECT 1 FROM agent_work.tenant_outreach_config c WHERE c.tenant_id = tenants.id)
ORDER  BY created_at
LIMIT  1;

NOTIFY pgrst, 'reload schema';

-- 검증(수동):
--   SELECT tenant_id, cold_drip_enabled, daily_cap, timezone FROM agent_work.tenant_outreach_config;
