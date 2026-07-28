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

CREATE INDEX IF NOT EXISTS outreach_leads_dead_idx
    ON agent_work.outreach_leads (tenant_id, channel_dead);

NOTIFY pgrst, 'reload schema';
