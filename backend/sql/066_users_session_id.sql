-- 066_users_session_id.sql
-- 단일 세션(중복 로그인 차단)용 session_id 컬럼.
-- 한 계정을 여러 명이 동시에 사용해 기록을 공유하는 것을 방지 —
-- 로그인/가입/소셜로그인/비번재설정 시 새 session_id를 발급하고,
-- 이전에 발급된 JWT(sid 불일치)는 다음 요청부터 401 처리(gbl 역할 전용).
--
-- 무중단: 컬럼이 없어도 백엔드는 단일세션만 미적용(로그인은 정상). 이 SQL 실행 후 활성화.

ALTER TABLE agent_work.users
    ADD COLUMN IF NOT EXISTS session_id text;
