# maesil-agency

운영자 1인의 AI 비서 팀 오케스트레이션 콘솔. 설계는 [DESIGN.md](./DESIGN.md) 참조.

## 현재 상태

**Phase 1 Day 1** — 리포 스캐폴드 + 최소 뼈대.
- `agent_work` 스키마 + 레지스트리 SQL
- FastAPI 뼈대 (`/health`, `/api/secrets`, `/api/widgets/system-status`)
- Next.js 뼈대 (대시보드 + 설정 페이지)

> 실제 상태 수집(Render/Supabase API 호출)과 스케줄러는 Day 2~3에서 추가됩니다.

## 구조

```
maesil-agency/
├── DESIGN.md                        설계 문서 (v0.2.1)
├── .env.example                     부트스트랩 시크릿만
├── backend/
│   ├── requirements.txt
│   ├── sql/
│   │   ├── 001_agent_work_schema.sql     runs, tool_calls, query_audit, findings, ...
│   │   └── 002_registries.sql            db_registry, program_registry, secrets, ...
│   └── app/
│       ├── main.py                  FastAPI 진입
│       ├── config.py                .env 로더
│       ├── auth.py                  Bearer 토큰 검사
│       ├── db/maesil_total_client.py    부트스트랩 Supabase 클라이언트
│       ├── services/secrets.py      agent_work.secrets 래퍼
│       └── routers/
│           ├── health.py            /health
│           ├── secrets_router.py    /api/secrets*
│           └── widgets.py           /api/widgets/system-status
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── lib/api.ts                   Bearer 토큰 포함 fetch
│   └── app/
│       ├── layout.tsx
│       ├── globals.css              maesil-insight channel_settings 스타일 차용
│       ├── page.tsx                 대시보드 (시스템 상태 카드)
│       └── settings/page.tsx        시스템 키 등록 (카드 UI)
└── shared/                          (예약 — 공유 타입)
```

## 초기 세팅 순서

### 1. Supabase SQL 실행 (autotool 프로젝트에서)
Supabase 대시보드 → SQL Editor 에 순서대로 붙여넣고 실행.
```
backend/sql/001_agent_work_schema.sql
backend/sql/002_registries.sql
```
002 실행 시 `db_registry` · `program_registry` 에 `autotool`, `maesil-insight` 행이 자동으로 seed 됩니다.

### 2. 백엔드
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

cp ..\.env.example ..\.env
# .env 편집:
#   AUTOTOOL_SERVICE_ROLE_KEY = (Supabase → Settings → API → service_role)
#   API_BEARER_TOKEN          = 강한 랜덤 문자열 (예: openssl rand -hex 32)

uvicorn app.main:app --reload --port 8000
```
확인: `http://localhost:8000/health` → `{"status":"ok"}`.

### 3. 프론트
```bash
cd frontend
npm install
npm run dev
```
열기: `http://localhost:3000`.

### 4. 최초 로그인
- `/settings` 이동 → "API 인증 토큰"에 `.env`의 `API_BEARER_TOKEN` 값 입력 → 저장.
- 이후 다른 시스템 키(Render API 등)를 카드별로 입력 가능.

## Phase 1 남은 작업 (Day 2~3)
- Render API / Supabase Management API 호출해 `program_health` 주기 저장 (APScheduler)
- 대시보드 위젯 자동 갱신 (5~10초 폴링 or WebSocket)
- `GET /api/secrets/{name}/test` 의 kind별 실제 검증 구현

## 감시 시스템 (Phase A)

Render 로그를 3분마다 폴링하여 에러를 감지하고, 등록된 채널(이메일/위젯)로 알림을 보냅니다.

### 구성
- **SQL**: `backend/sql/006_alert_system.sql` (`alert_channels`, `alert_events`, `program_log_cursor`)
- **백엔드 서비스**: `services/render_logs.py`, `services/alert_dispatcher.py`, `services/notify_client.py`
- **API**: `/api/alert-channels` (CRUD), `/api/alerts/poll` (cron 트리거), `/api/alerts/recent`, `/api/alerts/{id}/ack`
- **이메일 발송**: maesil-insight의 `/api/v1/notify/email` 게이트웨이 호출 (자체 SMTP 안 가짐)

### 셋업 순서

1. **SQL 실행**: Supabase(autotool 프로젝트) SQL Editor에서 `006_alert_system.sql` 붙여넣고 실행.

2. **시크릿 등록** (`/settings`):
   - `render_api` — Render Account API Token
   - `maesil_insight_url` — 예: `https://maesil-insight.onrender.com`
   - `harness_api_token` — maesil-insight의 `HARNESS_API_TOKEN` 환경변수와 동일

3. **감시 대상 등록** — `program_registry`에 row 추가 (또는 settings UI 추후 추가):
   ```sql
   insert into agent_work.program_registry (name, display_name, host_provider, host_service_id, is_active)
   values
     ('maesil-total',        'maesil-total',        'render', 'srv-XXXXXXXX', true),
     ('maesil-insight',  '매실 인사이트',    'render', 'srv-YYYYYYYY', true)
   on conflict (name) do update
     set host_provider   = excluded.host_provider,
         host_service_id = excluded.host_service_id,
         is_active       = excluded.is_active;
   ```
   `host_service_id`는 Render 대시보드 → 서비스 → URL의 `srv-...` 부분.

4. **알림 채널 등록** (`/settings` → "감시 채널" 섹션):
   - 종류: `email` / 대상: 수신 이메일 주소 / 최소 심각도: `error`
   - 추가로 `widget` 채널 1개 등록(대시보드에 미확인 알림 카드 표시)
   - "테스트 발송" 버튼으로 메일이 도착하는지 확인

5. **Render Cron Job 등록** (3분 간격 폴링):
   - Render 대시보드 → New → **Cron Job**
   - Schedule: `*/3 * * * *`
   - Command:
     ```bash
     curl -fsS -X POST "$AGENCY_URL/api/alerts/poll" \
       -H "Authorization: Bearer $AGENCY_TOKEN"
     ```
   - 환경변수:
     - `AGENCY_URL` = agency 백엔드 URL (예: `https://maesil-agency.onrender.com`)
     - `AGENCY_TOKEN` = agency `.env`의 `API_BEARER_TOKEN` 과 동일

   로컬 테스트:
   ```bash
   curl -X POST http://localhost:8000/api/alerts/poll \
     -H "Authorization: Bearer $API_BEARER_TOKEN"
   ```

### 동작 흐름

```
[Render Cron 3분]
      ↓ POST /api/alerts/poll
[render_logs.poll_all] — 프로그램별 신규 로그 fetch + 패턴 매칭 → alert_events INSERT
      ↓
[alert_dispatcher.dispatch_pending] — 미발송 이벤트를 채널로 fan-out
      ↓                               ↓
   [email 채널]                    [widget 채널]
   notify_client.send_email →       (DB 적재만 — 대시보드가 30초 폴링)
   maesil-insight /api/v1/notify/email
   → Resend → 메일 도착
```

### 향후 (Phase B~D)
- Phase B: `monitor` 에이전트 — 적재된 에러를 LLM이 분류/요약/원인 추정
- Phase C: `dev` 에이전트 — monitor가 인계한 에러의 원인 코드 분석
- Phase D: PWA + Web Push — 폰 위젯 푸시 알림

## 아직 안 만든 것 (Future Work)
[DESIGN.md §18](./DESIGN.md) 참조.
