-- 072_gbl_traffic_langs.sql — 언어별 유입 집계
-- 공개 콘텐츠는 언어별 "번역"이라 트래픽만 언어별로 나뉨. gbl_visits.path 프리픽스로 언어 도출(별도 컬럼 불필요).
--   /gbl/...          → ko (기본, 프리픽스 없음)
--   /en/gbl/...       → en
--   /ja/gbl/...       → ja
-- 실행: maesil-hub(public 스키마) Supabase SQL Editor. 재실행 안전.

CREATE OR REPLACE FUNCTION public.gbl_traffic_langs(days int DEFAULT 30)
RETURNS TABLE(lang text, pageviews bigint, uniques bigint, sessions bigint)
LANGUAGE sql STABLE AS $$
  SELECT CASE
           WHEN path LIKE '/en/%' OR path = '/en' THEN 'en'
           WHEN path LIKE '/ja/%' OR path = '/ja' THEN 'ja'
           ELSE 'ko'
         END AS lang,
         count(*),
         count(DISTINCT visitor),
         count(DISTINCT session)
  FROM public.gbl_visits
  WHERE event = 'pageview' AND created_at >= now() - (days || ' days')::interval
  GROUP BY 1 ORDER BY count(*) DESC;
$$;
