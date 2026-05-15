-- 022: dev_lessons_learned — dev 에이전시 학습 DB
-- PR 머지 완료 시 에러 패턴 + 수정 이력 자동 축적.
-- 다음 유사 에러 분석 시 과거 레슨을 컨텍스트로 주입 → 빠른 원인 파악 + 중복 실수 방지.

CREATE TABLE IF NOT EXISTS agent_work.dev_lessons_learned (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repo            text NOT NULL,
    error_type      text,               -- 실패 심볼 / fn_name (ex: '_draw_text_stroke')
    error_pattern   text NOT NULL,      -- PR 제목 기반 에러 설명 (검색 키워드)
    root_cause      text,               -- 원인 요약 (pr_body에서 추출 또는 pr_title)
    fix_summary     text NOT NULL,      -- 수정 내용 요약
    files_changed   jsonb DEFAULT '[]', -- 수정된 파일 목록
    pr_url          text,
    pr_title        text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- repo + error_type 기반 빠른 유사 레슨 조회
CREATE INDEX IF NOT EXISTS idx_lessons_repo_type
    ON agent_work.dev_lessons_learned(repo, error_type);

-- 최신 레슨 빠른 조회 (최근 10개 등)
CREATE INDEX IF NOT EXISTS idx_lessons_created
    ON agent_work.dev_lessons_learned(created_at DESC);

GRANT SELECT, INSERT ON agent_work.dev_lessons_learned
    TO anon, authenticated, service_role;
