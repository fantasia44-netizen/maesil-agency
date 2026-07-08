-- 054: alert_events dedup 인덱스를 partial → 일반 유니크 인덱스로 교체
--
-- 배경: upsert(on_conflict="dedup_key", ignore_duplicates=True) 전환
--   (render_logs._insert_event, feature_kb.detect_and_report_bug)
--   PostgREST가 생성하는 ON CONFLICT (dedup_key) DO NOTHING 은
--   partial 인덱스(WHERE dedup_key IS NOT NULL)를 추론하지 못해 42P10 에러 발생.
--   Postgres 유니크 인덱스는 NULL을 서로 다른 값으로 취급하므로
--   WHERE 절을 제거해도 동작은 동일 (dedup_key 없는 행은 계속 무제한 허용).
--
-- ⚠️ 이 마이그레이션을 먼저 실행한 뒤 백엔드를 배포할 것.

DROP INDEX IF EXISTS agent_work.uniq_alert_events_dedup;

CREATE UNIQUE INDEX uniq_alert_events_dedup
    ON agent_work.alert_events(dedup_key);
