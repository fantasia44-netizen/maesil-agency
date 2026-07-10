-- 056: outreach_leads_status_check에 'send_failed' 추가
--
-- 배경: outreach_followup(1차 2회 실패 → send_failed 전환)과 email_validation
-- (비실재 이메일 리드 차단)이 status='send_failed'를 쓰는데, 037에서 재생성된
-- CHECK 제약에 이 값이 빠져 있어 UPDATE가 매번 23514로 조용히 실패하고 있었음
-- (try/except에 삼켜져 로그 경고만 남음). 실패 리드가 approved/emailed로 남아
-- 콜드드립 후보로 계속 재선택되는 부작용도 있었음.

ALTER TABLE agent_work.outreach_leads
    DROP CONSTRAINT IF EXISTS outreach_leads_status_check;

ALTER TABLE agent_work.outreach_leads
    ADD CONSTRAINT outreach_leads_status_check CHECK (status IN (
        'discovered', 'analyzing', 'draft_ready', 'approved',
        'emailed', 'replied', 'no_reply', 'negotiating', 'deal',
        'rejected', 'archived', 'unsubscribe', 'blocked', 'send_failed'
    ));

NOTIFY pgrst, 'reload schema';
