# maesil-agency — AGENTS.md

AI 에이전트 기반 비즈니스 자동화 시스템. FastAPI 백엔드 + Next.js 프론트엔드.

---

## 스택 & 인프라

- **백엔드**: FastAPI (Python) → Render 유료 플랜 (always-on)
- **프론트엔드**: Next.js (App Router) → Render
- **DB**: Supabase (`maesil-total` 프로젝트, `agent_work` 스키마)
- **AI**: Anthropic Codex (Haiku — 빠른 응답/CS, Sonnet — 코드 분석)
- **이메일 게이트웨이**: maesil-insight 서비스 경유
- **인증**: JWT (PyJWT + passlib bcrypt, 30일 만료) + `MAEYO_INTERNAL_TOKEN` (기계간 인증)

---

## 유저 역할

| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| `super_admin` | 개발자/오너 | 전체 (대시보드, 설정, 개발 에이전트, CS 관리 포함) |
| `customer` | 매실인사이트 고객 | 채팅, 이전 대화만 |

- 데이터 격리: `insight_operator_id` (maesil-insight의 operator UUID) 기반
- super_admin 계정: `support@maesil-insight.com`

---

## 주요 파일 구조

```
backend/app/
├── main.py                      — lifespan 스케줄러 (10s 기동 대기, 180s 간격)
├── auth.py                      — JWT 인증, UserContext, passlib bcrypt
├── db/maesil_total_client.py    — Supabase 클라이언트 (매 요청 새 생성)
├── routers/
│   ├── auth_router.py           — /api/auth/* (login, me, users CRUD)
│   ├── chat.py                  — 채팅 + 오케스트레이터 + from-alert
│   ├── alerts.py                — 알림 CRUD
│   ├── cs.py                    — CS API (/api/cs/chat, /api/cs/chat/stream, 대화 CRUD, L2 스크립트 CRUD)
│   ├── programs.py              — 프로그램 레지스트리 CRUD
│   └── secrets_router.py        — 시크릿 관리
├── services/
│   ├── maeyo_engine.py          — L1/L2/L3 CS 엔진 (L2: DB 스크립트+프로그램별 캐시, L3: Codex Haiku)
│   ├── dev_chat_agent.py        — 채팅 개발 에이전트 (분석+PR)
│   ├── dev_agent.py             — AI 에러 분석 (이메일용 Haiku)
│   ├── github_client.py         — GitHub REST API 래퍼
│   ├── alert_dispatcher.py      — 이메일 발송 + 채팅 링크
│   ├── render_logs.py           — Render 로그 폴링
│   ├── notify_client.py         — 이메일 게이트웨이 클라이언트
│   ├── conversations.py         — 대화 DB 서비스
│   └── secrets.py               — Supabase secrets 조회
└── agents/
    ├── orchestrator.py          — 에이전트 라우팅 + 실행
    └── base.py                  — 에이전트 기반 (operator_id 처리)

backend/sql/
└── 016_maeyo_cs_tables.sql      — CS 테이블 (maeyo_conversations, maeyo_messages, maeyo_l2_scripts) — Supabase 실행 완료

frontend/app/
├── login/page.tsx               — 로그인 (JWT)
├── ClientLayout.tsx             — 인증 가드 + 역할별 네비게이션
├── chat/page.tsx                — 채팅 UI (왼쪽 사이드바: 대화 이력 + "이어서 대화하기")
├── cs/page.tsx                  — Admin CS 페이지 (대화 이력 + L2 대본 관리)
├── history/page.tsx             — 이전 대화 목록/뷰어
├── settings/page.tsx            — 설정 (시크릿, 프로그램, 유저 관리)
└── page.tsx                     — 대시보드
```

---

## CS / 매요 시스템

### 아키텍처 (`maeyo_engine.py`)

```
L1 — 키워드 매칭 (즉시 응답, 비용 0)
L2 — DB 스크립트 조회 (프로그램별 캐시, Codex 비용 없음)
L3 — Codex Haiku (L1/L2 미매칭 시 폴백)
```

### API 엔드포인트 (`routers/cs.py`)

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/cs/chat` | CS 채팅 (동기) |
| `POST /api/cs/chat/stream` | CS 채팅 (스트리밍) |
| `GET/POST /api/cs/conversations` | 대화 CRUD |
| `GET/POST/PUT/DELETE /api/cs/scripts` | L2 스크립트 CRUD |

### 기계간 인증

- 헤더: `X-CS-Token: <값>`
- 환경변수: `MAEYO_INTERNAL_TOKEN`
- maesil-insight → maesil-agency CS API 호출 시 사용

### DB 테이블 (`agent_work` 스키마, SQL 016 실행 완료)

- `maeyo_conversations` — CS 대화 목록
- `maeyo_messages` — CS 메시지
- `maeyo_l2_scripts` — L2 응답 스크립트

---

## 채팅 라우팅 로직 (`routers/chat.py`)

```
1. DEV_KEYWORDS 감지 + is_super_admin → 개발 에이전트
2. 승인/취소 키워드 → 개발 에이전트 pending 처리
3. SMALL_TALK or len<=3 → 오케스트레이터 직접 응답 (에이전트 미실행)
4. 나머지 → 오케스트레이터 → 비즈니스 에이전트
```

---

## 이메일 → 채팅 연동

- `POST /api/chat/from-alert/{alert_id}` — 알림 ID로 대화 자동 시작
- `conversation_id = f"alert-{alert_id}"` (같은 알림 = 같은 대화)
- 프론트엔드: URL 파라미터 `?alert_id=xxx` 감지 → 에러 메시지 자동 전송

---

## 환경변수 (Render 백엔드)

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `MAESIL_TOTAL_SUPABASE_URL` | Supabase URL | ✅ |
| `MAESIL_TOTAL_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `JWT_SECRET` | JWT 서명 시크릿 | ✅ |
| `API_BEARER_TOKEN` | 구형 내부 API 인증 | ✅ |
| `CORS_ORIGINS` | 허용 도메인 (콤마 구분) | ✅ |
| `MAEYO_INTERNAL_TOKEN` | 기계간 CS API 인증 토큰 | ✅ |
| `FRONTEND_URL` | 프론트엔드 URL (이메일 채팅링크용) | 선택 |

---

## Supabase 시크릿 (`agent_work.secrets` 테이블)

Settings 페이지(`/settings`)에서 등록:

| key | 설명 |
|-----|------|
| `anthropic_api_key` | Codex API 키 |
| `github_token` | GitHub PAT |
| `render_api` | Render API 키 |
| `m_insight_service_role` | maesil-insight Supabase service role key |
| `maesil-insight_operator_id` | super_admin용 operator UUID |
| `maesil_insight_supabase_url` | maesil-insight Supabase URL |
| `maesil_insight_url` | maesil-insight 서비스 URL |

---

## SQL 마이그레이션 실행 목록

Supabase SQL Editor에서 실행 완료:

```
001~008  — 초기 스키마 (program_registry, secrets, github_repo 등)
009_users_auth.sql        — users 테이블, conversations/alert_channels에 user_id
010_insert_superadmin.sql — super_admin 초기 계정 (1회 실행 후 삭제 권장)
011~015                   — agency registry, repo_files, alert_ack_note 등
016_maeyo_cs_tables.sql   — CS 테이블 3개 (maeyo_conversations, maeyo_messages, maeyo_l2_scripts) ✅
```

---

## 알려진 제약 / 미완료 사항

- `_pending` (승인 대기 수정안)은 메모리 내 → Render 재배포 시 초기화 (Redis/DB 영속화 미완)
- L2 스크립트 maesil-insight → maesil-agency DB 마이그레이션 미완료 (pending)
- maesil-studio CS 연동 미완료
- Supabase free tier: 매 요청마다 새 클라이언트로 connection limit 회피 중

---

## 연동 현황

| 연동 | 상태 |
|------|------|
| maesil-insight ↔ maesil-agency CS | ✅ LIVE (verified) |
| maesil-studio ↔ maesil-agency CS | 미연동 |
| L2 스크립트 DB 마이그레이션 | 미완료 |
