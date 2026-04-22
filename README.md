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
│       ├── db/autotool_client.py    부트스트랩 Supabase 클라이언트
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

## 아직 안 만든 것 (Future Work)
[DESIGN.md §18](./DESIGN.md) 참조.
