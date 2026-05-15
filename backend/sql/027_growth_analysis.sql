-- 027: growth_analysis_results — Growth Intelligence 에이전트 분석 결과 캐시
-- Sales + CS 인텔리전스 + 소비자 의도 + 개선 제안 결과를 누적 저장.
-- 다음 분석 시 이전 결과를 컨텍스트로 주입 → 트렌드 비교 가능.

CREATE TABLE IF NOT EXISTS agent_work.growth_analysis_results (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id     text NOT NULL,
    program         text NOT NULL DEFAULT 'maesil-insight',
    analysis_type   text NOT NULL,        -- 'cs_patterns'|'consumer_intent'|'sales_summary'|'improvement_plan'|'outreach'
    summary         text NOT NULL,        -- LLM 분석 요약
    insights        jsonb DEFAULT '[]',   -- [{title, body, kind}] 핵심 인사이트 목록
    improvement_items jsonb DEFAULT '[]', -- [{area, severity, title, body}] 개선 항목
    data_snapshot   jsonb DEFAULT '{}',   -- 원시 데이터 스냅샷
    period_days     int DEFAULT 30,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 최신 분석 빠른 조회 (operator + type 기준)
CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_analysis_uq
    ON agent_work.growth_analysis_results(operator_id, program, analysis_type);

CREATE INDEX IF NOT EXISTS idx_growth_analysis_updated
    ON agent_work.growth_analysis_results(updated_at DESC);

GRANT SELECT, INSERT, UPDATE ON agent_work.growth_analysis_results
    TO anon, authenticated, service_role;

COMMENT ON TABLE agent_work.growth_analysis_results IS
    'Growth Intelligence 에이전트 분석 결과 캐시.
     Sales 매출, CS 패턴, 소비자 의도, 비즈니스 개선 제안을 누적 저장.
     다음 실행 시 이전 결과를 컨텍스트로 주입하여 트렌드 비교 가능.';
