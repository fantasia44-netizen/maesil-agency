-- 075_gbl_rls_hardening.sql — RLS 방어층(보안 감사 M5)
-- 배경: 백엔드가 service-role 키로 접근 → RLS는 우회됨. 그러나 앱은 격리를
--   전적으로 각 쿼리의 .eq("user_id", ...)에 의존한다(DB 백스톱 없음).
-- 목적: gbl 테이블에 RLS를 켜 두면(정책 없음 = deny-all) service-role 외의
--   어떤 경로(anon 키·유출된 비서비스 키·향후 리팩터)로도 행을 읽지 못한다.
--   service-role은 RLS를 우회하므로 현재 백엔드 동작에는 영향 없음(무중단).
-- 실행 위치: **maesil-hub(public 스키마)** — gbl 데이터가 사는 곳.
--   (gbl_visits/gbl_posts/gbl_post_replies/gbl_gallery는 이미 RLS ON — 여기선 누락분만)

-- 유저 스코프 개인 기록
ALTER TABLE IF EXISTS public.gbl_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gbl_matches ENABLE ROW LEVEL SECURITY;

-- 스키마 폴백(허브 미설정 시 agent_work를 쓰는 배포 대비 — 있을 때만 적용)
ALTER TABLE IF EXISTS agent_work.gbl_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_work.gbl_ratings ENABLE ROW LEVEL SECURITY;

-- 정책은 생성하지 않는다: RLS ON + 정책 없음 = service-role만 접근(외부 전면 차단).
-- 확인: SELECT relname, relrowsecurity FROM pg_class
--        WHERE relname LIKE 'gbl_%'; -- 전부 relrowsecurity = true 여야 함
