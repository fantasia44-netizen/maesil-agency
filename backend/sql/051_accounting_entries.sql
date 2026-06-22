-- 회계 수동 항목 (수입/지출)
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.accounting_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
    category    TEXT NOT NULL,   -- 구독수입 | 용역수입 | 마케팅비 | 인건비 | 기타
    amount      INTEGER NOT NULL,
    entry_date  DATE NOT NULL,
    description TEXT,
    tenant_id   UUID REFERENCES agent_work.tenants(id) ON DELETE SET NULL,
    created_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_entries_date_idx
    ON agent_work.accounting_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS accounting_entries_kind_idx
    ON agent_work.accounting_entries (kind, entry_date DESC);

NOTIFY pgrst, 'reload schema';
