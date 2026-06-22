-- 브랜드 관리 — 브랜드 프로필 + 키워드 번역 테이블
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.brand_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name    TEXT NOT NULL,
    brand_name      TEXT,
    product_categories TEXT[],          -- ['한국식품', 'K-뷰티', '건강식품']
    description     TEXT,               -- 회사/브랜드 설명 (키워드 추출용)
    target_countries TEXT[],            -- ['Japan', 'China', 'Vietnam', 'USA']
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 키워드 + 번역 저장
CREATE TABLE IF NOT EXISTS agent_work.brand_keywords (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        UUID NOT NULL REFERENCES agent_work.brand_profiles(id) ON DELETE CASCADE,
    keyword_ko      TEXT NOT NULL,      -- 한국어 원문 키워드
    language        TEXT NOT NULL,      -- ja, zh, en, vi, th, fr, de, es, ar, id 등
    country         TEXT NOT NULL,      -- Japan, China, Vietnam 등
    keyword_local   TEXT NOT NULL,      -- 현지어 번역
    keyword_local_romanized TEXT,       -- 로마자 표기 (검색용)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_keywords_brand_idx ON agent_work.brand_keywords (brand_id, language);

-- 브랜드 발굴 결과
CREATE TABLE IF NOT EXISTS agent_work.brand_discovery_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        UUID NOT NULL REFERENCES agent_work.brand_profiles(id) ON DELETE CASCADE,
    keyword_id      UUID REFERENCES agent_work.brand_keywords(id) ON DELETE SET NULL,
    company_name    TEXT NOT NULL,      -- 발굴된 바이어 회사명 (현지어)
    company_name_ko TEXT,               -- 한국어 번역
    country         TEXT NOT NULL,
    language        TEXT NOT NULL,
    contact_email   TEXT,
    contact_name    TEXT,
    contact_name_ko TEXT,
    product_interest TEXT,              -- 현지어
    product_interest_ko TEXT,           -- 한국어 번역
    source          TEXT,               -- ec21, tradekey 등
    status          TEXT NOT NULL DEFAULT 'discovered',
    saved_to_buyers BOOLEAN DEFAULT FALSE,  -- buyer_leads에 저장 여부
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_discovery_brand_idx ON agent_work.brand_discovery_results (brand_id, country);

NOTIFY pgrst, 'reload schema';
