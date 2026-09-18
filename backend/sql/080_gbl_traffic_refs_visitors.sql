-- 080_gbl_traffic_refs_visitors.sql
-- 유입 경로를 "페이지뷰"가 아니라 "실제 유입 방문자" 기준으로.
-- 기존: ref별 pageview 수 → 사이트 내 이동(ref 빈값)이 전부 '(직접)'에 쌓여 방문객 85명인데 직접 203처럼 부풀어 보임.
-- 변경: 세션의 **첫 페이지뷰 리퍼러 = 그 세션의 유입 경로**로 귀속.
--   visitors = 그 경로로 들어온 고유 방문자 수(주 지표)
--   views    = 그 경로로 들어온 세션들이 본 전체 페이지뷰(보조) → 합계 = 전체 페이지뷰
-- 기간은 078/079와 동일하게 KST 달력일 기준(days=0 = 오늘).
-- ※ maesil-hub(public 스키마)에서 실행. 반환 컬럼이 바뀌므로 DROP 후 CREATE(재실행 안전).

DROP FUNCTION IF EXISTS public.gbl_traffic_refs(int, int);

CREATE FUNCTION public.gbl_traffic_refs(days int DEFAULT 7, lim int DEFAULT 15)
RETURNS TABLE(ref text, visitors bigint, views bigint)
LANGUAGE sql STABLE AS $$
  WITH pv AS (
    SELECT id, created_at, visitor,
           coalesce(session, visitor, id::text) AS sk,   -- 세션 키(세션 토큰 없으면 방문자·행 단위 폴백)
           nullif(ref, '') AS ref
    FROM public.gbl_visits
    WHERE event = 'pageview'
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - days)
  ), entry AS (                                           -- 세션별 첫 페이지뷰의 리퍼러 = 유입 경로
    SELECT DISTINCT ON (sk) sk, coalesce(ref, '(직접)') AS ref
    FROM pv ORDER BY sk, created_at, id
  )
  SELECT e.ref,
         count(DISTINCT coalesce(p.visitor, p.sk)) AS visitors,
         count(*) AS views
  FROM pv p JOIN entry e ON e.sk = p.sk
  GROUP BY e.ref
  ORDER BY visitors DESC, views DESC
  LIMIT lim;
$$;
