# maesil-agency — System Architecture Design Document
> Version: v0.3 (2026-05-15)  
> For external review by GPT / Gemini

---

## 1. 시스템 개요 (What & Why)

### 1.1 목적
**maesil-agency**는 한국 이커머스 SaaS 스타트업(매실 인사이트, 매실 스튜디오)의 운영을 자동화하는 **멀티 에이전트 AI 플랫폼**이다.

핵심 철학:
- **LLM은 최소화** — 판단·해석에만 사용, 실제 작업은 Tool이 수행
- **상태는 DB로** — LLM 컨텍스트에 기억 맡기지 않음, Postgres에 영속
- **통제된 자동화** — 완전 자동 대신 인간 승인 게이트 유지
- **자가 진화** — 매 상호작용이 다음 상호작용을 더 좋게 만드는 피드백 루프

### 1.2 담당 업무 도메인
| 에이전시 | 역할 | 학습 DB |
|---------|------|--------|
| Dev Agency | 에러 감지 → 코드 분석 → PR 자동 생성 | `dev_lessons_learned` |
| CS Agency (매요AI) | 고객 CS 자동 응대 (3-layer) | `maeyo_l2_scripts`, `maeyo_feature_docs` |
| Sales Agency | 매출·채널 분석, 인사이트 생성 | `sales_insights` |
| Finance Agency | 광고비·수익성 분석 | (snapshots 공유) |
| Warehouse Agency | 재고·입출고 분석 | (snapshots 공유) |

---

## 2. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                         │
│  Render (log source)   GitHub (code repo)   Anthropic (LLM)     │
└──────────┬─────────────────┬─────────────────────┬──────────────┘
           │ 3min poll        │ REST API             │ API call
           ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    maesil-agency Backend (FastAPI / Render)      │
│                                                                   │
│  ┌──────────────┐   ┌──────────────────────────────────────────┐ │
│  │  Scheduler   │   │              API Routers                  │ │
│  │  (asyncio)   │   │  /api/chat  /api/cs  /api/alerts         │ │
│  │  180s cycle  │   │  /api/auth  /api/programs  /api/secrets  │ │
│  └──────┬───────┘   └──────────────────┬─────────────────────┘ │
│         │                              │                          │
│         ▼                              ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Service Layer                              │ │
│  │                                                               │ │
│  │  render_logs     alert_dispatcher    feature_kb               │ │
│  │  dev_agent       dev_chat_agent      maeyo_engine             │ │
│  │  repo_mirror     sales_knowledge     github_client            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                     ▼              │
│  ┌────────────┐   ┌─────────────────┐   ┌──────────────────┐    │
│  │  Dev Agent  │   │  Orch + Agents  │   │   CS Engine      │    │
│  │  (Haiku)   │   │  (Haiku/Sonnet) │   │  (L1→L2→L3)     │    │
│  └────────────┘   └─────────────────┘   └──────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Supabase client
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL  (agent_work schema)            │
│                                                                   │
│  Core          │ Dev Agency     │ CS Agency      │ Learning      │
│  ─────────     │ ──────────     │ ─────────      │ ────────      │
│  users         │ dev_pr_history │ maeyo_conv     │ dev_lessons   │
│  conversations │ repo_files     │ maeyo_messages │ sales_insigh  │
│  alert_events  │ dev_lessons    │ maeyo_l2_scri  │ maeyo_featdo  │
│  runs          │ program_reg    │ maeyo_unanswrd │               │
│  tool_calls    │ secrets        │                │               │
│  snapshots     │                │                │               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 에이전트 레이어 설계

### 3.1 Request Routing (채팅 입력 → 에이전트 배분)

```
User Message
    │
    ├─ DEV_KEYWORDS 감지 + is_super_admin?
    │      YES → Dev Chat Agent (Claude Sonnet)
    │
    ├─ APPROVE / CANCEL / MERGE 키워드?
    │      YES → Dev Agent pending 처리 (승인/취소/머지)
    │
    ├─ SMALL_TALK or len ≤ 3?
    │      YES → Orchestrator 직접 응답 (LLM 없이 규칙 응답)
    │
    └─ 나머지 → Orchestrator (Claude Haiku)
               └─ route() → agent_types 결정
                  └─ run_agents() → [Sales|Finance|Warehouse|CS|...]
```

**DEV_KEYWORDS** (예시): `에러, error, 버그, 수정, fix, 코드, 배포, pr, commit, github, 로그`

### 3.2 BaseAgent 구조 (모든 에이전트의 기반)

```python
class BaseAgent:
    agent_type: str       # 'sales' | 'cs' | 'dev' | ...
    model: str            # 기본 claude-haiku
    
    def run(message, conversation_id, operator_id, context_messages):
        # 1) Anthropic client 초기화
        # 2) get_system_prompt() + operator_id 주입
        # 3) Tool-use 루프 (최대 8라운드)
        #    - query_db(template_key, params) → read-only SQL
        #    - create_finding(kind, title, body)
        #    - create_snapshot(kind, payload)
        # 4) runs 테이블에 비용/토큰 기록
        return {run_id, agent_type, message, cost_usd, status}
```

**핵심 제약**:
- Tool은 `COMMON_TOOLS`로 정의된 것만 사용 (자유 SQL 금지)
- `query_db`의 `template_key`는 허용 목록만 실행 가능
- operator_id는 JWT에서 주입 — LLM이 임의 변경 불가

### 3.3 Tool Contract (허용 목록)

```
query_db
  ├─ sales.today_revenue_by_channel
  ├─ sales.date_range_revenue
  ├─ sales.monthly_summary
  ├─ sales.top_products
  └─ finance.ad_spend_by_channel
  
create_finding(kind, title, body)   → agent_work.findings 저장
create_snapshot(kind, payload)      → agent_work.snapshots 저장
create_suggestion(target, severity) → agent_work.suggestions 저장
```

---

## 4. Dev Agency 상세

### 4.1 자동 에러 감지 → 분석 파이프라인

```
Render Logs (3min poll)
    │
    ▼
render_logs.poll_all()
    │ ERROR / CRITICAL 패턴 감지
    ▼
alert_events INSERT (dedup_key 중복 방지)
    │
    ▼
alert_dispatcher.dispatch_pending()
    │
    ├─ dev_agent.analyze_error()     ← Claude Haiku
    │      │ 1) program_registry → github_repo 조회
    │      │ 2) 에러 키워드 추출 → repo_files 3-stage 검색
    │      │    Stage 1: RPC find_file_with_symbol
    │      │    Stage 2: path ILIKE %keyword%
    │      │    Stage 3: content ILIKE %keyword% (전문 검색)
    │      │ 3) dev_lessons_learned 과거 레슨 주입  ← NEW
    │      │ 4) Claude Haiku → root_cause / impact / fix_suggestion
    │      └─ ErrorAnalysis {root_cause, impact, fix_suggestion, confidence}
    │
    └─ 이메일 발송 (maesil-insight 게이트웨이 경유)
```

### 4.2 대화형 개발 에이전트 (dev_chat_agent)

```
User: "에러 분석해줘" (DEV_KEYWORDS)
    │
    ▼
analyze_and_propose()
    │
    ├─ 1) program_registry에서 repo 탐지
    ├─ 2) 에러 로그에서 failing_symbol 추출
    │      패턴: NameError, AttributeError, [Logger] method 예외
    │
    ├─ 3) 이미 머지된 PR 확인 (중복 방지)
    │
    ├─ 4) GitHub 파일 조회 (3-stage: 직접경로 → code search → DB mirror)
    │
    ├─ 5) DB 스키마 introspection (파일이 참조하는 테이블 자동 첨부)
    │
    ├─ 6) dev_lessons_learned 조회 → 과거 유사 수정 이력 주입  ← NEW
    │
    └─ 7) Claude Sonnet → [PROPOSED_FIX]...[/PROPOSED_FIX] 파싱
               │
               ▼
           _pending[conversation_id] = {repo, branch, path, patch_code, ...}

User: "승인"
    │
    ▼
execute_pending()
    │
    ├─ 1) AST 클래스 멤버십 검증 (함수가 클래스 밖으로 탈출 방지)
    ├─ 2) GitHub 브랜치 생성
    ├─ 3) 파일 커밋 (_smart_patch: 함수 단위 교체)
    └─ 4) PR 생성 → dev_pr_history 저장

User: "머지"
    │
    ▼
merge_pending_pr()
    │
    ├─ GitHub merge (squash)
    ├─ dev_pr_history.status = 'merged'
    ├─ 관련 alert_events 자동 ack
    └─ _save_lesson() → dev_lessons_learned INSERT  ← NEW
```

### 4.3 Dev Lessons Learned (학습 루프)

```
PR 머지
    │
    └─ _save_lesson(repo, pr_title, pr_url, file_path, fn_name)
         → dev_lessons_learned {
               repo, error_type(=fn_name), error_pattern(=pr_title),
               fix_summary, files_changed, pr_url
           }

다음 유사 에러 발생
    │
    └─ _load_lessons(repo, failing_symbol)
         → error_type 정확 매칭 OR error_pattern ILIKE %symbol%
         → 상위 3건 → _build_lessons_context()
         → user_prompt에 "## 과거 유사 수정 이력 (참고)" 섹션으로 주입
```

**DB Schema**:
```sql
agent_work.dev_lessons_learned (
    id            uuid PK,
    repo          text NOT NULL,
    error_type    text,          -- failing_symbol / fn_name
    error_pattern text NOT NULL, -- PR 제목 기반 에러 설명
    fix_summary   text NOT NULL,
    files_changed jsonb,
    pr_url        text,
    created_at    timestamptz
)
INDEX: (repo, error_type), (created_at DESC)
```

---

## 5. CS Agency (매요AI) 상세

### 5.1 3-Layer 응답 구조

```
고객 질문 (message)
    │
    ├─ L0: 범위 밖 거절 (out_of_scope 패턴 매칭) → 즉각 거절
    │
    ├─ L2: FAQ 스크립트 매칭 (DB, 비용 0)
    │      maeyo_l2_scripts (triggers, keywords, emotion, message)
    │      is_verified=True 스크립트 최우선
    │      트리거 길이 내림차순 (더 구체적인 것 우선)
    │
    ├─ L2.5: Feature KB 매칭 (dev agent 생성 지식, 비용 0)
    │         maeyo_feature_docs (keywords, answer, code_refs)
    │
    └─ L3: Claude Haiku fallback
           검증된 L2 스크립트를 few-shot으로 주입
           응답 후 maeyo_unanswered_log 적재 (비동기 학습 큐)
```

**응답 구조**:
```json
{
  "emotion": "love|welcome|thinking|doubt|warning|relief|...",
  "message": "2~3문장, 마크다운 금지",
  "action": {"label": "버튼명", "url": "/경로"} | null,
  "hint": "추가 팁" | null,
  "layer": "l2|l2.5|l3|fallback",
  "script_id": "Q001" | null
}
```

### 5.2 Self-Evolving Loop (자가 진화)

```
Circuit A: 관리자 Correction → L2 자동 등록

관리자 UI: "이 답변 수정" → PUT /api/cs/messages/{id}/correction
    │
    └─ _auto_promote_correction(message_id, corrected_answer)
         │
         ├─ 수정 대상 메시지 조회 (conversation_id, emotion, created_at)
         ├─ 대화에서 program 조회
         ├─ 직전 유저 질문 조회 → trigger 추출
         ├─ 키워드 자동 추출 (stopword 제거)
         ├─ script_id = LEARN_{SHA256(program+question)[:8]}  ← 중복 방지
         └─ maeyo_l2_scripts UPSERT {
               id, program, triggers=[user_question],
               message=corrected_answer,
               is_verified=True, sort_order=0
           }
           → L2 캐시 즉시 무효화

효과: 관리자가 1번 고치면 → 동일 질문 영구 L2 히트 (LLM 비용 0)
     시간이 갈수록 L3 호출 비율 감소 → 비용 곡선 하강
```

```
Circuit B: L3 미답변 → Dev Agent → Feature KB (비동기)

L3 응답 후
    │
    └─ feature_kb.log_unanswered() → maeyo_unanswered_log

Scheduler (3분마다)
    │
    └─ feature_kb.process_queue()
         │
         └─ dev_chat_agent.explain_feature(question, program)
              │ 1) repo_files에서 관련 코드 검색
              │ 2) Claude Haiku → {keywords, answer, code_refs}
              └─ maeyo_feature_docs INSERT
                    → 다음 동일 질문 → L2.5 히트
```

### 5.3 CS → Dev 실시간 에스컬레이션 (Intelligent Handoff)

```
관리자 UI: "이 질문 개발팀에 보내기" → POST /api/cs/dev-escalate
    │
    └─ _build_handoff_context(program, question, conversation_id)
         │
         ├─ maeyo_messages 최근 8개 로드
         ├─ 대화 흐름 요약 (role + emotion + layer)
         ├─ 감정 신호 분석:
         │    • 반복 질문 횟수 (≥3 → 이탈 위험 신호)
         │    • 부정 키워드 (왜/또/안돼/모르겠 등)
         │    • L3 누적 횟수 (L2 스크립트 공백 영역 신호)
         └─ "개발팀 지시" 블록 추가 (답변 형식 규칙)

    → 풍부한 컨텍스트를 explain_feature()에 전달 (동기 처리, ~3초)
    → feature_docs 즉시 생성 → 바로 L2.5에서 활용 가능

Handoff Context 구조 (3-layer):
┌──────────────────────────────────────────────────┐
│ [고객 질문]                                        │
│ 환불 신청 어떻게 하나요                              │
│                                                  │
│ [대화 흐름]                                        │
│   유저: 환불 버튼 어디있어요                          │
│   매요(doubt·l3): 죄송해요 정확한 위치를...           │
│   유저: 왜 모르세요 환불이 안돼요                     │
│                                                  │
│ [감정/품질 신호]                                    │
│   • 반복 질문 3회 (이탈 위험)                        │
│   • 부정적 표현 감지 (불만족 신호)                    │
│   • L3 응답 2회 → L2 스크립트 공백 영역              │
│                                                  │
│ [개발팀 요청]                                      │
│   프로그램: maesil-insight                         │
│   기술 용어 없이 2~3문장 답변 생성해주세요            │
└──────────────────────────────────────────────────┘
```

**DB Schema**:
```sql
-- CS 대화
agent_work.maeyo_conversations (
    id, program, operator_id, user_id, title,
    status TEXT CHECK (status IN ('open','resolved','escalated'))
)

-- CS 메시지 (감정/레이어/피드백 완전 저장)
agent_work.maeyo_messages (
    id, conversation_id, role, content,
    emotion, action jsonb, hint, layer, script_id,
    tokens_used,
    feedback TEXT,     -- 'good' | 'bad'
    correction TEXT,   -- 관리자 수정 답변
    corrected_by, corrected_at
)

-- L2 FAQ 스크립트
agent_work.maeyo_l2_scripts (
    id TEXT PK,   -- 'Q001' or 'LEARN_ABCD1234'
    program, triggers jsonb, keywords jsonb,
    emotion, message, action jsonb, hint,
    is_active bool, is_verified bool,
    sort_order int
)

-- dev agent 생성 기능 설명 (L2.5)
agent_work.maeyo_feature_docs (
    id, program, keywords jsonb,
    question_hint, answer, code_refs jsonb,
    created_by
)

-- 미답변 큐 (L3 → dev agent 파이프라인)
agent_work.maeyo_unanswered_log (
    id, program, message, l3_response,
    conversation_id, processed_at, feature_doc_id
)
```

---

## 6. Sales Agency 상세

### 6.1 실행 흐름

```
SalesAgent.run(message, operator_id)
    │
    ├─ Step 0: 캐시 체크 (30분 TTL)
    │      force_refresh 키워드(새로/갱신/다시)? → 스킵
    │      get_cached_insight(operator_id, insight_type) → HIT?
    │           YES → 즉각 반환 (cost_usd=0, LLM 0 calls)
    │
    ├─ Step 1: 과거 인사이트 시스템 프롬프트 주입
    │      load_insights(operator_id, limit=5) → 최근 분석 이력
    │      build_context() → "## 이전 분석 인사이트" 섹션
    │      get_system_prompt() monkey-patch 확장
    │
    ├─ Step 2: 에이전트 실행 (LLM + Tool-use 루프)
    │      Tool: query_db(sales.today_revenue_by_channel, ...)
    │      Tool: create_finding(anomaly, ...)
    │      Tool: create_snapshot(channel_breakdown, ...)
    │
    └─ Step 3: 결과 저장
           extract_insight_type(message) → channel_trend/top_product/...
           save_insight(operator_id, summary, insight_type, period_label)
           → sales_insights UPSERT
```

**DB Schema**:
```sql
agent_work.sales_insights (
    id, operator_id TEXT NOT NULL,
    insight_type TEXT,   -- channel_trend|top_product|growth_pattern|ad_performance|general
    period_label TEXT,   -- '2026-05', '2026-Q2'
    summary TEXT,        -- 2문장 요약
    data_snapshot jsonb, -- 참고 수치
    updated_at timestamptz
)
UNIQUE INDEX: (operator_id, insight_type, COALESCE(period_label, ''))
```

---

## 7. 에이전시 간 통신 구조 (Inter-Agency Communication)

```
┌─────────────────────────────────────────────────────────┐
│                  Agency Communication Map                 │
│                                                           │
│  CS Agency                    Dev Agency                  │
│  ─────────                    ─────────                   │
│  L3 미답변 ──→ unanswered_log ──→ process_queue (3min)    │
│  에스컬레이션 ──→ /dev-escalate ──→ explain_feature (즉시)  │
│  버그 신호 ──→ alert_events ──→ Dev 에러 분석 큐           │
│                                                           │
│  Dev Agency                   CS Agency                   │
│  ─────────                    ─────────                   │
│  feature_docs 생성 ──→ L2.5 히트 (다음 쿼리부터)           │
│  PR 머지 → alert ack ──→ CS 알림 자동 정리                  │
│                                                           │
│  Sales Agency                 Human Operator              │
│  ─────────────                ────────────────            │
│  분석 완료 ──→ sales_insights  CS 수정 ──→ L2 자동 등록     │
│  캐시 히트 ──→ cost 0 반환     PR 승인 ──→ 코드 배포         │
└─────────────────────────────────────────────────────────┘
```

### 7.1 현재 구현된 에이전시 간 연결
| 연결 방향 | 방식 | 지연 |
|----------|------|-----|
| CS → Dev (질문) | unanswered_log → process_queue | ~3분 (비동기) |
| CS → Dev (에스컬레이션) | /dev-escalate API | ~3초 (동기) |
| CS → Dev (버그 신호) | alert_events INSERT | 즉시 |
| Dev → CS (지식 생성) | maeyo_feature_docs → L2.5 | 즉시 (다음 쿼리) |
| Dev → CS (알림 정리) | alert_events ack | PR 머지 시 |
| Human → CS (교정) | correction → L2 auto-promote | 즉시 |
| Sales → next Sales | sales_insights UPSERT | 30분 캐시 TTL |
| Dev → next Dev | dev_lessons_learned INSERT | PR 머지 시 |

---

## 8. 상태 관리 (State Management)

### 8.1 메모리 계층

```
┌─────────────────────────────────────────────────────────┐
│               3-Tier Memory Architecture                  │
│                                                           │
│  Tier 1: Process Memory (휘발성, 서버 재시작 시 소멸)      │
│  ────────────────────────────────────────────────────    │
│  _pending[conv_id]    — 승인 대기 중인 코드 수정안          │
│  _recent_pr[conv_id]  — 방금 만든 PR 정보                  │
│  _l2_cache[program]   — L2 스크립트 TTL 캐시 (60s)        │
│                                                           │
│  Tier 2: Relational DB — Postgres (영속, 쿼리 가능)       │
│  ─────────────────────────────────────────────────────   │
│  users, conversations, conversation_messages              │
│  dev_pr_history, alert_events, runs, tool_calls           │
│  maeyo_conversations, maeyo_messages                      │
│  sales_insights, dev_lessons_learned                      │
│                                                           │
│  Tier 3: Semantic KB (키워드 매칭, 사실상 Light RAG)        │
│  ─────────────────────────────────────────────────────   │
│  maeyo_l2_scripts     — trigger/keyword 기반 FAQ          │
│  maeyo_feature_docs   — dev 생성 기능 설명 KB              │
│  dev_lessons_learned  — error_type 기반 수정 이력          │
│  repo_files           — GitHub 소스코드 미러 (symbol 검색) │
└─────────────────────────────────────────────────────────┘

※ 현재 미구현: Vector DB (embedding 기반 시맨틱 검색)
   현재 대안: 키워드/trigger 매칭 (정확도 낮지만 비용 0, 속도 빠름)
```

---

## 9. 보안 모델

### 9.1 인증 계층
```
JWT (7일 만료)
  ├─ sub: user_id
  ├─ role: 'super_admin' | 'customer'
  └─ insight_operator_id: UUID | null

Role-based access:
  super_admin → 전체 접근 (개발 에이전트, 설정, 모든 데이터)
  customer    → 본인 대화 + 본인 operator_id 데이터만

환경변수 보안:
  JWT_SECRET ≥ 32자 (짧으면 서버 거부)
  API_BEARER_TOKEN ≥ 16자 + "change-me" 패턴 거부
  CORS_ORIGINS 와일드카드(*) 거부
  MAEYO_INTERNAL_TOKEN 미설정 시 /api/cs/* 503
```

### 9.2 Tool Contract 보안
```
SQL 실행 보안:
  - LLM이 임의 SQL 작성 불가 — template_key 허용 목록만 실행
  - 모든 SQL은 operator_id 자동 주입 (타 운영자 데이터 접근 불가)
  - query_audit 테이블에 모든 실행 기록 (감사 로그)

GitHub 접근 보안:
  - secrets 테이블에서 PAT 조회 (환경변수 미사용)
  - 브랜치명: fix/agency-{UUID[:8]} (예측 불가)
  - AST 검증: 클래스 메서드가 모듈 레벨로 탈출하는 코드 차단
```

### 9.3 CS 토큰 분리
```
외부 CS API (/api/cs/chat):
  X-CS-Token 또는 X-Maeyo-Token 헤더 (MAEYO_INTERNAL_TOKEN)
  → JWT와 완전히 분리된 M2M(machine-to-machine) 인증
  → maesil-insight, maesil-studio가 각각 다른 토큰 사용
```

---

## 10. Observability

### 10.1 현재 구현
```
agent_work.runs          — 모든 에이전트 실행 이력 (토큰/비용/상태)
agent_work.tool_calls    — 도구 호출 1건 단위 로그 (latency_ms)
agent_work.query_audit   — 실행된 SQL 감사 로그 (denied 포함)
agent_work.widget_logs   — 위젯 갱신 이력 (ok/error/fallback)
agent_work.cost_log      — 모델별 토큰/비용 집계

alert_events             — 에러 감지 이벤트 (severity/source/dedup)
dev_pr_history           — PR 생성/머지 이력
maeyo_messages.feedback  — CS 응답 품질 평가 (good/bad)
```

### 10.2 현재 미구현 (GAP)
```
- 대시보드 UI (비용 트렌드, 에이전트별 실패율 시각화)
- 알림 채널 (Slack/Discord) — 이메일만 지원
- cost_usd 임계값 초과 시 자동 경보
- 에이전트 응답 P95/P99 latency 추적
```

---

## 11. 스케줄러 (Background Jobs)

```
asyncio lifespan scheduler (main.py)
  ├─ 기동 후 10초 대기 (서버 완전 부팅 확인)
  └─ 180초(3분) 간격 반복:
       │
       ├─ render_logs.poll_all()
       │      각 프로그램의 Render 로그 조회
       │      ERROR/CRITICAL 패턴 → alert_events INSERT
       │
       ├─ program_health.check_all()
       │      각 프로그램 헬스 체크
       │
       ├─ alert_dispatcher.dispatch_pending()
       │      미발송 alert → dev_agent 분석 → 이메일 발송
       │
       ├─ feature_kb.process_queue(limit=5)
       │      maeyo_unanswered_log 처리
       │      → explain_feature → maeyo_feature_docs
       │
       └─ repo_mirror.sync_all_active()
              프로그램 레지스트리의 github_repo 미러 동기화
              → repo_files 테이블 갱신 (sha 변동 시만)
```

---

## 12. 알려진 약점 (Honest Gap Analysis)

### 12.1 아키텍처 수준
| 약점 | 설명 | 우선순위 |
|------|------|---------|
| Vector DB 없음 | 키워드 매칭이 시맨틱 검색 대체 — 유사어/동의어 미처리 | P2 |
| Workflow/DAG 없음 | 복잡한 다단계 작업을 에이전트가 알아서 처리 — 실패 복구 취약 | P2 |
| Redis 없음 | 세션 캐시가 process memory — 서버 재시작 시 pending 작업 소멸 | P1 |
| 단일 스케줄러 | asyncio 단일 루프 — 한 작업이 느리면 전체 지연 | P2 |

### 12.2 학습 루프 수준
| 약점 | 설명 | 우선순위 |
|------|------|---------|
| 레슨 품질 검증 없음 | PR 제목만 저장 — 실제 root_cause 텍스트 미분석 | P1 |
| Sales 캐시 세분도 | insight_type 단위 캐시 — 같은 operator가 다른 기간 물으면 미스 | P2 |
| L2 오염 위험 | 관리자 수정 실수 → is_verified=True로 잘못 등록 | P1 |
| Cross-agency 지식 공유 없음 | Dev가 배운 것을 Sales/CS가 모름 | P2 |

### 12.3 운영 수준
| 약점 | 설명 | 우선순위 |
|------|------|---------|
| GitHub API rate limit | 분석 요청 폭증 시 429 → 분석 중단 | P1 |
| Anthropic API timeout | Sonnet 분석이 30초 넘으면 HTTP timeout | P1 |
| 단일 Supabase 클라이언트 | 매 요청 새 클라이언트 생성 (이전 idle 버그 수정) — 연결 수 증가 가능 | P2 |

---

## 13. 테스트 현황

```
backend/run_checks.py 실행 시:
  1) compileall — backend/app 전체 Python syntax 검증
  2) test_simulation.py          — 55개 케이스 (에이전트 시뮬레이션)
  3) test_outreach_simulation.py — 67개 케이스 (영업 에이전트)
  4) test_security_simulation.py — 42개 케이스 (보안 룰 검증)
  5) test_circuits.py            — 22개 케이스 (학습 루프 3회로)

  총 186/186 PASS (2026-05-15 기준)

테스트 전략:
  - 모든 테스트는 DB/API 없이 실행 (Mock 기반)
  - 외부 의존성 0 → CI 환경에서 바로 실행 가능
  - 보안 케이스: SQL injection, JWT 변조, CORS bypass 등 포함
```

---

## 14. 기술 스택

| 레이어 | 기술 | 이유 |
|-------|------|-----|
| Backend | FastAPI (Python 3.11) | 비동기, Pydantic, 빠른 개발 |
| Frontend | Next.js 14 (TypeScript) | App Router, SSR |
| DB | Supabase PostgreSQL | managed, RLS, realtime |
| AI | Anthropic Claude API | Haiku(분석)/Sonnet(코드) |
| Hosting | Render | always-on, GitHub 자동 배포 |
| Auth | PyJWT + passlib bcrypt | 경량, 검증된 라이브러리 |
| Code Mirror | GitHub REST API | 파일 읽기/쓰기/PR 생성 |

---

## 15. 검증 요청 사항 (Review Questions)

GPT / Gemini에게 검토를 요청할 항목:

1. **학습 루프 설계의 견고성**
   - Circuit 1 (correction→L2): hash 기반 dedup이 충분한가? 동의어/유사 질문 처리 전략은?
   - Circuit 3 (sales cache): 30분 TTL이 적절한가? operator별 real-time 분석 요구 시 대안은?

2. **CS 3-layer 아키텍처**
   - L2(키워드) → L2.5(feature KB) → L3(LLM) 순서가 최적인가?
   - is_verified 스크립트를 먼저 시도하는 것이 L3 품질보다 나은가?

3. **Dev Agent 코드 수정 파이프라인**
   - AST 검증 + smart_patch(함수 단위 교체) 방식의 리스크는?
   - GitHub API 3-stage 검색(RPC→path ilike→content ilike)의 성능/정확도 트레이드오프는?

4. **인터-에이전시 통신**
   - 현재 DB 기반 비동기 통신(3분 폴러)이 충분한가?
   - 실시간 에스컬레이션(/dev-escalate)의 동기 처리(3~5초)가 UX에 영향 없는가?

5. **전체 아키텍처 약점**
   - Vector DB 없이 키워드 기반 검색으로 어디까지 버틸 수 있는가?
   - Process memory (_pending)를 Redis로 옮기는 시점은?
   - 가장 먼저 터질 가능성이 높은 단일 장애점(SPOF)은 어디인가?

---

*이 문서는 maesil-agency v0.3 기준이며 현재 Render 배포 중인 시스템의 실제 구현을 반영합니다.*
*GitHub: fantasia44-netizen/maesil-agency*
