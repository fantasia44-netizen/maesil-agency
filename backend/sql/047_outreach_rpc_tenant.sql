-- maesil-agency / 멀티테넌트 SaaS — Phase 1: outreach RPC 테넌트 스코프
-- 실행 위치: maesil-total Supabase → SQL Editor
-- 033을 대체. p_tenant_id(필수) 추가 → 전달 테넌트 데이터만 반환.
-- ⚠️ Phase 2 라우터(p_tenant_id 전달)와 함께 배포.

-- 시그니처가 바뀌므로 기존 함수 DROP 후 재생성(오버로드 방지)
DROP FUNCTION IF EXISTS agent_work.list_outreach_leads(integer,integer,integer,text,text,text,text);
DROP FUNCTION IF EXISTS agent_work.get_outreach_stats();

-- ── 리드 목록 (테넌트 스코프) ──────────────────────────────────────────
CREATE FUNCTION agent_work.list_outreach_leads(
  p_tenant_id    uuid,
  p_min_score    integer DEFAULT 0,
  p_limit        integer DEFAULT 500,
  p_offset       integer DEFAULT 0,
  p_platform     text    DEFAULT NULL,
  p_status       text    DEFAULT NULL,
  p_grade        text    DEFAULT NULL,
  p_channel_type text    DEFAULT NULL
)
RETURNS SETOF agent_work.outreach_leads
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM agent_work.outreach_leads
  WHERE tenant_id = p_tenant_id
    AND score >= p_min_score
    AND (p_platform     IS NULL OR platform     = p_platform)
    AND (p_status       IS NULL OR status       = p_status)
    AND (p_grade        IS NULL OR grade        = p_grade)
    AND (p_channel_type IS NULL OR channel_type = p_channel_type)
  ORDER BY score DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- ── 대시보드 통계 (테넌트 스코프) ──────────────────────────────────────
CREATE FUNCTION agent_work.get_outreach_stats(p_tenant_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_leads',
      (SELECT COUNT(*) FROM agent_work.outreach_leads WHERE tenant_id = p_tenant_id),

    'total_scanned_content',
      (SELECT COUNT(*) FROM agent_work.outreach_scanned_content WHERE tenant_id = p_tenant_id),

    'by_status',
      (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
       FROM (SELECT status, COUNT(*) AS cnt
             FROM agent_work.outreach_leads WHERE tenant_id = p_tenant_id
             GROUP BY status) s),

    'by_grade',
      (SELECT COALESCE(json_object_agg(grade, cnt), '{}'::json)
       FROM (SELECT grade, COUNT(*) AS cnt
             FROM agent_work.outreach_leads WHERE tenant_id = p_tenant_id
             GROUP BY grade) g),

    'by_platform',
      (SELECT COALESCE(json_object_agg(platform, cnt), '{}'::json)
       FROM (SELECT platform, COUNT(*) AS cnt
             FROM agent_work.outreach_leads WHERE tenant_id = p_tenant_id
             GROUP BY platform) p),

    'touches_sent',
      (SELECT COUNT(*) FROM agent_work.outreach_touchpoints
       WHERE tenant_id = p_tenant_id AND status = 'sent'),

    'touches_replied',
      (SELECT COUNT(*) FROM agent_work.outreach_touchpoints
       WHERE tenant_id = p_tenant_id AND status = 'replied')
  )
$$;

GRANT EXECUTE ON FUNCTION agent_work.list_outreach_leads TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION agent_work.get_outreach_stats  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
