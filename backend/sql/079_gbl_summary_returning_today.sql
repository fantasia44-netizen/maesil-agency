-- 079_gbl_summary_returning_today.sql
-- '재방문자' 정의 통일 — 076은 "기간 안에서 2일 이상 방문한 사람"이라 days=0(오늘)에선 날짜가 하루뿐이라 항상 0.
-- GA·tcg 관리자와 같은 정의로 변경: 재방문자 = 기간 내 방문자 중 첫 방문(전체 이력 기준)이 기간 시작 이전인 사람
--   → 전체방문자 = 신규(첫 방문이 기간 안) + 재방문(그 전에 온 적 있음). 오늘 탭도 정상 계산.
-- ※ maesil-hub(public 스키마)에서 실행. 재실행 안전(CREATE OR REPLACE, 반환 형식 076과 동일).

CREATE OR REPLACE FUNCTION public.gbl_traffic_summary(days int DEFAULT 30)
RETURNS TABLE(pageviews bigint, uniques bigint, new_visitors bigint, returning_visitors bigint, sessions bigint, avg_dwell numeric, bounce_rate numeric, shares bigint, downloads bigint)
LANGUAGE sql STABLE AS $$
  WITH v AS (
    SELECT * FROM public.gbl_visits
    WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)
  ), pv AS (SELECT * FROM v WHERE event = 'pageview'), s AS (
    SELECT session, count(*) c, extract(epoch FROM (max(created_at)-min(created_at))) dur
    FROM pv WHERE session IS NOT NULL GROUP BY session
  ), fv AS (
    SELECT visitor, min(created_at) fmin FROM public.gbl_visits
    WHERE event = 'pageview' AND visitor IS NOT NULL GROUP BY visitor
  ), active AS (
    SELECT DISTINCT p.visitor, fv.fmin FROM pv p JOIN fv ON fv.visitor = p.visitor WHERE p.visitor IS NOT NULL
  )
  SELECT (SELECT count(*) FROM pv),
         (SELECT count(DISTINCT visitor) FROM pv),
         (SELECT count(*) FROM active WHERE (fmin AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)),
         (SELECT count(*) FROM active WHERE (fmin AT TIME ZONE 'Asia/Seoul')::date <  ((now() AT TIME ZONE 'Asia/Seoul')::date - days)),
         (SELECT count(*) FROM s),
         coalesce((SELECT avg(dur) FROM s), 0),
         coalesce((SELECT avg((c=1)::int)::numeric FROM s), 0),
         (SELECT count(*) FROM v WHERE event = 'share'),
         (SELECT count(*) FROM v WHERE event = 'download');
$$;
