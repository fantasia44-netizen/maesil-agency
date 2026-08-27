-- 074_gbl_matches_search_idx.sql
-- GBL 대전기록: 상대 이름 부분검색(조회탭) + 시즌 범위 로드 인덱스.
-- 실행 위치: maesil-hub(기본 public.gbl_matches). agent_work 폴백을 쓰면 아래 public → agent_work 로 교체.
-- 모두 IF NOT EXISTS/멱등 — 이미 있으면 그냥 넘어감. 안전하게 여러 번 실행 가능.

-- 부분일치(ILIKE '%q%') 인덱스를 위한 트라이그램 확장
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ① 시즌/최근 범위 로드용: (user_id, played_at DESC)
--    "내 기록 중 이 기간(시즌)" 을 인덱스로 즉시 범위스캔.
CREATE INDEX IF NOT EXISTS gbl_matches_user_played_idx
  ON public.gbl_matches (user_id, played_at DESC);

-- ② 상대 이름 부분검색(ILIKE '%이름%') 가속: 트라이그램 GIN
--    조회탭에서 상대 이름 일부만 쳐도 전 시즌에서 인덱스로 빠르게 찾음.
CREATE INDEX IF NOT EXISTS gbl_matches_opp_trgm_idx
  ON public.gbl_matches USING gin (opponent_name gin_trgm_ops);

-- (참고) 정확/접두 일치용 기존 인덱스가 없다면 함께:
CREATE INDEX IF NOT EXISTS gbl_matches_user_name_idx
  ON public.gbl_matches (user_id, lower(opponent_name));
