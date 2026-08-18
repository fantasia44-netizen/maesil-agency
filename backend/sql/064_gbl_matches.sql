-- 064: 포켓몬 GO GBL 상대 대전 기록 (개인 도구, 유저 스코프)
--
-- 목적: GBL에서 만난 상대 트레이너명 + 사용 개체 3종 + 기술 + 턴메모를 기록해두고,
--       다음에 같은 상대가 뜨면 이름으로 즉시 과거 이력 조회.
-- 데이터셋(포켓몬·기술 한글명/스프라이트)은 프론트에 번들 → DB엔 speciesId/moveId만 저장.
-- 실행 위치: maesil-total Supabase → agent_work 스키마
-- team_json 예: [{"speciesId":"metagross","fast":"BULLET_PUNCH","charged":["METEOR_MASH","EARTHQUAKE"],"note":"3타에 지진"}]

CREATE TABLE IF NOT EXISTS agent_work.gbl_matches (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL,
    league         text NOT NULL DEFAULT 'master',
    opponent_name  text NOT NULL,
    team_json      jsonb NOT NULL DEFAULT '[]'::jsonb,
    memo           text,
    result         text,           -- 'win' | 'loss' | NULL
    played_at      timestamptz NOT NULL DEFAULT now(),
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- 이름 검색(대소문자 무시) + 유저 스코프
CREATE INDEX IF NOT EXISTS gbl_matches_user_name_idx
    ON agent_work.gbl_matches (user_id, lower(opponent_name));

-- 최근순 목록
CREATE INDEX IF NOT EXISTS gbl_matches_user_played_idx
    ON agent_work.gbl_matches (user_id, played_at DESC);

NOTIFY pgrst, 'reload schema';
