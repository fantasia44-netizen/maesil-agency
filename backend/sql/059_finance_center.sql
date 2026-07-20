-- 059: 재무센터 — (주)매실패밀리 부가세 신고자료 (법인 일반과세)
--
-- maesil-total 회계와 완전 분리: total = (주)해서물산 자료, agency = (주)매실패밀리.
-- 같은 Supabase지만 agent_work 스키마의 finance_* 테이블만 사용 (데이터 혼합 금지).
--
-- 수집: 홈택스 엑셀 수동 업로드(source=hometax_excel) 중심.
--       유저 늘면 API 자동연동 추가 예정 → source 컬럼으로 채널 구분, 집계 로직은 불변.
-- 실행 위치: maesil-total Supabase → agent_work 스키마

-- 업로드 배치 (파일 단위 이력·롤백 지원)
CREATE TABLE IF NOT EXISTS agent_work.finance_uploads (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           TEXT NOT NULL,                  -- tax_invoice | card_sales | card_purchase | cash_receipt | bank
    direction      TEXT,                           -- sales | purchase (kind에 따라 null 가능)
    filename       TEXT,
    row_count      INT  NOT NULL DEFAULT 0,        -- 파싱된 행 수
    inserted_count INT  NOT NULL DEFAULT 0,        -- 실제 신규 저장 수
    skipped_count  INT  NOT NULL DEFAULT 0,        -- 중복 등 건너뜀
    note           TEXT,
    created_by     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_uploads_kind_check CHECK
        (kind IN ('tax_invoice','card_sales','card_purchase','cash_receipt','bank'))
);

-- 전자(세금)계산서 — 홈택스 발급/수취 목록
CREATE TABLE IF NOT EXISTS agent_work.finance_tax_invoices (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id          UUID REFERENCES agent_work.finance_uploads(id) ON DELETE SET NULL,
    direction          TEXT NOT NULL,              -- sales(매출) | purchase(매입)
    invoice_number     TEXT,                       -- 국세청 승인번호 (전역 유니크)
    write_date         DATE,                       -- 작성일자 (귀속기간 판정 기준)
    issue_date         DATE,                       -- 발급일자
    tax_type           TEXT NOT NULL DEFAULT '과세', -- 과세 | 면세 | 영세
    supplier_corp_num  TEXT DEFAULT '',
    supplier_corp_name TEXT DEFAULT '',
    supplier_ceo_name  TEXT DEFAULT '',
    buyer_corp_num     TEXT DEFAULT '',
    buyer_corp_name    TEXT DEFAULT '',
    buyer_ceo_name     TEXT DEFAULT '',
    supply_cost_total  BIGINT NOT NULL DEFAULT 0,  -- 공급가액
    tax_total          BIGINT NOT NULL DEFAULT 0,  -- 세액
    total_amount       BIGINT NOT NULL DEFAULT 0,  -- 합계
    deductible         BOOLEAN NOT NULL DEFAULT TRUE, -- 매입세액 공제여부 (매출건은 무시)
    nondeduct_reason   TEXT,                       -- 불공제 사유 (접대비·비영업용차량 등)
    source             TEXT NOT NULL DEFAULT 'hometax_excel',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_ti_direction_check CHECK (direction IN ('sales','purchase')),
    CONSTRAINT finance_ti_tax_type_check  CHECK (tax_type IN ('과세','면세','영세'))
);

-- 승인번호 전역 유니크 (재업로드 중복 방지) — 승인번호 없는 행은 제외
CREATE UNIQUE INDEX IF NOT EXISTS finance_ti_invoice_number_uniq
    ON agent_work.finance_tax_invoices (invoice_number)
    WHERE invoice_number IS NOT NULL AND invoice_number <> '';

CREATE INDEX IF NOT EXISTS finance_ti_period_idx
    ON agent_work.finance_tax_invoices (direction, write_date);
CREATE INDEX IF NOT EXISTS finance_ti_upload_idx
    ON agent_work.finance_tax_invoices (upload_id);

GRANT ALL PRIVILEGES ON agent_work.finance_uploads      TO service_role;
GRANT ALL PRIVILEGES ON agent_work.finance_tax_invoices TO service_role;

NOTIFY pgrst, 'reload schema';
