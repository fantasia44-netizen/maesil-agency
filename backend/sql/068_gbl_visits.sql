-- 068_gbl_visits.sql
-- GBL Note 자체 방문 통계(1st-party analytics). GA4와 별개로 방문/순방문자/세션/체류/유입/공유 집계.
-- maesil-hub(public 스키마)에서 실행. 백엔드가 서비스 롤로 insert → RLS 켜도 안전.

CREATE TABLE IF NOT EXISTS public.gbl_visits (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    day        date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
    event      text NOT NULL DEFAULT 'pageview',  -- pageview | share | download
    visitor    text,   -- 익명 방문자 토큰(localStorage). PII 아님.
    session    text,   -- 익명 세션 토큰(sessionStorage)
    path       text,
    ref        text,   -- 유입 referrer 호스트
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbl_visits_day  ON public.gbl_visits (day);
CREATE INDEX IF NOT EXISTS idx_gbl_visits_sess ON public.gbl_visits (session);
CREATE INDEX IF NOT EXISTS idx_gbl_visits_recent ON public.gbl_visits (created_at);

ALTER TABLE public.gbl_visits ENABLE ROW LEVEL SECURITY;  -- 서비스 롤만(외부 차단)

-- 일별 집계(페이지뷰 기준)
CREATE OR REPLACE FUNCTION public.gbl_traffic_daily(days int DEFAULT 30)
RETURNS TABLE(day date, pageviews bigint, uniques bigint, sessions bigint)
LANGUAGE sql STABLE AS $$
  SELECT day, count(*), count(DISTINCT visitor), count(DISTINCT session)
  FROM public.gbl_visits
  WHERE event = 'pageview' AND day >= ((now() AT TIME ZONE 'utc')::date - days)
  GROUP BY day ORDER BY day;
$$;

-- 기간 요약(순방문자·세션·평균체류·이탈률·공유·다운로드)
CREATE OR REPLACE FUNCTION public.gbl_traffic_summary(days int DEFAULT 30)
RETURNS TABLE(pageviews bigint, uniques bigint, sessions bigint, avg_dwell numeric, bounce_rate numeric, shares bigint, downloads bigint)
LANGUAGE sql STABLE AS $$
  WITH v AS (
    SELECT * FROM public.gbl_visits WHERE day >= ((now() AT TIME ZONE 'utc')::date - days)
  ), pv AS (SELECT * FROM v WHERE event = 'pageview'), s AS (
    SELECT session, count(*) c, extract(epoch FROM (max(created_at)-min(created_at))) dur
    FROM pv WHERE session IS NOT NULL GROUP BY session
  )
  SELECT (SELECT count(*) FROM pv),
         (SELECT count(DISTINCT visitor) FROM pv),
         (SELECT count(*) FROM s),
         coalesce((SELECT avg(dur) FROM s), 0),
         coalesce((SELECT avg((c=1)::int)::numeric FROM s), 0),
         (SELECT count(*) FROM v WHERE event = 'share'),
         (SELECT count(*) FROM v WHERE event = 'download');
$$;

-- 실시간 활성(최근 30분)
CREATE OR REPLACE FUNCTION public.gbl_traffic_active()
RETURNS TABLE(active_30m bigint, pv_30m bigint)
LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT visitor), count(*) FROM public.gbl_visits
  WHERE event = 'pageview' AND created_at > now() - interval '30 minutes';
$$;

-- 상위 페이지
CREATE OR REPLACE FUNCTION public.gbl_traffic_paths(days int DEFAULT 7, lim int DEFAULT 15)
RETURNS TABLE(path text, views bigint)
LANGUAGE sql STABLE AS $$
  SELECT path, count(*) FROM public.gbl_visits
  WHERE event = 'pageview' AND day >= ((now() AT TIME ZONE 'utc')::date - days) AND path IS NOT NULL
  GROUP BY path ORDER BY count(*) DESC LIMIT lim;
$$;

-- 상위 유입원
CREATE OR REPLACE FUNCTION public.gbl_traffic_refs(days int DEFAULT 7, lim int DEFAULT 15)
RETURNS TABLE(ref text, views bigint)
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(ref,''), '(직접/앱)'), count(*) FROM public.gbl_visits
  WHERE event = 'pageview' AND day >= ((now() AT TIME ZONE 'utc')::date - days)
  GROUP BY 1 ORDER BY count(*) DESC LIMIT lim;
$$;
