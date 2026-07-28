-- 063: 채널 생존 검증 — 삭제·정지된(날아간) 채널 표시
--
-- 오래전 수집한 리드 중 그 사이 삭제/정지된 유튜브 채널이 섞여 있음.
-- YouTube channels.list로 실재 여부를 검증해 channel_dead=true 표시 →
-- 목록·인터뷰 후보에서 제외.
-- 실행 위치: maesil-total Supabase → agent_work 스키마

ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS channel_dead BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 심층 검증: 최근 영상 스크립트까지 읽고 Claude가 인터뷰 여부 판정한 근거
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS interview_verdict TEXT;
ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS deep_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS outreach_leads_dead_idx
    ON agent_work.outreach_leads (tenant_id, channel_dead);

-- 목록 RPC: 날아간(삭제·정지) 채널은 모든 탭에서 제외
CREATE OR REPLACE FUNCTION agent_work.list_outreach_leads(
  p_tenant_id    uuid,
  p_min_score    integer DEFAULT 0,
  p_limit        integer DEFAULT 500,
  p_offset       integer DEFAULT 0,
  p_platform     text    DEFAULT NULL,
  p_status       text    DEFAULT NULL,
  p_grade        text    DEFAULT NULL,
  p_channel_type text    DEFAULT NULL,
  p_campaign     text    DEFAULT NULL
)
RETURNS SETOF agent_work.outreach_leads
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM agent_work.outreach_leads
  WHERE tenant_id = p_tenant_id
    AND score >= p_min_score
    AND channel_dead IS NOT TRUE          -- 날아간 채널 제외
    AND (p_platform     IS NULL OR platform     = p_platform)
    AND (p_status       IS NULL OR status       = p_status)
    AND (p_grade        IS NULL OR grade        = p_grade)
    AND (p_channel_type IS NULL OR channel_type = p_channel_type)
    AND (
      p_campaign IS NULL
      OR campaign = p_campaign
      OR (p_campaign = 'interview' AND interview_candidate = TRUE)
    )
  ORDER BY score DESC, id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

NOTIFY pgrst, 'reload schema';
