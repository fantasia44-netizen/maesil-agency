-- maesil-agency / 멀티테넌트 SaaS — Phase 8b: 구독·결제 (PortOne)
-- 실행 위치: maesil-total Supabase → SQL Editor
-- PortOne 설정은 전역 secrets(portone_*), billing_key는 테넌트별.

CREATE TABLE IF NOT EXISTS agent_work.tenant_subscriptions (
    tenant_id            uuid PRIMARY KEY REFERENCES agent_work.tenants(id) ON DELETE CASCADE,
    plan                 text,                         -- starter | pro
    status               text NOT NULL DEFAULT 'none', -- none|active|canceled|past_due
    billing_key          text,
    billing_key_pg       text,                         -- card | kakaopay
    card_info            jsonb,
    amount               int,                          -- 월 결제 금액(원)
    current_period_start timestamptz,
    current_period_end   timestamptz,
    canceled_at          timestamptz,
    last_payment_id      text,
    last_error           text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_work.tenant_subscriptions IS '테넌트 구독/결제 상태 (PortOne 빌링키 정기결제)';

CREATE INDEX IF NOT EXISTS tenant_subs_status_idx
  ON agent_work.tenant_subscriptions (status, current_period_end);

-- 웹훅 멱등 처리용 (event 중복 방지)
CREATE TABLE IF NOT EXISTS agent_work.billing_events (
    event_id    text PRIMARY KEY,
    kind        text,
    payload     jsonb,
    received_at timestamptz NOT NULL DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
