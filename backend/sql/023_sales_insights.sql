-- 023: sales_insights — 영업/매출 에이전시 학습 DB
-- 오케스트레이터가 매출 분석 완료 시 operator별 인사이트를 누적 저장.
-- 다음 분석 요청 시 과거 인사이트를 컨텍스트로 주입 → 트렌드 연속성 파악.

CREATE TABLE IF NOT EXISTS agent_work.sales_insights (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id     text NOT NULL,      -- maesil-insight operator UUID
    insight_type    text NOT NULL DEFAULT 'general',
    -- ex: 'channel_trend' | 'peak_period' | 'top_product' | 'growth_pattern' | 'general'
    period_label    text,               -- ex: '2025-Q1', '2025-05', '2025-W20'
    summary         text NOT NULL,      -- 에이전트가 생성한 인사이트 요약 (1~3문장)
    data_snapshot   jsonb DEFAULT '{}', -- 분석 근거 수치 (채널별 매출, top5 등)
    source          text DEFAULT 'sales_agent',  -- 생성 주체
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 같은 operator + type + 기간 → UPSERT 가능하도록 UNIQUE 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_insights_key
    ON agent_work.sales_insights(operator_id, insight_type, COALESCE(period_label, ''));

-- 최신 인사이트 빠른 조회
CREATE INDEX IF NOT EXISTS idx_sales_insights_operator_recent
    ON agent_work.sales_insights(operator_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE ON agent_work.sales_insights
    TO anon, authenticated, service_role;
