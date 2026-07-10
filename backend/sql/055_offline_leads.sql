-- 055: 오프라인 B2B 영업 파이프라인 관리 (offline_leads + offline_activities)
--
-- 배경: 2026-07-10 오프라인 영업 10개 업체 리뷰에서 확인된 관리 구멍 —
--   체험 만료 방치(대광·인덕식품·바다마트), 코칭 주기 누락, next_action 실종.
--   전환 병목 = 온보딩(전담직원 부재/역량), 성공 변수 = 대표 관여도 + 정기 코칭.
-- 실행 위치: maesil-total Supabase → agent_work 스키마

CREATE TABLE IF NOT EXISTS agent_work.offline_leads (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name          TEXT NOT NULL UNIQUE,
    industry              TEXT,
    stage                 TEXT NOT NULL DEFAULT 'contacted',
        -- contacted(접촉) | meeting(미팅/시작예정) | trial(체험중) | coaching(사용중·코칭)
        -- | subscribed(유료전환) | partner(파트너) | stalled(정체) | churned(이탈)
    owner_engagement      TEXT,        -- high | medium | low  (대표 관여도 — 전환 핵심 변수)
    has_dedicated_staff   BOOLEAN,     -- 온라인 전담직원 유무
    staff_capability      TEXT,        -- high | medium | low  (담당자 역량)
    trial_started_at      DATE,
    trial_ends_at         DATE,
    subscribed_at         DATE,
    coaching_cadence_days INTEGER,     -- 정기 코칭 주기(일). 예: 승우비엔 7
    next_action           TEXT,
    next_action_due       DATE,
    last_contact_at       DATE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT offline_stage_check CHECK (stage IN (
        'contacted','meeting','trial','coaching','subscribed','partner','stalled','churned'
    ))
);

CREATE INDEX IF NOT EXISTS offline_leads_stage_idx  ON agent_work.offline_leads (stage);
CREATE INDEX IF NOT EXISTS offline_leads_due_idx    ON agent_work.offline_leads (next_action_due);
CREATE INDEX IF NOT EXISTS offline_leads_trial_idx  ON agent_work.offline_leads (trial_ends_at);

CREATE TABLE IF NOT EXISTS agent_work.offline_activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     UUID NOT NULL REFERENCES agent_work.offline_leads(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL DEFAULT 'note',  -- visit | call | kakao | coaching | meeting | note
    summary     TEXT NOT NULL,
    happened_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offline_activities_lead_idx
    ON agent_work.offline_activities (lead_id, happened_at DESC);

GRANT ALL PRIVILEGES ON agent_work.offline_leads      TO service_role;
GRANT ALL PRIVILEGES ON agent_work.offline_activities TO service_role;

-- ── 시드: 2026-07-10 기준 오프라인 영업 현황 10개 업체 ─────────────────
INSERT INTO agent_work.offline_leads
    (company_name, industry, stage, owner_engagement, has_dedicated_staff, staff_capability,
     coaching_cadence_days, next_action, next_action_due, last_contact_at, notes)
VALUES
    ('승우비엔', '쿠팡 1P', 'coaching', 'high', false, NULL, 7,
     '주1회 전화 코칭 유지', CURRENT_DATE + 7, CURRENT_DATE,
     '광고비 부담 큼·매출 정체. 실사용 정착까지 2달 소요, 현재 2달째 사용 중. 매주 전화 코칭.'),
    ('기장물산', '식품 유통', 'coaching', 'high', true, 'low', 14,
     '직원 실사용 점검 방문', CURRENT_DATE + 14, CURRENT_DATE,
     '온라인 담당 5명이나 역량 부족, 매출 미비. 대표와 친분·영업 1회 만에 사용 시작. 2회 방문 코칭, 대표에게 사용 설명 수차례.'),
    ('대광', '김치 수출', 'stalled', 'medium', false, 'low', NULL,
     '재방문 — 담당 직원과 첫 세팅 동행', CURRENT_DATE + 7, NULL,
     '오프라인 위주, 온라인은 외부 위탁·전담 없음. 매실스튜디오 쓰다 직접 블로그 운영. 트라이얼 만료 후 방치. 대표는 친분으로 사용 의사 있으나 직원이 몰라서 정체.'),
    ('푸른식품', '고춧가루 B2B', 'meeting', 'high', false, NULL, NULL,
     '상품 준비부터 코칭 시작', CURRENT_DATE + 7, NULL,
     '오로지 B2B 납품. 2년 전 온라인 시도 후 중단. "상품 준비부터 코칭해주겠다" 제안에 시작 결정.'),
    ('대신물산', '곤약 온라인', 'churned', 'low', true, 'medium', NULL,
     NULL, NULL, NULL,
     '월 5,000개→3,000개 감소로 방문 영업. 대표가 온라인 담당자에게 넘기고 자리 이탈 → "좋겠네요, 한번 써볼게요" 후 가입 안 함. 대표 관여 없으면 실패하는 전형.'),
    ('부산해운대달맞이', '빵공장 (컬리 납품)', 'meeting', 'high', false, NULL, NULL,
     '쿠팡 입점 첫 세팅 코칭', CURRENT_DATE + 7, NULL,
     '컬리 납품 2달째, 쿠팡 시작하려던 시점에 방문 — "너무 감사하다, 준비해서 꼭 하고 싶다". 처음부터 코칭 요청. 반응 최상.'),
    ('인덕식품', '떡공장·수출', 'stalled', 'high', true, 'low', NULL,
     '체험 재개 + 담당자 숙제 점검', CURRENT_DATE + 7, NULL,
     '온라인 매출 10만원 미만, 이제 시작 단계. 대표는 즉시 하겠다 결정. 담당자가 품질 겸직이라 매우 느림(숙제는 해오는 편). 체험 만료, 구독 전환 안 됨.'),
    ('씨몬트서', '생선 브랜드', 'churned', 'low', true, 'medium', NULL,
     NULL, NULL, NULL,
     '직원 4명 온라인 영업/판매, 광고비 월 300만원 이하, 자사몰·네이버 위주(쿠팡 비중 낮음). 설명에 인사만 한 정도, 사용 의지 없음.'),
    ('애이엔', '3PL 물류 + 온라인 판매', 'partner', 'high', true, 'high', NULL,
     '파트너 조건 확정 + 온보딩', CURRENT_DATE + 3, CURRENT_DATE,
     '쿠팡 광고 이해도 최상(엑셀 수동 세팅 실사용, 네이버 어뷰징·트래픽까지 경험). 실사용 후 호평, 자기 고객사 영업 + 파트너 프로그램 논의 완료. 파트너 1호 최우선 후보.'),
    ('바다마트', '수산물 유통', 'stalled', 'medium', false, 'low', NULL,
     '네이버 판매자 권한 해결 + 쿠팡 API 연결 지원', CURRENT_DATE + 7, NULL,
     '쿠팡/네이버 소량 판매, 광고 거의 안 돌림. 네이버 판매자 권한 문제로 API 연결 실패, 쿠팡은 타 수집 프로그램 사용 중이라 연결 정체. 본업(수산물 유통)상 필요·의사 있으나 체험 기간 만료.')
ON CONFLICT (company_name) DO NOTHING;

-- 시드 리드의 접촉일 보정: 정확한 일자 미상 → 최근 방문한 것으로 간주(-7일).
-- 비워두면 배포 직후 '접촉 기록 없음' 알림이 일괄 발행되므로 기준일을 깔아준다.
-- (7일 뒤부터 stale/코칭주기 알림이 자연스럽게 작동 시작)
UPDATE agent_work.offline_leads
   SET last_contact_at = CURRENT_DATE - 7
 WHERE last_contact_at IS NULL AND stage NOT IN ('churned');

NOTIFY pgrst, 'reload schema';
