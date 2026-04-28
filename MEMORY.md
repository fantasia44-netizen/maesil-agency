# maesil-agency 작업 메모리

> 이 파일은 Claude와의 작업 내용을 다른 컴퓨터/세션에서도 이어받기 위한 기술 문서입니다.
> 최종 업데이트: 2026-04-28

---

## 프로젝트 개요

**maesil-agency** — AI 에이전트 기반 비즈니스 자동화 시스템

- **백엔드**: FastAPI (Python) → Render 유료 플랜 (always-on)
- **프론트엔드**: Next.js → Render
- **DB**: Supabase (`maesil-total` 프로젝트, `agent_work` 스키마)
- **AI**: Anthropic Claude (Haiku for 빠른 분석, Sonnet for 코드 수정)
- **이메일 게이트웨이**: maesil-insight 서비스 경유

---

## 아키텍처

```
Render (maesil-agency backend)
  ├── FastAPI
  │   ├── /api/chat          — 오케스트레이터 채팅
  │   ├── /api/alerts/*      — 알림 CRUD
  │   ├── /api/programs/*    — 프로그램 레지스트리
  │   └── /api/settings/*    — 시크릿 관리
  └── asyncio lifespan scheduler (180초 간격)
       ├── render_logs.poll_all()       — Render 로그 폴링
       └── alert_dispatcher.dispatch_pending() — 이메일 발송

Supabase (maesil-total, agent_work 스키마)
  ├── program_registry       — 감시 대상 프로그램 목록
  ├── program_log_cursor     — 로그 폴링 커서 (last_seen_at)
  ├── alert_events           — 에러 이벤트 저장
  ├── alert_channels         — 발송 채널 설정
  ├── conversations          — 채팅 대화 목록
  ├── messages               — 채팅 메시지
  └── secrets                — API 키 저장소
```

---

## 해결한 주요 버그

### 1. SupabaseException: Invalid URL
- **원인**: Render 환경변수에서 MAESIL_TOTAL_SUPABASE_URL과 MAESIL_TOTAL_SERVICE_ROLE_KEY 값이 서로 뒤바뀌어 있었음
- **해결**: Render 대시보드에서 두 값을 직접 교체
- **코드**: `backend/app/db/maesil_total_client.py` — `os.environ` 직접 읽기로 진단 print 추가했었음 (현재도 남아있음, 안정 확인 후 제거 가능)

### 2. httpx.RemoteProtocolError: Server disconnected
- **원인**: Supabase 클라이언트를 `@lru_cache` 싱글톤으로 유지하면 HTTP/2 연결이 idle 후 서버에서 끊기는데 클라이언트가 재사용 시도
- **해결**: 싱글톤 제거. 자격증명은 모듈 로드 시 1회만 읽고(`_SUPABASE_URL`, `_SUPABASE_KEY`), `get_maesil_total_client()`는 매 호출마다 새 클라이언트 생성

---

## 환경변수 목록 (Render 백엔드)

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `MAESIL_TOTAL_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `MAESIL_TOTAL_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `API_BEARER_TOKEN` | API 인증 토큰 | ✅ |
| `CORS_ORIGINS` | 허용 도메인 (콤마 구분) | ✅ |
| `FRONTEND_URL` | 프론트엔드 URL (이메일 채팅링크용) | 선택 (기본: https://maesil-agency-frontend.onrender.com) |

---

## Supabase 시크릿 (agent_work.secrets 테이블)

Settings 페이지(`/settings`)에서 등록:

| key | 설명 |
|-----|------|
| `anthropic_api_key` | Claude API 키 |
| `github_token` | GitHub PAT (repo 권한, classic) |
| `render_api` | Render API 키 (로그 폴링용) |
| `notify_token` | maesil-insight 이메일 게이트웨이 토큰 |

---

## SQL 마이그레이션 실행 목록

Supabase SQL Editor에서 실행한 순서:

```
001 ~ 005  — 초기 스키마 (program_registry, secrets 등)
006_alert_system.sql     — alert_events, alert_channels 테이블
006_conversations.sql    — conversations, messages 테이블
007_*.sql                — (있을 경우)
008_github_repo.sql      — program_registry에 github_repo 컬럼 추가
```

### 008_github_repo.sql 내용
```sql
ALTER TABLE agent_work.program_registry
    ADD COLUMN IF NOT EXISTS github_repo text;
-- 예: 'fantasia44-netizen/maesil-total'
```

---

## 구현된 기능

### A. asyncio 내부 스케쥴러 (외부 Cron 불필요)
**파일**: `backend/app/main.py`

```python
@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(_poll_loop())
    yield
    task.cancel()

async def _poll_loop():
    while True:
        await asyncio.sleep(180)  # 3분
        render_logs.poll_all()
        alert_dispatcher.dispatch_pending(limit=100)
```

- Render 유료 플랜 (always-on)이므로 내부 스케쥴러가 가장 적합
- 3분 간격으로 Render 로그 폴링 + 미발송 알림 이메일 발송

### B. Render 로그 폴링
**파일**: `backend/app/services/render_logs.py`

- `program_log_cursor` 테이블의 `last_seen_at`을 커서로 사용
- 매 폴링 시 새 로그만 읽음 (하루치 전체가 아닌 3분치만)
- 에러/크리티컬 패턴 감지 → `alert_events` INSERT (dedup_key로 중복 방지)

### C. AI 에러 분석 (이메일 포함)
**파일**: `backend/app/services/dev_agent.py`

- Claude Haiku 사용 (빠르고 저렴)
- error/critical 심각도 이벤트만 분석 (info/warning은 스킵)
- 반환: `ErrorAnalysis(root_cause, impact, fix_suggestion, confidence, ok)`
- 이메일에 "원인 추정 / 영향 범위 / 수정 방향 / 신뢰도" 섹션 포함

### D. 개발 에이전트 채팅
**파일**: `backend/app/services/dev_chat_agent.py`

흐름:
1. 유저가 에러/코드 관련 메시지 입력 (DEV_KEYWORDS 트리거)
2. program_registry에서 프로그램 감지 (메시지에서 이름 추출)
3. GitHub에서 해당 파일 코드 읽기
4. Claude Sonnet으로 분석 + 수정안 생성
5. `[PROPOSED_FIX]...[/PROPOSED_FIX]` 블록 파싱 → `_pending` 저장
6. 유저가 "승인" 입력 → 브랜치 생성 → 파일 커밋 → PR 생성 → URL 반환

**승인 키워드**: 승인, 실행, 확인, ok, yes, ㅇㅋ, 적용, 해줘, 실행해, 고쳐줘  
**취소 키워드**: 취소, cancel, no, 아니, ㄴ

**거버넌스**: 에이전트는 제안만 함. 커밋/푸시는 유저 승인 후에만. PR만 생성 (main 직접 푸시 없음).

DEV_KEYWORDS (채팅 라우팅):
```python
{"에러", "error", "버그", "bug", "수정", "fix", "코드", "code",
 "배포", "deploy", "로그", "log", "traceback", "exception",
 "pr", "커밋", "commit", "github", "깃", "고쳐", "분석"}
```

### E. GitHub 연동
**파일**: `backend/app/services/github_client.py`

- `get_file(repo, path, branch)` — 파일 내용 + SHA
- `list_files(repo, path, branch)` — 파일 목록
- `get_default_branch(repo)` — 기본 브랜치명
- `get_recent_commits(repo, branch, n)` — 최근 커밋
- `create_branch(repo, new_branch, from_branch)` — 브랜치 생성
- `commit_file(repo, path, new_content, commit_message, branch, sha)` — 파일 커밋
- `create_pr(repo, title, body, head, base)` — PR 생성

인증: Supabase secrets의 `github_token` (classic PAT, repo 권한)

### F. 이메일→채팅 연동 (최근 구현)
**흐름**:
```
에러 발생 → 이메일 발송 → [💬 채팅에서 분석하기] 버튼
  → /chat?alert_id=<uuid> 클릭
  → 채팅 페이지: GET /api/alerts/{id} 로 알림 로드
  → 에러 컨텍스트 자동 전송 → 개발 에이전트 분석 시작
```

**관련 파일**:
- `backend/app/routers/alerts.py` — `GET /api/alerts/{event_id}` 추가
- `backend/app/services/alert_dispatcher.py` — 이메일에 채팅 버튼 추가
- `frontend/app/chat/page.tsx` — `useSearchParams` + 자동 전송 로직

---

## 주요 파일 위치

```
maesil-agency/
├── MEMORY.md                          ← 이 파일
├── backend/
│   ├── app/
│   │   ├── main.py                    ← lifespan 스케쥴러
│   │   ├── config.py                  ← 환경변수 설정
│   │   ├── auth.py                    ← Bearer 토큰 인증
│   │   ├── db/
│   │   │   └── maesil_total_client.py ← Supabase 클라이언트 (매 요청 새 클라이언트)
│   │   ├── routers/
│   │   │   ├── chat.py                ← 채팅 + 오케스트레이터 라우팅
│   │   │   ├── alerts.py              ← 알림 CRUD + GET /{id}
│   │   │   ├── programs.py            ← 프로그램 레지스트리 CRUD
│   │   │   └── settings.py            ← 시크릿 관리
│   │   ├── services/
│   │   │   ├── dev_chat_agent.py      ← 채팅 개발 에이전트 (분석+PR)
│   │   │   ├── dev_agent.py           ← AI 에러 분석 (이메일용 Haiku)
│   │   │   ├── github_client.py       ← GitHub REST API 래퍼
│   │   │   ├── alert_dispatcher.py    ← 이메일 발송 + 채팅 링크
│   │   │   ├── render_logs.py         ← Render 로그 폴링
│   │   │   ├── notify_client.py       ← 이메일 게이트웨이 클라이언트
│   │   │   ├── conversations.py       ← 대화 DB 서비스
│   │   │   └── secrets.py             ← Supabase secrets 조회
│   │   └── agents/
│   │       └── orchestrator.py        ← 에이전트 라우팅 + 실행
│   └── sql/
│       ├── 006_alert_system.sql
│       ├── 006_conversations.sql
│       └── 008_github_repo.sql
└── frontend/
    └── app/
        ├── chat/page.tsx              ← 채팅 UI + alert_id 자동 연동
        ├── settings/page.tsx          ← 설정 페이지 (시크릿, 프로그램)
        └── dashboard/page.tsx         ← 대시보드 (알림 위젯)
```

---

## 프로그램 레지스트리 설정 방법

Settings 페이지에서 각 프로그램에 GitHub 레포 등록:
- 형식: `owner/repo` (예: `fantasia44-netizen/maesil-total`)
- PATCH `/api/programs/{name}` — `github_repo` 필드

현재 등록된 프로그램 예시:
- `maesil-total` → `fantasia44-netizen/maesil-total` (GitHub에서 돌아감, host_provider는 나중에 수정 예정)

---

## 미완료 / 향후 작업

- [ ] `maesil_total_client.py`의 진단 `print()` 제거 (DB 연결 안정 확인 후)
- [ ] `maesil-total` 프로그램의 `host_provider` 수정 (`render` → `github` or `other`) — 도메인 연결 후
- [ ] 개발 에이전트 전체 플로우 E2E 테스트 (채팅 → 분석 → 승인 → PR 생성)
- [ ] `_pending` 딕셔너리를 Redis/DB로 영속화 (현재 프로세스 재시작 시 초기화됨)
- [ ] 이메일 채팅 링크 클릭 → 자동 분석 시작 E2E 테스트

---

## 알려진 제약 사항

- `_pending` (승인 대기 수정안)은 메모리 내 저장 → Render 재배포 시 초기화됨
- Supabase free tier: DB 연결 수 제한 있음 → 매 요청마다 새 클라이언트 생성으로 회피
- 개발 에이전트는 첫 번째 파일만 읽음 (코드 컨텍스트 크기 관리)
- GitHub PR은 base 브랜치로만 생성 (직접 main 푸시 없음)
