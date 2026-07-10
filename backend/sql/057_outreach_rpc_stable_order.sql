-- 057: list_outreach_leads 정렬 안정화 — ORDER BY score DESC, id
--
-- 배경: PostgREST 응답 1,000행 상한 우회를 위해 라우터가 RPC를 offset
-- 페이지네이션으로 루프 호출하게 됐는데, ORDER BY score DESC만으로는
-- 동점 리드(D급 582건 등)의 페이지 간 순서가 비결정적 → 중복/누락 가능.
-- id를 2차 정렬키로 추가해 안정화. (함수 본문만 교체 — 시그니처 동일)

CREATE OR REPLACE FUNCTION agent_work.list_outreach_leads(
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
  ORDER BY score DESC, id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

NOTIFY pgrst, 'reload schema';
