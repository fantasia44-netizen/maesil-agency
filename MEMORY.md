# maesil-agency 작업 메모리

> 이 파일은 Claude와의 작업 내용을 다른 컴퓨터/세션에서도 이어받기 위한 기술 문서입니다.
> 최종 업데이트: 2026-05-07

---

## 회귀 검증 (코드 변경 후 반드시 실행)

**한 줄 명령**:
```
PYTHONIOENCODING=utf-8 PYTHONUTF8=1 python backend/run_checks.py
```

- `backend/app` 전체 syntax compileall
- `backend/test_*.py` 자동 발견 후 전부 실행
- 현재 baseline: **164/164 PASS** (test_simulation 55 + test_outreach_simulation 67 + test_security_simulation 42)
- 어느 하나라도 FAIL이면 exit 1 → dev_chat_agent가 PR 만들기 전 게이트로 사용 가능
- 새 보안/로직 변경 시 `backend/test_security_simulation.py`에 케이스 추가하는 것이 컨벤션

**필수 환경변수** (없으면 부팅 fail-fast):
- `JWT_SECRET` (32자 이상), `API_BEARER_TOKEN` (16자 이상, "change-me" 등 거부)
- `MAEYO_INTERNAL_TOKEN` (운영에서 미설정시 `/api/cs/*` 503)
- `CORS_ORIGINS` (와일드카드 `*` 거부)

---

## 프로젝트 개요

**maesil-agency** — AI 에이전트 기반 비즈니스 자동화 시스템

- **백엔드**: FastAPI (Python) → Render 유료 플랜 (always-on)
- **프론트엔드**: Next.js → Render
- **DB**: Supabase (`maesil-total` 프로젝트, `agent_work` 스키마)
- **AI**: Anthropic Claude (Haiku for 빠른 분석, Sonnet for 코드 수정)
- **이메일 게이트웨이**: maesil-insight 서비스 경유
- **인증**: JWT (PyJWT + passlib bcrypt), **7일 만료** (2026-05-07 30일→7일 단축)

---

## 유저 역할 구조

| 역할 | 설명 | 접근 가능 화면 |
|------|------|--------------|
| `super_admin` | 개발자/오너 (본인) | 전체 (대시보드, 설정, 이전 대화, 개발 에이전트 포함) |
| `customer` | 매실인사이트 이용 고객 대표 | 대화, 이전 대화만 |

- **데이터 격리**: `insight_operator_id` (maesil-insight의 operator UUID) 기반
- 고객은 자신의 maesil-insight 데이터만 조회 가능
- super_admin은 operator_id 지정 없이 모든 데이터 조회

---

## 아키텍처

```
Render (maesil-agency backend)
  ├── FastAPI
  │   ├── /api/auth/*          — JWT 인증 (login, me, users CRUD)
  │   ├── /api/chat            — 오케스트레이터 채팅
  │   ├── /api/chat/from-alert/{id} — 이메일 알림 → 채팅 자동 연결
  │   ├── /api/alerts/*        — 알림 CRUD
  │   ├── /api/programs/*      — 프로그램 레지스트리
  │   └── /api/secrets/*       — 시크릿 관리
  └── asyncio lifespan scheduler (10초 후 첫 실행, 이후 180초 간격)
       ├── render_logs.poll_all()               — Render 로그 폴링
       └── alert_dispatcher.dispatch_pending()  — 이메일 발송

Supabase (maesil-total, agent_work 스키마)
  ├── users                    — JWT 인증 유저 테이블 (009_users_auth.sql)
  ├── program_registry         — 감시 대상 프로그램 목록
  ├── program_log_cursor       — 로그 폴링 커서 (last_seen_at)
  ├── alert_events             — 에러 이벤트 저장
  ├── alert_channels           — 발송 채널 설정 (+ user_id 컬럼)
  ├── conversations            — 채팅 대화 목록 (+ user_id 컬럼)
  ├── conversation_messages    — 채팅 메시지
  └── secrets                  — API 키 저장소
```

---

## SQL 마이그레이션 실행 목록

Supabase SQL Editor에서 실행한 순서:

```
001 ~ 005  — 초기 스키마 (program_registry, secrets 등)
006_alert_system.sql     — alert_events, alert_channels 테이블
006_conversations.sql    — conversations, conversation_messages 테이블
008_github_repo.sql      — program_registry에 github_repo 컬럼 추가
009_users_auth.sql       — users 테이블, conversations/alert_channels에 user_id 추가
010_insert_superadmin.sql — super_admin 초기 계정 생성 (1회 실행 후 삭제 권장)
011~015  — 레지스트리, repo_files, dev_pr_history, alert_ack 등
016_maeyo_cs_tables.sql  — maeyo_conversations, maeyo_messages, maeyo_l2_scripts
017~019  — l2_verified, fix_insight_url, maeyo_feature_docs + unanswered_log
020_maesil_studio_registry.sql
021_maesil_insight_github_repo.sql — maesil-insight github_repo 등록
022_dev_lessons_learned.sql — ⭐ dev 에이전시 학습 DB (PR 머지 → 레슨 자동 축적)
023_sales_insights.sql      — ⭐ 영업 에이전시 학습 DB (operator별 인사이트 축적)
```

### 009_users_auth.sql 내용
```sql
CREATE TABLE IF NOT EXISTS agent_work.users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text UNIQUE NOT NULL,
    password_hash   text NOT NULL,
    role            text NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin', 'customer')),
    insight_operator_id  uuid,
    display_name    text,
    is_active       bool NOT NULL DEFAULT true,
    created_by      uuid REFERENCES agent_work.users(id) ON DELETE SET NULL,
    last_login_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agent_work.conversations
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES agent_work.users(id) ON DELETE SET NULL;
ALTER TABLE agent_work.alert_channels
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES agent_work.users(id) ON DELETE CASCADE;
```

---

## 환경변수 목록 (Render 백엔드)

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `MAESIL_TOTAL_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `MAESIL_TOTAL_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `JWT_SECRET` | JWT 서명 시크릿 (30자 이상 랜덤값 권장) | ✅ |
| `API_BEARER_TOKEN` | 구형 호환 (일부 내부 API 인증) | ✅ |
| `CORS_ORIGINS` | 허용 도메인 (콤마 구분) | ✅ |
| `FRONTEND_URL` | 프론트엔드 URL (이메일 채팅링크용) | 선택 |

> **JWT_SECRET** Render에 설정 완료 (2026-04-28)

---

## 인증 시스템 상세

**파일**: `backend/app/auth.py`

```python
class UserContext:
    id: str
    email: str
    role: str  # "super_admin" | "customer"
    insight_operator_id: str | None  # maesil-insight operator UUID
    display_name: str | None

    @property
    def is_super_admin(self) -> bool: return self.role == "super_admin"
    @property
    def operator_id(self) -> str | None: return self.insight_operator_id
```

**JWT 구조**: `{ sub: user_id, email, role, insight_operator_id, display_name, exp }`

**super_admin 계정**: `support@maesil-insight.com` / `kdh801023!`

---

## 채팅 라우팅 로직

**파일**: `backend/app/routers/chat.py`

```
1. DEV_KEYWORDS 감지 + is_super_admin → 개발 에이전트 (super_admin 전용)
2. 승인/취소 키워드 → 개발 에이전트 pending 처리
3. SMALL_TALK (안녕, hi 등) or len<=3 → 오케스트레이터 직접 응답 (에이전트 미실행)
4. 나머지 → 오케스트레이터 → 비즈니스 에이전트 (sales/finance/warehouse/cs)
```

**DEV_KEYWORDS**:
```python
{"에러", "error", "버그", "bug", "수정", "fix", "코드", "code",
 "배포", "deploy", "로그", "log", "traceback", "exception",
 "pr", "커밋", "commit", "github", "깃", "고쳐", "분석",
 "개발팀", "개발자", "개발에이전트", "개발 에이전트", "dev",
 "[에러 알림"}
```

**SMALL_TALK**:
```python
{"안녕", "안녕하세요", "hello", "hi", "ㅎㅇ", "반가워", "테스트", "test",
 "뭐해", "있어", "누구야", "누구", "잘있어"}
```

---

## 이메일→채팅 연동

**백엔드 엔드포인트**: `POST /api/chat/from-alert/{alert_id}`
- alert_events 테이블에서 이벤트 조회
- `conversation_id = f"alert-{alert_id}"` (고정 → 같은 알림은 같은 대화)
- 에러 컨텍스트 자동 구성 → 개발 에이전트 분석

**프론트엔드**: `chat/page.tsx`
- URL 파라미터 `?alert_id=xxx` 감지
- `GET /api/alerts/{id}` 로 알림 내용 로드
- 에러 메시지 자동 전송

---

## Supabase 시크릿 (agent_work.secrets 테이블)

Settings 페이지(`/settings`)에서 등록:

| key | 설명 |
|-----|------|
| `anthropic_api_key` | Claude API 키 |
| `github_token` | GitHub PAT (repo 권한, classic) |
| `render_api` | Render API 키 (로그 폴링용) |
| `m_insight_service_role` | maesil-insight Supabase service role key |
| `maesil-insight_operator_id` | 본인의 maesil-insight operator UUID (super_admin용) |
| `maesil_insight_supabase_url` | maesil-insight Supabase URL |
| `maesil_insight_url` | maesil-insight 서비스 URL |
| `harness_api_token` | Tester 에이전트용 |

---

## 구현된 기능

### A. JWT 인증 시스템
- 이메일+비밀번호 로그인 → 30일 JWT
- 역할 기반 접근 제어 (super_admin / customer)
- super_admin만 개발 에이전트, 설정 페이지 접근
- 고객 계정 생성은 설정 페이지 → 유저 관리 섹션

### B. asyncio 내부 스케쥴러
**파일**: `backend/app/main.py`
```python
async def _poll_loop():
    await asyncio.sleep(10)   # 서버 기동 대기
    while True:
        try:
            render_logs.poll_all()
            alert_dispatcher.dispatch_pending(limit=100)
        except Exception as e:
            logger.error(...)
        await asyncio.sleep(180)  # 3분 후 반복
```
- 배포 직후 10초 대기 후 즉시 첫 폴링 (수집전 문제 방지)

### C. Render 로그 폴링
**파일**: `backend/app/services/render_logs.py`
- `program_log_cursor` 테이블의 `last_seen_at` 커서 사용
- 에러/크리티컬 패턴 감지 → `alert_events` INSERT (dedup_key 중복 방지)

### D. AI 에러 분석 (이메일)
**파일**: `backend/app/services/dev_agent.py`
- Claude Haiku 사용
- error/critical 이벤트만 분석
- 이메일에 원인추정/영향범위/수정방향/신뢰도 포함

### E. 개발 에이전트 채팅
**파일**: `backend/app/services/dev_chat_agent.py`
1. DEV_KEYWORDS 트리거 → program_registry에서 프로그램 감지
2. GitHub에서 파일 읽기 → Claude Sonnet 분석
3. `[PROPOSED_FIX]...[/PROPOSED_FIX]` 파싱 → `_pending` 저장
4. 승인 → 브랜치 생성 → 파일 커밋 → PR 생성 → URL 반환

**승인 키워드**: 승인, 실행, 확인, ok, yes, ㅇㅋ, 적용, 해줘, 실행해, 고쳐줘
**취소 키워드**: 취소, cancel, no, 아니, ㄴ

### F. 대화 저장/조회
**파일**: `backend/app/services/conversations.py`
- 모든 채팅 → DB 저장 (conversations + conversation_messages)
- user_id 연결로 고객별 대화 분리
- super_admin: 전체 대화 조회 / customer: 본인 것만

### G. 멀티 에이전시 학습 시스템 (2026-05-15)

#### G1. Dev Agency Learning — `dev_lessons_learned`
- PR 머지 완료 시 `_save_lesson()` 자동 호출 (`_mark_pr_merged` 내부)
- `_load_lessons(repo, failing_symbol)` → 유사 과거 레슨 조회 (error_type 또는 error_pattern ilike 검색)
- `analyze_and_propose` + `dev_agent.analyze_error` 모두에서 레슨 컨텍스트 주입
- 효과: 동일 에러 재발 시 과거 fix 즉시 참고 → 분석 시간 단축 + 중복 실수 방지

#### G2. Sales Agency Learning — `sales_insights`
**파일**: `backend/app/services/sales_knowledge.py`
- `SalesAgent.run()` 오버라이드 (Monkey-patch 방식 시스템 프롬프트 확장)
  - 실행 전: `load_insights(operator_id)` → `build_context()` → 시스템 프롬프트 주입
  - 실행 후: 분석 결과 2문장 요약 → `save_insight()` → UPSERT (operator/type/기간 키)
- `extract_insight_type()`: 텍스트 분석 → channel_trend/top_product/growth_pattern/ad_performance/general

#### G3. CS → Dev 실시간 에스컬레이션
**엔드포인트**: `POST /api/cs/dev-escalate` (JWT 인증, super_admin 전용)
- CS가 답 못한 질문 → `explain_feature()` 즉시 동기 호출 → `maeyo_feature_docs` 생성
- 다음 CS 쿼리에서 L2.5로 즉시 활용 가능
- 기존 비동기 경로(3분 폴러)도 병행 유지

#### G4. 기존 CS → Dev 비동기 루프 (스케줄러 내 동작 중)
- L3 응답 후 `log_unanswered()` → `maeyo_unanswered_log`
- 3분마다 `feature_kb.process_queue()` → `explain_feature()` → `maeyo_feature_docs`
- 다음 L2.5 매칭에서 자동 활용

---

## 주요 파일 위치

```
maesil-agency/
├── MEMORY.md                           ← 이 파일
├── backend/
│   ├── app/
│   │   ├── main.py                     ← lifespan 스케쥴러 (10s 기동 대기)
│   │   ├── auth.py                     ← JWT 인증, UserContext, passlib bcrypt
│   │   ├── db/
│   │   │   └── maesil_total_client.py  ← Supabase (매 요청 새 클라이언트)
│   │   ├── routers/
│   │   │   ├── auth_router.py          ← /api/auth/* (login, me, users CRUD)
│   │   │   ├── chat.py                 ← 채팅 + 오케스트레이터 + from-alert
│   │   │   ├── alerts.py               ← 알림 CRUD + GET /{id}
│   │   │   ├── programs.py             ← 프로그램 레지스트리 CRUD
│   │   │   └── secrets_router.py       ← 시크릿 관리
│   │   ├── services/
│   │   │   ├── dev_chat_agent.py       ← 채팅 개발 에이전트 (분석+PR)
│   │   │   ├── dev_agent.py            ← AI 에러 분석 (이메일용 Haiku)
│   │   │   ├── github_client.py        ← GitHub REST API 래퍼
│   │   │   ├── alert_dispatcher.py     ← 이메일 발송 + 채팅 링크
│   │   │   ├── render_logs.py          ← Render 로그 폴링
│   │   │   ├── notify_client.py        ← 이메일 게이트웨이 클라이언트
│   │   │   ├── conversations.py        ← 대화 DB 서비스
│   │   │   └── secrets.py              ← Supabase secrets 조회
│   │   └── agents/
│   │       ├── orchestrator.py         ← 에이전트 라우팅 + 실행
│   │       └── base.py                 ← 에이전트 기반 (operator_id 처리)
│   ├── requirements.txt                ← PyJWT, passlib[bcrypt], bcrypt==3.2.2
│   └── sql/
│       ├── 009_users_auth.sql          ← users 테이블 생성
│       └── 010_insert_superadmin.sql   ← 초기 관리자 계정 INSERT
└── frontend/
    └── app/
        ├── login/page.tsx              ← 로그인 페이지 (JWT)
        ├── ClientLayout.tsx            ← 인증 가드 + 역할별 네비게이션
        ├── chat/page.tsx               ← 채팅 UI + alert_id 자동 연동
        ├── history/page.tsx            ← 이전 대화 목록/뷰어 (모든 유저)
        ├── settings/page.tsx           ← 설정 (시크릿, 프로그램, 유저 관리)
        ├── page.tsx                    ← 대시보드
        └── layout.tsx                  ← ClientLayout 위임
    └── lib/
        └── api.ts                      ← JWT 토큰 관리, apiFetch, login/logout
```

---

## 해결한 주요 버그

| 버그 | 원인 | 해결 |
|------|------|------|
| SupabaseException: Invalid URL | Render 환경변수 URL/Key 뒤바뀜 | Render 대시보드에서 수정 |
| httpx.RemoteProtocolError | Supabase 클라이언트 싱글톤 HTTP/2 idle 끊김 | 매 요청마다 새 클라이언트 생성 |
| bcrypt + passlib 호환 오류 | bcrypt 4.x에서 `__about__` 제거 | `bcrypt==3.2.2`로 다운그레이드 |
| 대화 저장 실패 (무음) | `except Exception: pass` | `logger.warning(...)` 으로 교체 |
| 인삿말 → 비즈니스 에이전트 호출 | 라우팅 없음 | SMALL_TALK set → 오케스트레이터 직접 응답 |
| 스케쥴러 첫 폴링 180초 지연 | `asyncio.sleep(180)` 루프 맨 앞 | 루프 맨 뒤로 이동 + 기동 시 10초 대기 |
| "개발팀" 키워드 미인식 | DEV_KEYWORDS 미포함 | 개발팀/개발자/dev 등 추가 |

---

## 미완료 / 향후 작업

- [ ] `maesil-insight_operator_id` 시크릿 등록 (super_admin 데이터 쿼리 작동 필수)
- [ ] maesil-insight DB 스키마 확인 (`/admin/inspect-insight` 엔드포인트로 조회 가능)
- [ ] `/admin/inspect-insight` 임시 엔드포인트 제거 (작업 후)
- [ ] `_pending` 딕셔너리 Redis/DB 영속화 (현재 재배포 시 초기화)
- [ ] 개발 에이전트 E2E 테스트 (채팅 → 분석 → 승인 → PR 생성)
- [ ] 고객 입장에서 UX 테스트 (customer 계정 생성 후 확인)

---

## 알려진 제약 사항

- `_pending` (승인 대기 수정안)은 메모리 내 → Render 재배포 시 초기화
- Supabase free tier: DB 연결 수 제한 → 매 요청마다 새 클라이언트로 회피
- 개발 에이전트는 첫 번째 파일만 읽음 (컨텍스트 크기 관리)
- GitHub PR은 base 브랜치로만 생성 (main 직접 푸시 없음)
- `inspect_insight.py` 파일은 백엔드 루트에 존재하지만 production 코드 미포함

---

## 헬스모니터 escalation 오프바이원 수정 (2026-07-04, a943758)

- `backend/app/services/program_health.py` `_escalate_if_needed`: 현재 사이클 row를 INSERT한 **뒤** `_recent_health`를 조회하므로 결과에 현재가 이미 포함되는데, `current_status`를 다시 앞에 붙여 이중집계 → **실제 2사이클 연속 down만으로 "3사이클 연속 다운" critical alert 오발행**.
- 실사례: 7/3 20:28 KST maesil-total 알림 — 실제 이력 up→down→down (2사이클, 3분 만에 자동회복)이었는데 3사이클로 발행됨.
- 수정: recent N건(현재 포함)만 검사. `test_simulation.py` 케이스 동기화, 55/55 PASS.
- ⚠️ 부수 교훈: alert의 "AI 에러 분석"이 무관한 로컬 조사 스크립트(_check_*.py)를 구문오류로 지목했으나 전부 오진(py_compile 정상). AI 분석의 원인추정은 반드시 재검증 후 조치할 것.
- 참고: maesil-total 헬스체크 URL = https://autotool.onrender.com (registry: agent_work.program_registry). 경량 /healthz, 상세 /health 엔드포인트 존재.
