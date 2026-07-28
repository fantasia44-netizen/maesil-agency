-- 061: 아웃리치 캠페인 분리 — 파트너 모집 vs 인터뷰/출연 협업
--
-- 방향 전환: 콜드 파트너모집 중단 → 매실K 인지도(인터뷰 출연) 중심.
-- 같은 outreach_leads에 campaign 축을 추가해 두 파이프라인을 분리 관리.
--   partner   : 기존 파트너 모집 대상 (강사/셀러) — 기존 리드 전부 이관
--   interview : 내가 출연할 인터뷰/협업 채널 (새 수집)
-- 실행 위치: maesil-total Supabase → agent_work 스키마
-- ※ 라우터 배포보다 먼저 실행하세요 (RPC 시그니처 변경 포함).

ALTER TABLE agent_work.outreach_leads
    ADD COLUMN IF NOT EXISTS campaign TEXT NOT NULL DEFAULT 'partner';

-- 기존 리드는 전부 파트너 캠페인 (명시적 백필)
UPDATE agent_work.outreach_leads SET campaign = 'partner' WHERE campaign IS NULL;

CREATE INDEX IF NOT EXISTS outreach_leads_campaign_idx
    ON agent_work.outreach_leads (tenant_id, campaign, score DESC);

-- 목록 RPC에 campaign 필터 추가 (9번째 파라미터). 기존 8-arg 시그니처는 제거.
DROP FUNCTION IF EXISTS agent_work.list_outreach_leads(
    uuid, integer, integer, integer, text, text, text, text);

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
    AND (p_campaign     IS NULL OR campaign      = p_campaign)
  ORDER BY score DESC, id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- 캠페인별 카운트 (탭 뱃지·요약용)
CREATE OR REPLACE FUNCTION agent_work.outreach_campaign_counts(p_tenant_id uuid)
RETURNS TABLE(campaign text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT campaign, COUNT(*) FROM agent_work.outreach_leads
  WHERE tenant_id = p_tenant_id
  GROUP BY campaign;
$$;

NOTIFY pgrst, 'reload schema';
