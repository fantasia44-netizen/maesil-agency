-- 019: 매요 CS 지식베이스 + 미답변 질문 큐
-- feature_docs: dev 에이전트가 코드 분석해서 생성한 기능 설명 (L2.5)
-- unanswered_log: L2 미매칭 → dev 에이전트 처리 대기 큐

CREATE TABLE IF NOT EXISTS agent_work.maeyo_feature_docs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program         text NOT NULL,
    keywords        jsonb NOT NULL DEFAULT '[]',   -- 매칭용 키워드 목록
    question_hint   text,                          -- 어떤 질문에서 생성됐는지
    answer          text NOT NULL,                 -- 매요가 그대로 쓸 수 있는 답변
    code_refs       jsonb DEFAULT '[]',            -- 참조한 파일 경로 목록
    created_by      text DEFAULT 'dev_agent',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_docs_program
    ON agent_work.maeyo_feature_docs(program);

CREATE TABLE IF NOT EXISTS agent_work.maeyo_unanswered_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program         text NOT NULL,
    message         text NOT NULL,
    l3_response     text,
    conversation_id text,
    processed_at    timestamptz,          -- null = 미처리
    feature_doc_id  uuid REFERENCES agent_work.maeyo_feature_docs(id),
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unanswered_unprocessed
    ON agent_work.maeyo_unanswered_log(program, processed_at)
    WHERE processed_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON agent_work.maeyo_feature_docs, agent_work.maeyo_unanswered_log
    TO anon, authenticated, service_role;
