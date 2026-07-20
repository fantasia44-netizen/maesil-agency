-- 060: 재무센터 2단계 — 카드매출·카드매입·현금영수증·은행내역
--
-- 부가세 역할:
--   card_sales / cash_receipt : 과세표준·매출세액 합산 (세금계산서 미발행 매출)
--   card_purchase             : 공제 매입세액 합산 (deductible 플래그)
--   bank                      : 부가세 미포함 — 입출금 대사·비용 참고용
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.finance_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id      UUID REFERENCES agent_work.finance_uploads(id) ON DELETE SET NULL,
    kind           TEXT NOT NULL,              -- card_sales | card_purchase | cash_receipt | bank
    tx_date        DATE,                       -- 거래/승인/사용 일자
    counterparty   TEXT DEFAULT '',            -- 가맹점/거래처/적요
    approval_no    TEXT DEFAULT '',            -- 승인번호 (있으면 중복 방지 키)
    supply_amount  BIGINT NOT NULL DEFAULT 0,  -- 공급가액
    vat_amount     BIGINT NOT NULL DEFAULT 0,  -- 부가세
    total_amount   BIGINT NOT NULL DEFAULT 0,  -- 합계/승인금액
    deposit        BIGINT NOT NULL DEFAULT 0,  -- 은행: 입금
    withdrawal     BIGINT NOT NULL DEFAULT 0,  -- 은행: 출금
    deductible     BOOLEAN NOT NULL DEFAULT TRUE,  -- card_purchase 공제여부
    nondeduct_reason TEXT,
    vat_estimated  BOOLEAN NOT NULL DEFAULT FALSE, -- 공급가액/부가세를 합계에서 역산한 경우
    memo           TEXT,
    source         TEXT NOT NULL DEFAULT 'excel',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_tx_kind_check CHECK
        (kind IN ('card_sales','card_purchase','cash_receipt','bank'))
);

-- 승인번호 있는 건은 (종류, 승인번호) 유니크 — 재업로드 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS finance_tx_approval_uniq
    ON agent_work.finance_transactions (kind, approval_no)
    WHERE approval_no IS NOT NULL AND approval_no <> '';

CREATE INDEX IF NOT EXISTS finance_tx_period_idx
    ON agent_work.finance_transactions (kind, tx_date);
CREATE INDEX IF NOT EXISTS finance_tx_upload_idx
    ON agent_work.finance_transactions (upload_id);

GRANT ALL PRIVILEGES ON agent_work.finance_transactions TO service_role;

NOTIFY pgrst, 'reload schema';
