-- maesil-agency / Phase A
-- 기존 DB row: autotool → maesil-total 리네이밍
-- FK 순서 주의: program_registry.db_registry_name → db_registry.name 참조 때문에
-- db_registry를 먼저 바꾸면 FK 위반 → 임시 null 처리 후 순서대로 진행

-- 1) program_log_cursor (FK → program_registry.name)
update agent_work.program_log_cursor
set program_name = 'maesil-total', updated_at = now()
where program_name = 'autotool';

-- 2) alert_events (FK → program_registry.name, on delete set null이지만 명시)
update agent_work.alert_events
set program_name = 'maesil-total'
where program_name = 'autotool';

-- 3) program_health (FK → program_registry.name)
update agent_work.program_health
set program_name = 'maesil-total'
where program_name = 'autotool';

-- 4) program_registry.db_registry_name FK 참조 임시 null 처리
update agent_work.program_registry
set db_registry_name = null
where db_registry_name = 'autotool';

-- 5) db_registry 이름 변경 (이제 참조 없음)
update agent_work.db_registry
set name         = 'maesil-total',
    display_name = '매실 통합',
    updated_at   = now()
where name = 'autotool';

-- 6) program_registry 이름 + db_registry_name 복원
update agent_work.program_registry
set name             = 'maesil-total',
    display_name     = '매실 통합 (Render)',
    db_registry_name = 'maesil-total',
    updated_at       = now()
where name = 'autotool';

-- 7) 나머지 프로그램 추가 (없으면 insert)
insert into agent_work.program_registry (name, display_name, host_provider, is_active, notes)
values
  ('maesil',            '매실 본체',  'render', true, '서비스 ID는 /settings에서 등록'),
  ('maesil-order',      '매실 주문',  'render', true, '서비스 ID는 /settings에서 등록'),
  ('maesil-accounting', '매실 회계',  'render', true, '서비스 ID는 /settings에서 등록')
on conflict (name) do nothing;
