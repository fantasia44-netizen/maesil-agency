-- maesil-agency / Phase A
-- 기존 DB row: autotool → maesil-total 리네이밍
-- Supabase SQL Editor에서 실행 (autotool → maesil-total 전환 후 1회)

-- 1) program_log_cursor (FK 참조 먼저 해제)
update agent_work.program_log_cursor
set program_name = 'maesil-total', updated_at = now()
where program_name = 'autotool';

-- 2) alert_events
update agent_work.alert_events
set program_name = 'maesil-total'
where program_name = 'autotool';

-- 3) program_health
update agent_work.program_health
set program_name = 'maesil-total'
where program_name = 'autotool';

-- 4) program_registry
update agent_work.program_registry
set name         = 'maesil-total',
    display_name = '매실 통합 (Render)',
    updated_at   = now()
where name = 'autotool';

-- 5) db_registry
update agent_work.db_registry
set name         = 'maesil-total',
    display_name = '매실 통합',
    updated_at   = now()
where name = 'autotool';

-- 6) 나머지 시스템 program_registry 추가 (없으면 insert)
insert into agent_work.program_registry (name, display_name, host_provider, is_active, notes)
values
  ('maesil',            '매실 본체',        'render', true, '서비스 ID는 /settings에서 등록'),
  ('maesil-order',      '매실 주문',        'render', true, '서비스 ID는 /settings에서 등록'),
  ('maesil-accounting', '매실 회계',        'render', true, '서비스 ID는 /settings에서 등록')
on conflict (name) do nothing;
