# maesil-agency — 설계 문서 (v0.2)

> 목적: 운영자 1인의 "AI 비서 팀"을 구축한다. 역할별 에이전트가 운영 중인 다중 Supabase DB를 읽고,
> autotool DB의 **전용 작업 스키마(agent_work)** 에 기록하며, 전용 웹 + 실시간 위젯으로 상호작용한다.
>
> v0.1 초안에 대해 GPT / Gemini 리뷰 결과를 반영한 버전.
> 핵심 변경: 권한 세분화 / 비용 제어 원칙 명문화 / Developer·Tester를 Phase 4+로 연기 /
>          Tool Contract·Run Model·Failure Policy·Observability 섹션 신설.

---

## 1. 목표 (Goals)

1. 운영자가 **자연어로 묻고** 역할별 에이전트가 **데이터 기반 답변 / 리포트 / 개선 제안**을 돌려준다.
2. **실시간 위젯**으로 핵심 지표(매출, 재고, CS 큐 등)를 수동 조회 없이 계속 보여준다.
3. **DB·프로젝트가 계속 늘어나는** 운영 환경을 전제로 확장 가능한 레지스트리 구조를 갖는다.
4. (장기) **에이전트가 에이전트를 개발** — Developer/Tester는 MVP 이후 단계에서 도입.

## 2. 스코프 (In / Out)

**In (MVP 범위 ~ Phase 3)**
- Sales, Finance 에이전트 (+ Phase 3에 Warehouse 또는 CS 중 1개)
- 오케스트레이터 (규칙 라우팅 + LLM 보조)
- DB 레지스트리 (다중 Supabase, 읽기 전용 계층)
- 전용 웹 UI (대화창 + 자동 갱신 위젯)
- Observability (run log / tool call / audit / cost)

**Out (초기)**
- Developer / Tester 에이전트 → Phase 4+
- 코드 자동 푸시 (PR까지만, merge는 사람)
- 외부 사용자 권한 관리 (운영자 1인)
- 모바일 앱 / 다국어 UI

---

## 3. 기존 시스템 맥락

| 시스템 | 역할 | DB |
|---|---|---|
| **autotool** | 전사 데이터 허브 (회사·채널·재무·생산·재고) | Supabase A |
| **maesil-insight** | 온라인 매출/광고 분석 + 매요AI(CS) + 테스트 하네스 | Supabase B |
| **(향후 추가)** | 신규 프로그램들 | Supabase C, D, ... |

- 운영 회사 3개
- 판매 채널: 네이버, 쿠팡 등
- **매요AI** = 실시간 고객 응대 (전방). **CS 에이전트** = 상담 로그 사후 분석·개선 제안 (참모). 역할 분리 원칙.

---

## 4. 에이전트 정의

각 에이전트 = **역할 프롬프트 + 허용 도구(Tool Contract) + 허용 권한 범위**.

| 에이전트 | Phase | 주 업무 | 읽기 소스 | 쓰기 대상 (agent_work 하위만) |
|---|---|---|---|---|
| **Sales** | 2 | 매출/판매 분석, 채널별 성과 | autotool A, maesil-insight B | `agent_work.sales_snapshots`, `agent_work.findings` |
| **Finance** | 2 | 재무 현황, 수익성, 비용 구조 | autotool A | `agent_work.finance_snapshots`, `agent_work.findings` |
| **Warehouse** *or* **CS** | 3 | 재고/발주 모니터링 / CS 로그 분석 | autotool A / 채널 API + maesil-insight B | `agent_work.inventory_alerts` / `agent_work.cs_suggestions` |
| **Developer** | 4+ | 웹·백엔드 코드 변경 (PR까지만) | 리포 파일 | PR (direct push 금지) |
| **Tester** | 4+ | maesil-insight 하네스 API 호출로 회귀 검증 | 리포 파일, 하네스 API | `agent_work.test_results` |

**원칙**
- 모든 에이전트 쓰기는 **`agent_work` 전용 스키마**에만 허용. 핵심 운영 테이블 직접 DML/DDL 금지.
- 타 DB는 **읽기 전용**.
- 권한 위반 시 레지스트리 계층에서 차단 (에이전트 프롬프트 신뢰 X, 게이트 신뢰 O).

---

## 5. 권한 모델 (중요 — v0.1 대비 전면 재설계)

**원칙**: DB 단위가 아니라 `db → schema → table → action` 단위.

**레지스트리 예시 (권한)**
```jsonc
{
  "agent": "sales",
  "permissions": [
    { "db": "autotool",        "schema": "public",     "table": "orders",            "actions": ["select"] },
    { "db": "autotool",        "schema": "public",     "table": "channels",          "actions": ["select"] },
    { "db": "maesil-insight",  "schema": "public",     "table": "*",                 "actions": ["select"] },
    { "db": "autotool",        "schema": "agent_work", "table": "sales_snapshots",   "actions": ["select", "insert"] },
    { "db": "autotool",        "schema": "agent_work", "table": "findings",          "actions": ["select", "insert"] }
  ]
}
```

- **작업 스키마 `agent_work`** 는 autotool DB 내에 별도 생성. 운영 스키마(public 등)와 분리.
- `actions`는 `select / insert / update / delete` 명시. DDL은 마이그레이션 전용 경로로만.
- 에이전트가 임의 SQL을 만들어도 게이트가 테이블·액션 단위로 허용 여부 최종 판정.

**필요 테이블 (초기)**
```
agent_work.runs              -- 에이전트 실행 이력
agent_work.tool_calls        -- 도구 호출 이력
agent_work.query_audit       -- 실행된 SQL/파라미터 감사 로그
agent_work.findings          -- 에이전트 판단 근거 (공유 메모리 역할)
agent_work.snapshots         -- 분석 스냅샷 (sales/finance/...)
agent_work.suggestions       -- 개선 제안 (cs/warehouse/...)
agent_work.handoffs          -- 에이전트 간 인계
agent_work.widget_cache      -- 위젯 결과 캐시
```

---

## 6. DB 레지스트리

**테이블 (autotool.agent_work.db_registry)**
```
  id            uuid
  name          text   -- 'autotool', 'maesil-insight', ...
  supabase_url  text
  api_key_ref   text   -- secret manager 참조 (실제 키 저장 금지)
  schema_hint   jsonb  -- LLM용 테이블/컬럼 요약 (승인본)
  schema_draft  jsonb  -- LLM이 introspection으로 생성한 초안 (미승인)
  approved_at   ts
  approved_by   text
```

**스키마 힌트 플로우**: LLM이 `information_schema`로 초안 생성 → `schema_draft`에 저장 → 운영자가 UI에서 검토·승인 → `schema_hint` 로 복사. **완전 자동 금지**.

**런타임 흐름**
1. 에이전트 기동 시 레지스트리 조회 → 허용된 커넥션 풀 구성
2. 쿼리 요청 시 `permissions` 게이트 통과 후에만 실행
3. 신규 DB 추가: 운영자가 등록 → introspection 초안 생성 → 승인 → 즉시 반영

---

## 7. Tool Contract (신설)

에이전트는 **자유 SQL 생성 금지**. 아래 명시 도구만 호출.

```python
# 읽기
run_readonly_sql(db_name, template_key, params) -> rows
#   - template_key: 사전에 등록된 쿼리 템플릿 ID
#   - 자유문 SQL은 admin 전용 경로에서만 허용 (게이트 통과 필수)

# 작업 스키마 쓰기
create_snapshot(agent_type, kind, payload) -> snapshot_id
create_finding(agent_type, kind, body, evidence_refs) -> finding_id
create_suggestion(target_area, body, severity, evidence_refs) -> suggestion_id
create_handoff(from_agent, to_agent, context_refs) -> handoff_id

# 위젯
emit_widget_event(widget_key, payload) -> void

# Phase 4+ (Developer/Tester용)
open_pr(branch, diff_summary, patch_bundle) -> pr_url
run_harness_test(test_suite_key, params) -> test_result_json
```

**쿼리 템플릿 예시**
```yaml
- key: sales.today_revenue_by_channel
  db: autotool
  sql: |
    SELECT channel_id, SUM(amount) AS revenue
    FROM public.orders
    WHERE ordered_at::date = :target_date
    GROUP BY channel_id
  params: [target_date]
  allowed_agents: [sales, finance]
```

이 구조로 에이전트가 임의 SQL을 만들 여지를 차단하고, SQL 변경은 리뷰 대상이 됨.

---

## 8. 위젯 — LLM 비의존 원칙 (중요)

**강제 원칙**: 위젯의 **데이터 조회·갱신 경로에 LLM을 태우지 않는다**.

```
┌────────────────────────────────────────────────┐
│ 위젯 갱신 (LLM 금지)                           │
│   SQL template → [cache/materialized view] →   │
│   rule-based 계산 → WebSocket push             │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 해석·조치 제안 (LLM 허용, on-demand)           │
│   운영자 클릭 / 임계치 초과 알림 →             │
│   에이전트가 findings + suggestion 생성        │
└────────────────────────────────────────────────┘
```

**위젯 정의 스키마 (레지스트리화)**
```jsonc
{
  "widget_key": "today_revenue_by_channel",
  "query_template": "sales.today_revenue_by_channel",
  "refresh_policy": "cron:*/60 * * * * *",   // 또는 "event:orders.insert"
  "ttl_seconds": 60,
  "fallback_mode": "last_success_snapshot",
  "requires_llm": false                        // 항상 false (예외시 사유 기록)
}
```

---

## 9. 아키텍처 개요

```
┌──────────────────────────┐
│  전용 웹 (Next.js)       │
│   - 대화창               │
│   - 자동 갱신 위젯들     │
└────────┬─────────────────┘
         │ REST + WebSocket(실시간)
┌────────▼─────────────────┐
│  FastAPI (Python)        │
│  ┌────────────────────┐  │
│  │ Orchestrator       │  │ ← 하이브리드 라우팅 (1차 규칙, 2차 LLM)
│  └─────┬──────────────┘  │
│  ┌─────▼──────────────┐  │
│  │ Agent Runtime      │  │ ← Claude Agent SDK (Python)
│  │ sales / finance /  │  │
│  │ warehouse or cs    │  │
│  └─────┬──────────────┘  │
│  ┌─────▼──────────────┐  │
│  │ Tool Layer (게이트)│  │ ← 권한 / 템플릿 검증
│  └─────┬──────────────┘  │
│  ┌─────▼──────────────┐  │
│  │ DB Registry +      │  │
│  │ Supabase Clients   │  │
│  └─────┬──────────────┘  │
│                          │
│  Widget Engine (LLM 비의존) — APScheduler + Supabase Realtime
│  Observability Bus       — run/tool/query/widget/cost logs
└────────┼─────────────────┘
         │
┌────────▼──────┬──────────┬──────────┐
│ autotool (A)  │ m-insight(B) │ 신규… │
└───────────────┴──────────┴──────────┘
```

---

## 10. 오케스트레이터 (하이브리드 확정)

1. **규칙 라우팅 (1차)**: intent classifier (경량). 명백한 도메인 키워드·패턴은 LLM 없이 즉시 해당 에이전트로.
2. **LLM 보조 라우팅 (2차)**: 1차에서 confidence < 임계치일 때만 supervisor LLM 호출. 복합 질문(예: "매출 하락 원인") → 여러 에이전트 조합.
3. **모든 라우팅 결과는 `agent_work.runs` 에 기록**.

---

## 11. Run / Session 모델 (신설)

모든 실행은 계층적 ID 체계로 추적.

```
conversation_id
  └─ task_id                (운영자 한 번의 요청)
       └─ agent_run_id      (단일 에이전트 실행)
            └─ tool_call_id (도구 호출 1회)
```

**`agent_work.runs` 컬럼**
```
id (agent_run_id), conversation_id, task_id, parent_run_id,
agent_type, started_at, ended_at,
status (running/success/failed/timeout/cancelled),
error_reason, input_tokens, output_tokens, cost_usd, model
```

→ "왜 이 답이 나왔는지", "어느 에이전트에서 비용 폭발", "어디서 실패" 추적 가능.

---

## 12. Failure Policy (신설 — 질문 아닌 정책)

| 장애 | 정책 |
|---|---|
| Supabase DB 다운 | 마지막 성공 `snapshot` + 갱신시각 표시, 에러 배너 |
| LLM 호출 실패 | 규칙 기반 fallback 응답 ("현재 분석 불가, 원인: ..."), 위젯은 cached value 유지 |
| WebSocket 끊김 | 5초 폴링으로 격하, 재연결 지수 백오프 |
| 쿼리 timeout (>10s) | 부분 성공 허용, partial 플래그 표시 |
| 특정 DB만 실패 | 나머지 DB 결과만 반환, 누락 DB 명시 |
| 에이전트 런타임 예외 | 최대 2회 재시도 → 실패 시 `failed` 기록, 운영자 알림 |

**공통**: 모든 에이전트 호출에 timeout + retry + circuit breaker 적용.
**위젯**: "완전 blank" 금지. 항상 "마지막 정상값 + 갱신시각 + 상태 뱃지".

---

## 13. Observability (신설 — 필수)

**저장 대상 (autotool.agent_work.*)**
- `runs`          — 에이전트 실행 이력
- `tool_calls`    — 모든 도구 호출 (입력/출력 요약, 소요시간)
- `query_audit`   — 실행 SQL / 파라미터 / row count
- `widget_logs`   — 위젯 갱신 성공/실패, latency
- `cost_log`      — 모델별 토큰·비용 (집계 뷰 포함)
- `error_log`     — 예외·스택 요약

**집계 뷰**
- 일별 에이전트별 비용
- 위젯별 갱신 p95 latency
- 실패율 / 재시도율

이 섹션이 없으면 디버깅·비용 통제·튜닝 불가. **부가기능 아님, 필수**.

---

## 14. 기술 스택

| 계층 | 선택 | 이유 |
|---|---|---|
| 백엔드 언어 | Python 3.12+ | 운영자 선호, Claude Agent SDK 성숙 |
| 백엔드 프레임워크 | FastAPI | async, WebSocket, 타입 안정성 |
| 에이전트 런타임 | Claude Agent SDK (Python) | 서브에이전트·도구 네이티브 |
| 도구 연결 (장기) | **MCP (Model Context Protocol)** 고려 | DB 레지스트리 + 도구 표준화에 부합 |
| DB 클라이언트 | supabase-py | 다중 프로젝트 풀 |
| 프론트 | Next.js 14 (App Router) | 위젯·대화창 통합 |
| 실시간 | FastAPI WebSocket + Supabase Realtime | 위젯 push |
| 스케줄러 | APScheduler | 위젯 정기 갱신 |
| 캐시 | Supabase materialized view + in-memory TTL | 위젯 비용 제어 |
| 시크릿 | .env + secret manager (운영) | 레지스트리는 참조만 저장 |

---

## 15. MVP 로드맵 (재정렬)

**Phase 1 — 인프라 최소 (에이전트 1개도 아직 없음)**
- repo 스캐폴드, FastAPI + Next.js 기동
- DB registry + readonly query layer + Tool Contract 기초
- `agent_work` 스키마 생성 (`runs`, `tool_calls`, `query_audit`, `widget_cache`)
- Observability 로깅 파이프 기본형
- auth 최소 (Bearer)
- **산출물**: SQL 템플릿 기반 Sales 위젯 1~2개 (LLM 없음), run log 기록

**Phase 2 — Sales / Finance 에이전트**
- Sales 에이전트 (질의응답 + 해석)
- Finance 에이전트
- Snapshot / Finding 쓰기
- Failure fallback 구현 (last success snapshot 등)

**Phase 3 — Warehouse *or* CS 추가**
- 셋 중 하나 선택 (Phase 2 종료 시점 재판단)
- 이벤트 기반 위젯 (재고 임계치 / 신규 CS)
- handoff 도입 (agent → agent)

**Phase 4+ — Developer / Tester**
- Developer: PR 생성만. merge는 사람 승인.
- Tester: 하네스 API 호출 + 결과 분석.
- Self-coding loop **가드레일** 필수:
  - 테스트 N회 연속 실패 시 중단
  - diff 크기 상한
  - 운영자 승인 게이트
  - 롤백 스크립트 준비
- 이 단계는 운영 지표가 안정된 뒤에만.

---

## 16. 남은 오픈 질문 (축소)

대부분 정책으로 확정됨. 남은 항목:

1. **Phase 3 에이전트 선택**: Warehouse(재고·발주) vs CS(상담 로그 분석). Phase 2 종료 시점의 운영 니즈로 결정.
2. **쿼리 템플릿 저장소** 형식: YAML 파일(리포에 커밋) vs DB(`agent_work.query_templates`). 전자는 리뷰 쉬움, 후자는 런타임 추가 쉬움.
3. **MCP 도입 시점**: 지금부터 MCP 서버로 설계 vs 우선 직접 도구 구현 → Phase 3쯤 MCP로 이관.
4. **비용 예산 정책**: 에이전트별·일별 상한 + 초과 시 동작(차단 vs 경고)?

---

## 17. 시크릿/접속 관리 (v0.2.1 추가)

**원칙**: `.env`에는 **부트스트랩 시크릿 1개**만. 나머지 모든 API 키는 **DB에 저장 + 웹 UI로 입력/관리**.

### 구조
- `.env` — `AUTOTOOL_SUPABASE_URL`, `AUTOTOOL_SERVICE_ROLE_KEY` 딱 2개 (부트스트랩)
- `agent_work.secrets` — 암호화된 키 저장소
  ```
  id, name (e.g. 'render_api', 'maesil_insight_service_role'),
  value_encrypted, key_version, created_at, updated_at, last_used_at
  ```
- 운영자는 웹 **/settings** 페이지에서 키 입력·수정
- 백엔드는 필요 시 DB에서 조회해 메모리 캐시 (TTL 5분)

### 암호화
- **Phase 1**: 평문 저장 + Supabase RLS로 service_role만 read/write 허용 (.env 유출보다는 안전)
- **Phase 2**: `pgsodium` 또는 애플리케이션 레벨 AES 암호화 도입. 마스터 키는 `.env` 1개로 유지

### 키 타입
- Render API 토큰 (서버 상태 조회)
- Supabase 프로젝트별 `service_role_key` (maesil-insight 등)
- Anthropic / OpenAI API 키 (에이전트용, Phase 2+)
- 향후 추가 프로그램 접속 키

### UX 참조
- **maesil-insight의 `channel_settings.html` 패턴**을 그대로 따른다.
- 카드 형태: 각 프로그램/프로바이더 당 카드 1개 + 상태 뱃지(active/inactive) + 입력 필드 + "연결 테스트" 버튼 + 최근 사용 시각
- `agent_work.secrets` insert 전에 "연결 테스트"로 검증 후 저장

### 장점
- 새 프로그램 추가 시 코드 수정 0 — 웹에서 등록만
- .env 분실/유출 리스크 최소화
- 키 회전(rotation)이 UI 조작만으로 가능

---

## 18. Future Work (지금은 안 만듦, 명확히 파킹)

Phase 1~3 범위 밖. 기록만 남기고 나중에 재논의.

1. **매요AI multi-tenant 마이그레이션**
   - 현재: maesil-insight 전용 CS
   - 목표: `site_id` / `product_id` 컨텍스트로 다중 사이트 CS 담당
   - 트리거: 두 번째 사이트의 CS 관리 니즈가 실제로 생길 때

2. **하네스 독립 서비스 분리**
   - 현재: maesil-insight 내부 코드, CLI로만 구동
   - 목표: 독립 서비스 + `/api/run` 엔드포인트 + structured JSON 결과
   - 트리거: Tester 에이전트(Phase 4+) 준비 시작할 때

3. **프로그램-에이전트 API 표준**
   - 현재: agent → DB 읽기만
   - 목표: agent가 프로그램에 작업 지시 (`/api/agent/*` REST → 이후 MCP)
   - 트리거: 에이전트가 "조회"를 넘어 "작업"을 해야 할 때

4. **MCP 서버 이관**
   - 각 프로그램을 MCP 서버로 노출 → Claude 네이티브 도구화
   - 트리거: REST 엔드포인트가 5개 이상 쌓이고 표준화 필요성 체감될 때

---

## 19. 다음 단계

1. 본 v0.2.1을 기준으로 **Phase 1 착수**
2. Phase 1 Day 1 범위:
   - 리포 스캐폴드 (backend/frontend/sql)
   - `agent_work` 스키마 SQL
   - `db_registry` + `program_registry` + `secrets` 테이블
   - FastAPI 뼈대 (`/health`, `/widget/system-status` 스텁)
   - Next.js 뼈대 (메인 페이지 + 설정 페이지)
   - `.env.example` 최소화 (부트스트랩 시크릿만)
