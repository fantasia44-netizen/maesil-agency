-- 076_gbl_traffic_langs_zhtw.sql — 언어별 유입 집계에 대만어(zh-TW) 추가
-- 072가 /en·/ja만 분류하고 /zh-TW는 ELSE(ko)로 잘못 집계하던 문제 수정.
--   /zh-TW/gbl/...    → zh-TW (대만·번체)
-- 실행: maesil-hub(public 스키마) Supabase SQL Editor. CREATE OR REPLACE라 재실행 안전.

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
  WHERE event = 'pageview' AND created_at >= now() - (days || ' days')::interval
  GROUP BY 1 ORDER BY count(*) DESC;
$$;
