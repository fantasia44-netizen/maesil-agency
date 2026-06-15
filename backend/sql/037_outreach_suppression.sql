-- 영업 이메일 수신거부/차단 관리 (정보통신망법 컴플라이언스)
--
-- 1) outreach_suppression: 발송 금지 목록 (이메일 단위 영구 차단)
-- 2) outreach_leads.status 에 'unsubscribe','blocked' 추가

CREATE TABLE IF NOT EXISTS agent_work.outreach_suppression (
    email        TEXT PRIMARY KEY,
    reason       TEXT,                         -- unsubscribe | bounce | complaint | manual
    source       TEXT,                         -- link | reply | admin
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 발송 상태값 확장
ALTER TABLE agent_work.outreach_leads
    DROP CONSTRAINT IF EXISTS outreach_leads_status_check;

ALTER TABLE agent_work.outreach_leads
    ADD CONSTRAINT outreach_leads_status_check CHECK (status IN (
        'discovered','analyzing','draft_ready','approved','emailed',
        'replied','no_reply','negotiating','deal','rejected','archived',
        'unsubscribe','blocked'
    ));

-- 적용 후 PostgREST 스키마 캐시 리로드 권장.
