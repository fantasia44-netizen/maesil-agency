-- 071_gbl_posts_lang.sql — 게시판 언어별 분리
-- 게시판(gbl_posts)은 유저 생성 콘텐츠라 언어별로 데이터가 다름(공개 콘텐츠와 달리 "번역"이 아니라 별개 커뮤니티).
-- post.lang = 작성 시점 URL 로케일(ko/en/ja). 회원여부(auth)와는 독립 축.
-- 실행: Supabase SQL Editor. 재실행 안전(IF NOT EXISTS).

ALTER TABLE public.gbl_posts
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ko';

-- 기존 글은 전부 ko로 남음(위 DEFAULT). 언어별 목록 조회 인덱스.
CREATE INDEX IF NOT EXISTS idx_gbl_posts_board_lang
  ON public.gbl_posts (board, lang, created_at DESC);
