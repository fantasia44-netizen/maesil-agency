-- 034_reset_naver_blog_scan.sql
-- 네이버 블로그 스캔 이력 초기화.
-- 배경: _MIN_CONTENT_LEN=300 버그로 모든 포스트가 처리 없이 scanned 기록됨
--       → filter_already_scanned가 항상 빈 배열 반환 → 영구 0건 발굴.
-- 새 로직은 outreach_leads(blog_id 단위)로 중복 체크하므로
-- outreach_scanned_content 초기화 후 재스캔하면 정상 작동.

-- 1) 네이버 블로그 스캔 이력 전체 삭제
DELETE FROM agent_work.outreach_scanned_content
WHERE platform = 'naver_blog';

-- 2) 확인
SELECT COUNT(*) AS remaining_naver_blog_scanned
FROM agent_work.outreach_scanned_content
WHERE platform = 'naver_blog';
