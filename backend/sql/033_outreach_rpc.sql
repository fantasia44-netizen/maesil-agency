-- 033_outreach_rpc.sql
-- outreach 리드 목록 + 통계 RPC
-- scan_stats의 풀스캔+Python 집계를 SQL GROUP BY로 교체

-- ── 리드 목록 ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agent_work.list_outreach_leads(
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
  WHERE score >= p_min_score
    AND (p_platform     IS NULL OR platform     = p_platform)
    AND (p_status       IS NULL OR status       = p_status)
    AND (p_grade        IS NULL OR grade        = p_grade)
    AND (p_channel_type IS NULL OR channel_type = p_channel_type)
  ORDER BY score DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- ── 대시보드 통계 (GROUP BY → 단일 왕복) ────────────────────────────
CREATE OR REPLACE FUNCTION agent_work.get_outreach_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_leads',
      (SELECT COUNT(*) FROM agent_work.outreach_leads),

    'total_scanned_content',
      (SELECT COUNT(*) FROM agent_work.outreach_scanned_content),

    'by_status',
      (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
       FROM (SELECT status, COUNT(*) AS cnt
             FROM agent_work.outreach_leads GROUP BY status) s),

    'by_grade',
      (SELECT COALESCE(json_object_agg(grade, cnt), '{}'::json)
       FROM (SELECT grade, COUNT(*) AS cnt
             FROM agent_work.outreach_leads GROUP BY grade) g),

    'by_platform',
      (SELECT COALESCE(json_object_agg(platform, cnt), '{}'::json)
       FROM (SELECT platform, COUNT(*) AS cnt
             FROM agent_work.outreach_leads GROUP BY platform) p),

    'touches_sent',
      (SELECT COUNT(*) FROM agent_work.outreach_touchpoints WHERE status = 'sent'),

    'touches_replied',
      (SELECT COUNT(*) FROM agent_work.outreach_touchpoints WHERE status = 'replied')
  )
$$;

GRANT EXECUTE ON FUNCTION agent_work.list_outreach_leads TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION agent_work.get_outreach_stats  TO authenticated, service_role;
