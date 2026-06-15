-- 광고대행사(ad_agency) 리드 지원
-- outreach_leads.platform CHECK 제약에 'ad_agency' 추가.
-- (네이버/쿠팡 공식 광고대행사를 영업 리드로 적재하기 위함)

ALTER TABLE agent_work.outreach_leads
    DROP CONSTRAINT IF EXISTS outreach_leads_platform_check;

ALTER TABLE agent_work.outreach_leads
    ADD CONSTRAINT outreach_leads_platform_check CHECK (platform IN (
        'youtube','naver_blog','tistory','brunch','instagram','naver_cafe',
        'ad_agency'
    ));

-- 적용 후 PostgREST 스키마 캐시 리로드 권장:
--   Supabase → Settings → API → Reload schema cache
