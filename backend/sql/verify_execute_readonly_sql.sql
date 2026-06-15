-- 035 적용 후 검증 쿼리 — Supabase SQL Editor 에 붙여넣어 결과 확인.
-- 035_harden_execute_readonly_sql.sql 를 먼저 실행한 뒤 사용하세요.
--
-- 호출 스키마:
--   * maesil-total  : agent_work.execute_readonly_sql  (앱이 .schema("agent_work") 로 호출)
--   * maesil-insight: public.execute_readonly_sql
-- 아래는 public 기준. maesil-total 에서는 public → agent_work 로 바꿔 실행.

-- 1) 정상 SELECT — [기대] JSON 배열 반환 (성공)
SELECT public.execute_readonly_sql('SELECT 1 AS ok');

-- 2) 정상 WITH(읽기 CTE) — [기대] 성공
SELECT public.execute_readonly_sql('WITH x AS (SELECT 1 AS n) SELECT * FROM x');

-- 3) 쓰기 가능 CTE — [기대] ERROR: Write/DDL keywords are not allowed...
--    (아래는 실제 삭제하지 않음 — 가드에서 막혀야 정상)
SELECT public.execute_readonly_sql(
  'WITH x AS (DELETE FROM agent_work.users RETURNING *) SELECT * FROM x'
);

-- 4) 다중문 — [기대] ERROR: Multiple statements are not allowed
SELECT public.execute_readonly_sql('SELECT 1; DROP TABLE foo');

-- 5) 직접 DML — [기대] ERROR: Only SELECT/WITH queries are allowed
SELECT public.execute_readonly_sql('UPDATE agent_work.users SET role=''super_admin''');

-- 6) 함수 속성 확인 — [기대] proconfig 에 search_path 고정 표시
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'execute_readonly_sql';
