-- 067_gbl_ratings.sql
-- GBL 레이팅(점수) 기록 — 유저가 시점별 레이팅을 남기고 추이 그래프로 봄.
-- gbl_matches와 함께 maesil-hub(public 스키마)에서 실행.
-- ※ hub 미사용(폴백) 환경이면 agent_work 스키마에 동일 생성 필요.

CREATE TABLE IF NOT EXISTS public.gbl_ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL,
    league      text NOT NULL DEFAULT 'master',
    profile     text,              -- 다계정(본계/부계) 라벨. null=기본. 멀티계정 대비
    rating      integer NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gbl_ratings_user
    ON public.gbl_ratings (user_id, league, recorded_at);
