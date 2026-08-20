# 아웃리치 CRM — Supabase 대량 에러 정리 요청 (2026-07-08)

> 작성 배경: maesil-total 세션에서 Supabase(haeser productsDB, `pbocckpuiyzijspqpvqz`)
> 대시보드에 Postgres 에러가 24시간 507건 찍히는 것을 조사한 결과,
> 전부 이 레포(maesil-agency)의 아웃리치 CRM에서 발생하는 것으로 확정됨.
> 매실 재고·주문 데이터와는 무관 (별도 `agent_work` 스키마).

## 증상

- Supabase Postgres 로그에 `23505 duplicate key value violates unique constraint
  "outreach_touchpoints_lead_id_touch_sequence_key"` 가 **약 3분 간격으로 2줄씩**, 하루 수백 건.
- 같은 패턴으로 `23505 ... "uniq_alert_events_dedup"` 도 간헐 발생.
- 예시 (2026-07-08 18:25): `Key (lead_id, touch_sequence)=(47d93a82-05ea-4b85-823f-57df3c598aa0, 1) already exists.`
- 데이터 오염은 없음 — 유니크 제약이 중복을 정확히 막고 있고, 2026-07-06 세션에서도
  "정상(dedup 동작)"으로 판정한 바 있음. **문제는 에러 로그 오염**: 진짜 장애가 나도
  대시보드에서 구분이 안 됨 (오늘도 대량 장애로 오인해 조사가 시작됨).

## 근본 원인

`backend/app/services/outreach_pipeline.py` 의 `_schedule_touchpoints()` (약 80행):

```
existing = _db().table("outreach_touchpoints").select("id").eq("lead_id", lead_id).limit(1).execute()
if existing.data:
    return  # 이미 터치포인트 있음
...rows 구성 후 insert
```

**check-then-insert 경합**: 3분 주기 스케줄러(`outreach_followup.check_pending_followups`)와
재스캔이 겹치면 두 요청이 모두 SELECT를 통과 → 늦은 쪽 INSERT가 유니크 제약
`(lead_id, touch_sequence)` 에 걸려 23505 발생. 즉 에러를 중복 방지 수단으로 쓰고 있는 구조.

## 수정 요청

1. `outreach_touchpoints` INSERT를 **upsert + 중복 무시**로 전환:
   - supabase-py: `.upsert(rows, on_conflict="lead_id,touch_sequence", ignore_duplicates=True)`
   - (PostgREST 헤더로는 `Prefer: resolution=ignore-duplicates`)
2. `outreach_touchpoints` 를 insert하는 **모든 경로를 grep으로 전수 확인** 후 같은 패턴이면 함께 전환
   (`backend/app/routers/outreach.py`, `outreach_pipeline.py`, `outreach_followup.py`,
   `outreach_mailer.py` 등).
3. `uniq_alert_events_dedup` 에 걸리는 alert_events insert 경로도 동일하게 upsert 전환.
4. 완료 후 확인: Supabase 대시보드 → Logs → Log Type=postgres 에서 23505가 더 이상
   쌓이지 않는지 30분~1시간 관찰.

## 처리 결과 (2026-07-08, maesil-agency 세션)

- **실제 23505 발생 지점**: 요청서가 지목한 `outreach_pipeline._schedule_touchpoints()`는 이미
  upsert로 전환돼 있었음. 남은 발생원은 `outreach_cold_drip.schedule_daily_cold_drip()`의
  plain insert — 3분 주기 top-up이 전날 seq=1 터치포인트가 남은 리드(`emailed_at` null)를
  매 사이클 다시 후보로 잡아 `(lead_id, 1)` 충돌 → "3분 간격" 패턴의 원인.
- **수정 내역**:
  1. `outreach_cold_drip.py` — insert → `upsert(on_conflict="lead_id,touch_sequence", ignore_duplicates=True)`.
     충돌 행만 건너뛰고 나머지는 삽입 (기존엔 chunk 전체 실패). `scheduled` 카운트도 실삽입 기준으로 수정.
  2. `outreach_pipeline.py` — 기존 upsert에 `ignore_duplicates=True` 추가
     (경합 시 기존 터치포인트 status/sent_at을 pending으로 덮어쓰던 잠재 버그 방지).
  3. `render_logs._insert_event` / `feature_kb.detect_and_report_bug` —
     insert+예외무시 → `upsert(on_conflict="dedup_key", ignore_duplicates=True)`.
  4. `backend/sql/054_alert_events_dedup_full_index.sql` — `uniq_alert_events_dedup`을
     partial → 일반 유니크 인덱스로 교체 (PostgREST가 partial 인덱스를 ON CONFLICT로 추론 못 함).
- **배포 순서**: alert_events upsert에 42P10 폴백(구방식 insert)을 넣어 배포/마이그레이션 순서
  무관하게 안전. 단, **SQL 054를 실행하기 전까지는** alert_events 쪽 23505/42P10 로그 소음이
  계속 남으므로 가급적 빨리 Supabase SQL Editor에서 054 실행할 것.
- insert 경로 전수 확인 완료: `outreach_touchpoints` 삽입은 위 2곳뿐 (나머지는 select/update).
  alert_events는 `program_health._escalate_if_needed`도 insert지만 dedup_key를 쓰지 않아
  유니크 충돌 불가 → 유지.
- 배포 후: Supabase → Logs → Postgres에서 23505 미발생 30분~1시간 관찰 필요.

## 참고 사항

- 이 DB는 **매실 운영 시스템(maesil-total)과 같은 Supabase 인스턴스**(t4g.micro, RAM 51%대)를
  공유함. 스키마는 분리(`agent_work` vs `public`)돼 있지만 리소스는 공유하므로,
  무거운 배치를 추가할 때 매실 쪽 성능에 영향 줄 수 있음을 유의.
- 2026-07-08 18:53의 `42501 permission denied for schema agent_work` 2건은 maesil-total
  세션의 일회성 진단 조회 흔적 — 무시할 것 (재발 안 함).
- 유니크 제약 자체는 **유지할 것** (최후 방어선). upsert 전환은 로그 소음만 없애는 것.
