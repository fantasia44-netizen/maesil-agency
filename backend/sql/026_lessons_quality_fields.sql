-- 026: dev_lessons_learned — 품질 필드 확장
-- PR 제목 기반 레슨 저장의 한계 극복.
-- root_cause, actual_fix, failed_attempts, test_result, lesson_quality 필드 추가.
-- 다음 분석 시 LLM이 "무엇이 실제 원인이었는지", "무엇을 시도했다가 실패했는지" 파악 가능.

ALTER TABLE agent_work.dev_lessons_learned
    ADD COLUMN IF NOT EXISTS actual_fix      text,                   -- 실제 변경 내용 요약 (commit_msg 기반)
    ADD COLUMN IF NOT EXISTS failed_attempts jsonb DEFAULT '[]',     -- 시도했지만 실패한 접근법 목록
    ADD COLUMN IF NOT EXISTS test_result     text,                   -- run_checks.py 결과 (PASS/FAIL/unknown)
    ADD COLUMN IF NOT EXISTS lesson_quality  text DEFAULT 'ok';      -- good | ok | bad

COMMENT ON COLUMN agent_work.dev_lessons_learned.lesson_quality IS
    'good: PR 머지 + 테스트 통과 (신뢰할 수 있는 레슨)
     ok:   PR 머지 완료 (테스트 결과 불명)
     bad:  실패한 시도 — 반면교사용 (LLM에 "이 방법은 실패했음"으로 전달)';

COMMENT ON COLUMN agent_work.dev_lessons_learned.failed_attempts IS
    '형식: [{"approach": "...", "reason": "..."}]';
