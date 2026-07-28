-- 062: 기존 발굴 리드에서 인터뷰/출연 겸용 후보 표시
--
-- 새 인터뷰 스캔(campaign='interview')과 별개로, 이미 수집한 파트너 리드 중
-- "셀러 시청자 + 충분한 도달"인 채널은 매실K 출연 후보로도 가치 있음.
-- campaign은 그대로 두고(리드 이동 X), interview_candidate 플래그로 겸용 표시 →
-- 인터뷰 탭에서 campaign='interview' + interview_candidate=true 를 함께 보여줌.
-- 실행 위치: maesil-total Supabase → agent_work 스키마

ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS interview_candidate BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS outreach_leads_interview_cand_idx
    ON agent_work.outreach_leads (tenant_id, interview_candidate)
    WHERE interview_candidate = TRUE;

-- 목록 RPC: p_campaign='interview'면 interview_candidate=true 도 함께 반환(겸용)
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
