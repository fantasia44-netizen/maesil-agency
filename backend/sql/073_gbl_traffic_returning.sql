-- 073_gbl_traffic_returning.sql
-- 방문 요약에 재방문자 지표 추가(총방문/신규/재방문 3분할). GA의 returning 취지.
-- 재방문자 = 기간 내 2일 이상(서로 다른 날) 방문한 방문자. 신규(첫 방문)와는 별개 관점이라 겹칠 수 있음(GA와 동일).
-- ※ maesil-hub(public 스키마)에서 실행 — gbl_visits 테이블이 있는 곳(068과 동일 프로젝트). 에이전시(maesil-total) 아님!
-- ※ 반환 컬럼(재방문자) 추가라 DROP 후 재생성. 재실행 안전.

DROP FUNCTION IF EXISTS public.gbl_traffic_summary(integer);

CREATE OR REPLACE FUNCTION public.gbl_traffic_summary(days int DEFAULT 30)
RETURNS TABLE(pageviews bigint, uniques bigint, new_visitors bigint, returning_visitors bigint, sessions bigint, avg_dwell numeric, bounce_rate numeric, shares bigint, downloads bigint)
LANGUAGE sql STABLE AS $$
  WITH v AS (
    SELECT * FROM public.gbl_visits WHERE created_at >= now() - (days || ' days')::interval
  ), pv AS (SELECT * FROM v WHERE event = 'pageview'), s AS (
    SELECT session, count(*) c, extract(epoch FROM (max(created_at)-min(created_at))) dur
    FROM pv WHERE session IS NOT NULL GROUP BY session
  ), fv AS (
    SELECT visitor, min(created_at) fmin FROM public.gbl_visits
    WHERE event = 'pageview' AND visitor IS NOT NULL GROUP BY visitor
  )
  SELECT (SELECT count(*) FROM pv),
         (SELECT count(DISTINCT visitor) FROM pv),
         (SELECT count(*) FROM fv WHERE fmin >= now() - (days || ' days')::interval),
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
