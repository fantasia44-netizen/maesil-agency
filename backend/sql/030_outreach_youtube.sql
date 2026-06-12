-- 030_outreach_youtube.sql
-- YouTube 리드 발굴 시스템 테이블

CREATE TABLE IF NOT EXISTS agent_work.outreach_scanned_videos (
    video_id        TEXT PRIMARY KEY,
    channel_id      TEXT,
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_scanned_videos_channel_idx
    ON agent_work.outreach_scanned_videos (channel_id);

CREATE TABLE IF NOT EXISTS agent_work.outreach_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              TEXT NOT NULL,
    channel_title           TEXT,
    channel_url             TEXT,
    subscriber_count        INTEGER,
    contact_email           TEXT,
    naver_cafe_url          TEXT,
    blog_url                TEXT,
    instagram_url           TEXT,
    best_video_id           TEXT,
    best_video_title        TEXT,
    best_video_views        INTEGER,
    best_video_published_at TIMESTAMPTZ,
    content_summary         TEXT,
    score                   INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'new',
    emailed_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT outreach_leads_channel_id_key UNIQUE (channel_id),
    CONSTRAINT outreach_leads_status_check CHECK (status IN ('new', 'emailed', 'replied', 'rejected'))
);

CREATE INDEX IF NOT EXISTS outreach_leads_status_idx
    ON agent_work.outreach_leads (status);

CREATE INDEX IF NOT EXISTS outreach_leads_score_idx
    ON agent_work.outreach_leads (score DESC);

COMMENT ON TABLE agent_work.outreach_scanned_videos IS '이미 스캔한 유튜브 영상 중복 방지용';
COMMENT ON TABLE agent_work.outreach_leads IS '유튜브 파트너 영업 리드 목록';
