-- 해외 바이어 발굴 리드 테이블
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.buyer_leads (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name     TEXT NOT NULL,
    country          TEXT NOT NULL,
    contact_name     TEXT,
    contact_email    TEXT,
    contact_title    TEXT,
    industry         TEXT,
    product_interest TEXT,
    source           TEXT NOT NULL DEFAULT 'manual',  -- manual | apollo | csv | kotra
    status           TEXT NOT NULL DEFAULT 'discovered',
                     -- discovered | contacted | replied | negotiating | deal | rejected
    last_contacted_at TIMESTAMPTZ,
    emailed_at       TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyer_leads_country_idx  ON agent_work.buyer_leads (country);
CREATE INDEX IF NOT EXISTS buyer_leads_status_idx   ON agent_work.buyer_leads (status);
CREATE INDEX IF NOT EXISTS buyer_leads_source_idx   ON agent_work.buyer_leads (source);

NOTIFY pgrst, 'reload schema';
