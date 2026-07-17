-- 058: 명함 리드 (박람회·오프라인 명함 사진 업로드 → Claude 비전 추출 → 자동 등록)
--
-- 영업비서 통합 파이프라인의 '수집' 소스 하나. 유튜브(자동 대량)와 달리
-- 명함은 수동 수집 + 자동 처리(OCR·메모) 하이브리드.
-- source/mode 두 축: 리드가 어디서 왔고(source), 자동/수동 어느 흐름을 탈지(mode).
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.namecard_leads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,                 -- 워크스페이스 격리(상용화)
    person_name   TEXT,                          -- 이름
    company_name  TEXT,                          -- 회사/브랜드
    title         TEXT,                          -- 직함
    email         TEXT,
    phone         TEXT,
    address       TEXT,
    website       TEXT,
    ai_memo       TEXT,                          -- Claude 회사/브랜드 요약 메모
    raw_extracted JSONB DEFAULT '{}'::jsonb,     -- Claude 원본 추출 결과
    event_name    TEXT,                          -- 어느 박람회/행사에서 받았나
    source        TEXT NOT NULL DEFAULT 'namecard',
    mode          TEXT NOT NULL DEFAULT 'manual',-- manual(직접 접촉) | auto(콜드 시퀀스)
    stage         TEXT NOT NULL DEFAULT 'new',   -- new|contacted|replied|deal|archived
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT namecard_mode_check  CHECK (mode  IN ('manual','auto')),
    CONSTRAINT namecard_stage_check CHECK (stage IN ('new','contacted','replied','deal','archived'))
);

CREATE INDEX IF NOT EXISTS namecard_leads_tenant_idx ON agent_work.namecard_leads (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS namecard_leads_stage_idx  ON agent_work.namecard_leads (tenant_id, stage);

GRANT ALL PRIVILEGES ON agent_work.namecard_leads TO service_role;

NOTIFY pgrst, 'reload schema';
