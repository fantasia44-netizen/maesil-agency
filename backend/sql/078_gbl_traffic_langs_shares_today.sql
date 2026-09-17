-- 078_gbl_traffic_langs_shares_today.sql
-- gbl_traffic_langs / gbl_traffic_shares / gbl_traffic_daily 가 롤링 윈도우(created_at >= now() - N일)라
-- days=0(관리자 '오늘' 탭)이면 'now() 이후'만 잡혀 빈 결과 → 화면에 "SQL 072/068 실행 여부 확인"으로 오인 표시되던 버그.
-- 076_gbl_summary_today.sql과 같은 달력 날짜(KST) 기준으로 통일 → days=0 = 오늘 당일, days=7 = 오늘 포함 8일.
-- ※ maesil-hub(public 스키마, gbl_visits 있는 곳)에서 실행. 재실행 안전(CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.gbl_traffic_langs(days int DEFAULT 30)
RETURNS TABLE(lang text, pageviews bigint, uniques bigint, sessions bigint)
LANGUAGE sql STABLE AS $$
  SELECT CASE
           WHEN path LIKE '/en/%' OR path = '/en' THEN 'en'
           WHEN path LIKE '/ja/%' OR path = '/ja' THEN 'ja'
           WHEN path LIKE '/zh-TW/%' OR path = '/zh-TW' THEN 'zh-TW'
           ELSE 'ko'
         END AS lang,
         count(*),
         count(DISTINCT visitor),
         count(DISTINCT session)
  FROM public.gbl_visits
  WHERE event = 'pageview'
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)
  GROUP BY 1 ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION public.gbl_traffic_shares(days int DEFAULT 30, lim int DEFAULT 20)
RETURNS TABLE(label text, shares bigint, downloads bigint, total bigint)
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(label,''), '(기타)') AS label,
         count(*) FILTER (WHERE event = 'share'),
         count(*) FILTER (WHERE event = 'download'),
         count(*)
  FROM public.gbl_visits
  WHERE event IN ('share','download')
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)
  GROUP BY 1 ORDER BY count(*) DESC LIMIT lim;
$$;

-- 일별 추이도 같은 기준(오늘 탭에서 오늘 한 줄이 나오도록)
CREATE OR REPLACE FUNCTION public.gbl_traffic_daily(days int DEFAULT 30)
RETURNS TABLE(day date, pageviews bigint, uniques bigint, new_visitors bigint, sessions bigint)
LANGUAGE sql STABLE AS $$
  WITH fv AS (
    SELECT visitor, min((created_at AT TIME ZONE 'Asia/Seoul')::date) fd
    FROM public.gbl_visits WHERE event = 'pageview' AND visitor IS NOT NULL GROUP BY visitor
  )
  SELECT (v.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
         count(*),
         count(DISTINCT v.visitor),
         count(DISTINCT v.visitor) FILTER (WHERE (v.created_at AT TIME ZONE 'Asia/Seoul')::date = fv.fd),
         count(DISTINCT v.session)
  FROM public.gbl_visits v LEFT JOIN fv ON v.visitor = fv.visitor
  WHERE v.event = 'pageview'
    AND (v.created_at AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)
  GROUP BY 1 ORDER BY 1;
$$;
