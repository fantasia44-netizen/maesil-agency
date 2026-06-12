-- 031_outreach_v4.sql
-- 멀티채널 파트너 영업 시스템 v4 전면 재설계
-- 030 테이블을 교체 (초기 단계라 데이터 없음)

DROP TABLE IF EXISTS agent_work.outreach_touchpoints CASCADE;
DROP TABLE IF EXISTS agent_work.outreach_leads CASCADE;
DROP TABLE IF EXISTS agent_work.outreach_scanned_content CASCADE;
DROP TABLE IF EXISTS agent_work.outreach_scanned_videos CASCADE;

-- ── 스캔된 콘텐츠 (플랫폼별 중복 방지) ─────────────────────────────
CREATE TABLE agent_work.outreach_scanned_content (
    platform    TEXT NOT NULL,
    content_id  TEXT NOT NULL,
    lead_id     UUID,
    scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (platform, content_id)
);

CREATE INDEX outreach_scanned_content_lead_idx
    ON agent_work.outreach_scanned_content (lead_id);

-- ── 리드 (플랫폼 무관 통합) ──────────────────────────────────────────
CREATE TABLE agent_work.outreach_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 플랫폼
    platform                TEXT NOT NULL,
    platform_id             TEXT NOT NULL,
    platform_url            TEXT,
    primary_platform        TEXT,
    platforms_json          JSONB DEFAULT '[]'::jsonb,

    -- 채널/블로그 기본
    handle_name             TEXT,
    owner_name              TEXT,

    -- 영향력 지표
    subscriber_count        INTEGER,
    content_count           INTEGER,
    avg_views               INTEGER,
    avg_comments            INTEGER,
    community_size          INTEGER,
    activity_level          TEXT DEFAULT 'unknown',

    -- 연락처
    contact_email           TEXT,
    contact_kakao           TEXT,
    contact_naver_cafe      TEXT,
    contact_blog            TEXT,
    contact_instagram       TEXT,
    contact_youtube         TEXT,

    -- 대표 콘텐츠
    best_content_id         TEXT,
    best_content_title      TEXT,
    best_content_views      INTEGER,
    best_content_published_at TIMESTAMPTZ,

    -- AI 빠른 분류 (Haiku)
    is_seller_content       BOOLEAN DEFAULT FALSE,
    is_educational          BOOLEAN DEFAULT FALSE,
    content_summary         TEXT,
    ai_confidence           TEXT DEFAULT 'low',

    -- 전환력 신호
    conversion_power_score  INTEGER DEFAULT 0,
    has_paid_course         BOOLEAN DEFAULT FALSE,
    has_paid_membership     BOOLEAN DEFAULT FALSE,
    has_ebook_sale          BOOLEAN DEFAULT FALSE,
    has_consulting          BOOLEAN DEFAULT FALSE,
    has_affiliate_exp       BOOLEAN DEFAULT FALSE,
    has_tool_recommendation BOOLEAN DEFAULT FALSE,

    -- 리스크 신호
    competitive_risk_score  INTEGER DEFAULT 0,
    sells_competing_tool    BOOLEAN DEFAULT FALSE,
    sells_own_program       BOOLEAN DEFAULT FALSE,
    is_competitor_partner   BOOLEAN DEFAULT FALSE,
    has_negative_tool_content BOOLEAN DEFAULT FALSE,

    -- 채널 분류
    channel_type            TEXT,
    content_category        TEXT[],
    target_audience         TEXT,

    -- AI 심층 분석 (Sonnet, A/S급만)
    analysis_json           JSONB,
    approach_strategy       TEXT,

    -- 이메일
    email_subject           TEXT,
    email_draft             TEXT,
    email_final             TEXT,

    -- 점수
    score                   INTEGER NOT NULL DEFAULT 0,
    score_breakdown         JSONB,
    grade                   TEXT DEFAULT 'D',

    -- CRM 상태
    status                  TEXT NOT NULL DEFAULT 'discovered',

    -- 답신 추적
    reply_type              TEXT,
    reply_summary           TEXT,
    reply_received_at       TIMESTAMPTZ,
    gmail_thread_id         TEXT,
    next_action             TEXT,

    -- 멀티터치 요약
    touch_count             INTEGER DEFAULT 0,
    last_touch_at           TIMESTAMPTZ,
    last_touch_channel      TEXT,

    -- 타임스탬프
    emailed_at              TIMESTAMPTZ,
    last_scanned_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT outreach_leads_platform_key UNIQUE (platform, platform_id),
    CONSTRAINT outreach_leads_status_check CHECK (status IN (
        'discovered','analyzing','draft_ready','approved','emailed',
        'replied','no_reply','negotiating','deal','rejected','archived'
    )),
    CONSTRAINT outreach_leads_platform_check CHECK (platform IN (
        'youtube','naver_blog','tistory','brunch','instagram','naver_cafe'
    )),
    CONSTRAINT outreach_leads_grade_check CHECK (grade IN ('S','A','B','C','D'))
);

CREATE INDEX outreach_leads_platform_status_idx ON agent_work.outreach_leads (platform, status);
CREATE INDEX outreach_leads_score_idx ON agent_work.outreach_leads (score DESC);
CREATE INDEX outreach_leads_grade_idx ON agent_work.outreach_leads (grade, status);
CREATE INDEX outreach_leads_channel_type_idx ON agent_work.outreach_leads (channel_type);
CREATE INDEX outreach_leads_email_idx ON agent_work.outreach_leads (contact_email) WHERE contact_email IS NOT NULL;

-- ── 멀티터치 접촉 이력 ────────────────────────────────────────────────
CREATE TABLE agent_work.outreach_touchpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL REFERENCES agent_work.outreach_leads(id) ON DELETE CASCADE,

    touch_sequence  INTEGER NOT NULL,
    channel         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    content_preview TEXT,
    sent_at         TIMESTAMPTZ,
    replied_at      TIMESTAMPTZ,
    error_msg       TEXT,
    scheduled_for   TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (lead_id, touch_sequence),
    CONSTRAINT touchpoints_channel_check CHECK (channel IN (
        'email','instagram_dm','naver_cafe_message','youtube_comment','kakao_message'
    )),
    CONSTRAINT touchpoints_status_check CHECK (status IN (
        'pending','sent','failed','replied','bounced','skipped'
    ))
);

CREATE INDEX outreach_touchpoints_lead_idx ON agent_work.outreach_touchpoints (lead_id, status);
CREATE INDEX outreach_touchpoints_scheduled_idx ON agent_work.outreach_touchpoints (scheduled_for) WHERE status = 'pending';

COMMENT ON TABLE agent_work.outreach_scanned_content IS '플랫폼별 중복 스캔 방지';
COMMENT ON TABLE agent_work.outreach_leads IS '멀티채널 파트너 영업 리드 (YouTube+블로그+카페+인스타)';
COMMENT ON TABLE agent_work.outreach_touchpoints IS '리드별 멀티터치 접촉 이력';
