-- 076_gbl_summary_today.sql
-- gbl_traffic_summary가 롤링 윈도우(created_at >= now() - N일)라 days=0이면 'now() 이후'만 잡혀
-- 오늘 KPI가 0으로 나오던 버그 수정. 달력 날짜(KST) 기준으로 통일 → days=0 = 오늘 당일.
-- (refs/paths는 이미 day >= today - days 달력 방식이라 정상이었음. summary만 불일치.)
-- ※ maesil-hub(public 스키마, gbl_visits 있는 곳)에서 실행. 재실행 안전(CREATE OR REPLACE).

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
  )
  SELECT (SELECT count(*) FROM pv),
         (SELECT count(DISTINCT visitor) FROM pv),
         (SELECT count(*) FROM fv WHERE (fmin AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)),
         (SELECT count(*) FROM (
            SELECT visitor FROM pv WHERE visitor IS NOT NULL
            GROUP BY visitor HAVING count(DISTINCT (created_at AT TIME ZONE 'Asia/Seoul')::date) >= 2
         ) r),
         (SELECT count(*) FROM s),
         coalesce((SELECT avg(dur) FROM s), 0),
         coalesce((SELECT avg((c=1)::int)::numeric FROM s), 0),
         (SELECT count(*) FROM v WHERE event = 'share'),
         (SELECT count(*) FROM v WHERE event = 'download');
$$;
