# maesil-agency — 사업계획서 대비 추가사항 & 보안 보강안

> 기준: 『올해의 K-스타트업 2026 AI리그 사업계획서』 (마감 2026.05.20) vs 현재 agency 설계도/구현 (v0.3, Phase A 운영중)
> 작성일: 2026-05-18
> 우선순위: P0(즉시) / P1(이번주) / P2(이번달) / P3(다음달+)

---

## 0. 요약 — 사업계획서가 agency에 부여하는 5가지 미션과 갭

| # | 사업계획서 명시 | agency 현재 상태 | 갭 | 우선순위 |
|---|---|---|---|---|
| 1 | "**2026.12 매실에이전시 상용화 → 월 ARR 9,000만원**" | super_admin 1인 사용 (`support@maesil-insight.com`) | 외부 셀러 멀티테넌트화 + 상용화 UI/결제 부재 | **P1** |
| 2 | "**매요AI = CS 24h**" + "월 1만+ 고객사 관리 구조" | maesil-insight 전용 (DESIGN.md §18 Future Work) | 매요AI 멀티테넌트(biz_id) 마이그레이션 부재 | **P1** |
| 3 | 자금 35%(3,500만) = **AI 인프라·GPU + LLM 추론 + 파인튜닝** | Anthropic API만 사용, 자체 추론 0 | GPU 자체 호스팅·파인튜닝 파이프라인 부재 | **P2** |
| 4 | 자금 20%(2,000만) = **데이터 암호화·서버 이중화** | `secrets` 테이블 평문(Phase 2에 pgsodium 예정), 단일 리전 | 시크릿 암호화 + 멀티리전 부재 | **P0** |
| 5 | 자금 10%(1,000만) = **TIPA 기술임치 + 오케스트레이션 특허** | 특허 4-2012-007562-2 출원(2026.04.08), 임치 0 | 임치 패키지 빌드 SOP 부재 | **P1** |

---

## 1. 보안 갭 (P0) — 코드/스키마 즉시 패치 필요

### 1.1 `agent_work.secrets` 평문 저장 [CRITICAL]
**근거**: `DESIGN.md` §17 — "Phase 1: 평문 저장 + Supabase RLS로 service_role만 read/write 허용 / Phase 2: pgsodium 또는 애플리케이션 레벨 AES 암호화 도입".
**현재**: Phase A(감시 시스템)까지 운영 중 = 평문 상태로 운영.
**위험**: Render API Token, Anthropic API Key, GitHub PAT가 모두 평문. Supabase service_role 1건 노출 = 전 키 노출.

**즉시 해결책 (P0)**:
```sql
-- backend/sql/024_secrets_encryption.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE agent_work.secrets
    ADD COLUMN value_encrypted bytea,
    ADD COLUMN value_legacy text;  -- 마이그 중 임시 보존

-- backend/app/services/secrets.py (애플리케이션 Fernet)
from cryptography.fernet import Fernet
fernet = Fernet(os.environ['SECRETS_MASTER_KEY'].encode())
def store_secret(name, value):
    enc = fernet.encrypt(value.encode())
    sb.table('secrets').upsert({'name': name, 'value_encrypted': enc}).execute()
```
- 1회 마이그 스크립트: 기존 `value` → `value_encrypted` 이동 → `value` 컬럼 NULL → DROP
- `.env`에 `SECRETS_MASTER_KEY=` 추가 (Fernet.generate_key)
- 키 로테이션 절차 `doc/KEY_ROTATION.md` 신설

### 1.2 Process Memory `_pending` 휘발성 [HIGH]
**근거**: `ARCHITECTURE.md` §8.1, §12.1 — "Redis 없음 → 서버 재시작 시 pending 작업 소멸 (P1)".
**위험**: dev_chat_agent가 코드 수정안을 제시한 직후 Render 자동 배포로 재시작 → 운영자 "승인" 명령이 빈 객체에 매칭 안 됨 → 대화 끊김.

**해결책 (P1)**:
- `agent_work.pending_actions` 테이블 신설 (conversation_id, action_type, payload jsonb, expires_at)
- `dev_chat_agent._pending[]` → DB로 영구화
- TTL 1시간 (사람이 그 안에 응답 못하면 cancel)

```sql
-- backend/sql/025_pending_actions.sql
CREATE TABLE agent_work.pending_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id text NOT NULL,
    action_type text NOT NULL,  -- 'dev_pr_proposal' | 'merge_pr' | ...
    payload jsonb NOT NULL,
    operator_id text,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
    created_at timestamptz DEFAULT now(),
    UNIQUE (conversation_id, action_type)  -- 마지막 제안만 유지
);
CREATE INDEX idx_pending_active ON agent_work.pending_actions(expires_at) WHERE expires_at > now();
```

### 1.3 Tool Contract — query_db template 화이트리스트 명시화 [MED]
**근거**: `ARCHITECTURE.md` §3.3 — "Tool은 `COMMON_TOOLS`로 정의된 것만 / `query_db`의 `template_key`는 허용 목록만".
**확인 필요**: 코드 베이스에 `ALLOWED_TEMPLATES` 상수가 명시되어 있는지, agent별 화이트리스트가 분리되어 있는지.

**보강안**:
- `backend/app/services/tool_contract.py` — 단일 source of truth로 정리
- `AGENT_TEMPLATE_WHITELIST = {'sales': [...], 'finance': [...], 'cs': [...]}` 명시
- LLM이 호출한 template_key가 화이트리스트에 없으면 `ToolDenied` 예외 + `query_audit`에 `denied=true` 기록
- 회귀 테스트: `test_security_simulation.py`에 "타 에이전트 template 호출 시도 차단" 케이스 추가

### 1.4 비용 임계값 자동 차단 부재 [HIGH]
**근거**: `ARCHITECTURE.md` §10.2 — "cost_usd 임계값 초과 시 자동 경보 (미구현)".
**위험**: Anthropic API 키 노출 또는 무한 루프 시 시간당 수십~수백 달러 소진 가능.

**해결책 (P0)**:
```sql
-- backend/sql/026_cost_guard.sql
CREATE TABLE agent_work.cost_limits (
    agent_type text PRIMARY KEY,
    hourly_usd numeric(10,2) NOT NULL DEFAULT 5.00,
    daily_usd  numeric(10,2) NOT NULL DEFAULT 50.00
);
INSERT INTO agent_work.cost_limits VALUES
    ('orchestrator', 2, 20), ('sales', 1, 10), ('cs', 3, 30), ('dev', 5, 50);
```

`BaseAgent.run()` 진입 시 — 직전 1h/24h 합산 비용 vs limit 비교 → 초과 시 `CostBudgetExceeded` raise.
정상 응답 대신 "오늘 분석 한도 초과. 내일 다시" 메시지로 graceful degrade.

### 1.5 GitHub API Rate Limit 가드 [HIGH]
**근거**: `ARCHITECTURE.md` §12.3 — "GitHub API rate limit: 분석 요청 폭증 시 429 → 분석 중단 (P1)".
**위험**: Personal Access Token 5000 req/h. Phase D(PWA 푸시) 도입 후 동시 분석 요청 폭증 가능.

**해결책 (P1)**:
- `services/github_client.py`에 토큰 버킷 (4500/h soft limit, 4900/h hard stop)
- 429 응답 시 `X-RateLimit-Reset` 헤더로 자동 backoff
- Hard stop 시 `alert_dispatcher`에 통보 (운영자 즉각 인지)

### 1.6 JWT 7일 vs hub 24h 정책 불일치 [LOW]
**근거**: `MEMORY.md` — "JWT 7일 만료 (2026-05-07 30일→7일 단축)" / hub `config.py` — 세션 24h.
**조치**: 두 시스템 모두 super_admin 토큰 24h, customer 토큰 7d로 통일. agency `auth.py` 수정 + 정책 문서화 (`doc/AUTH_POLICY.md`).

### 1.7 AST 검증 우회 가능성 [MED]
**근거**: `ARCHITECTURE.md` §4.2 — "AST 클래스 멤버십 검증 (함수가 클래스 밖으로 탈출 방지)".
**잠재 위험**: LLM이 패치 코드에 `import os; os.system(...)` 또는 새 파일 경로 (`../../etc/passwd`) 삽입 시 차단되는지 명시 필요.

**보강안 (P1)**:
- `services/code_safety.py` — AST `ast.walk()`로 위험 노드 차단:
  - `Import` / `ImportFrom`: 신규 추가 금지 (수정 패치는 기존 import 변경만 허용)
  - `Call`: `exec`, `eval`, `compile`, `__import__`, `os.system`, `subprocess.*` 호출 차단
  - 파일 경로 정규화: 패치 대상 path가 repo root 밖이면 거부
- `test_security_simulation.py`에 5+ 케이스 추가 (현재 42 → 47)

---

## 2. 사업계획서 직접 명시 항목 — 신규 추가 설계

### 2.1 매실에이전시 멀티테넌트화 (2026.12 상용화 마감) [P1]
**사업계획서**: "에이전트 매일 보고 → 대표 판단만 (Q4 상용화)".
**현재**: `users.role IN ('super_admin', 'customer')` 구조이지만, `customer`는 maesil-insight `operator_id` 1:1 매핑 가정.

**필요 변경**:
```sql
-- backend/sql/027_multitenancy_v2.sql
ALTER TABLE agent_work.users
    ADD COLUMN hub_biz_id BIGINT,                    -- maesil-hub의 biz_id
    ADD COLUMN tenant_tier TEXT DEFAULT 'free',      -- free/starter/pro/enterprise
    ADD COLUMN monthly_quota_runs INT DEFAULT 100;   -- 월 분석 실행 한도

CREATE TABLE agent_work.tenant_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES agent_work.users(id),
    plan_code text NOT NULL,
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    status text DEFAULT 'active'
);
```

**라우터**:
- `BaseAgent.run()` 진입 시 — 월 quota 체크 → 초과 시 "상위 플랜 업그레이드" 응답
- 라우트 `/api/usage` — 셀러 본인의 이번달 사용량 + 잔여 한도

**결제는 hub에 위임**: agency는 결제 비즈니스 로직을 갖지 않고, hub의 `subscriptions` 테이블에서 `plan_features.ai_decisions=true` 여부만 체크.

### 2.2 매요AI 멀티테넌트 마이그레이션 [P1]
**근거**: `DESIGN.md` §18.1 — Future Work에 명시. "두 번째 사이트의 CS 관리 니즈가 실제로 생길 때" 트리거.
**사업계획서**: 글로벌 ARR 150억원·월 1만+ 고객사 시점에 늦으면 critical bottleneck.

**스키마 마이그**:
```sql
-- backend/sql/028_maeyo_multitenant.sql
ALTER TABLE agent_work.maeyo_conversations ADD COLUMN biz_id BIGINT;
ALTER TABLE agent_work.maeyo_messages ADD COLUMN biz_id BIGINT;
ALTER TABLE agent_work.maeyo_l2_scripts ADD COLUMN biz_id BIGINT;  -- NULL=글로벌, NOT NULL=biz 전용
ALTER TABLE agent_work.maeyo_feature_docs ADD COLUMN biz_id BIGINT;

-- 인덱스 재구성
CREATE INDEX idx_l2_biz_program ON agent_work.maeyo_l2_scripts(biz_id, program) WHERE is_active;
CREATE INDEX idx_feature_biz_program ON agent_work.maeyo_feature_docs(biz_id, program);
```

**검색 로직**: L2 매칭 시 `biz_id = current_biz_id OR biz_id IS NULL` (글로벌 + 전용 모두 매칭). 비ID 충돌 시 biz_id 명시 우선.

**Self-Evolving Loop 변경**: 관리자 correction이 → 본인 biz의 L2에만 promote (글로벌 오염 방지).

### 2.3 GPU 인프라·파인튜닝 파이프라인 [P2]
**사업계획서 자금 35%(3,500만)**: AI 인프라·GPU + 모델 파인튜닝.
**현재**: Anthropic API 의존 100%. 비용은 사용량 비례·낮은 latency가 장점이지만 **파인튜닝/도메인 특화 불가**.

**Phase 1 (P2 — 2026.Q3)**: 추론 자체 호스팅 PoC
- Runpod / Lambda Labs (A100 80GB 시간당 ~$1.5)에 Qwen2.5-72B 또는 Llama-3.3-70B 배포
- vLLM 또는 TensorRT-LLM 서빙
- `services/llm_router.py` — Anthropic vs 자체 추론 라우팅 (간단 분류는 자체, 복잡 추론은 Claude)

**Phase 2 (P3 — 2027.Q1)**: 파인튜닝
- 학습 데이터: `maeyo_l2_scripts` 검증본 + `dev_lessons_learned` + `sales_insights` 누적
- LoRA 파인튜닝 (도메인: 이커머스 정산·재고·CS)
- 평가: hold-out 1,000개 케이스, 정확도/응답시간/비용 3축

### 2.4 TIPA 기술임치 SOP [P1]
**사업계획서**: "오케스트레이션 특허, TIPA 임치".

**임치 대상**:
1. 소스코드 (agency + hub + insight 3개 레포 git archive)
2. DB 스키마 마이그레이션 전체
3. 운영 매뉴얼 (`MEMORY.md`, `ARCHITECTURE.md`, `DESIGN.md`)
4. 핵심 알고리즘 명세 (정산 변환 특허 4-2012-007562-2 구현 코드 별도 표기)

**스크립트** (`scripts/build_escrow_package.py`):
```python
# 분기별 실행
- git archive HEAD -o agency_<YYYYMMDD>.zip
- pg_dump --schema-only > schema_<YYYYMMDD>.sql
- find . -name '*.md' | zip docs_<YYYYMMDD>.zip -@
- sha256sum *.zip > MANIFEST.txt
- ENCRYPT with TIPA 공개키 (TIPA 가이드 §3.2)
```

문서: `doc/TIPA_ESCROW.md` 신설 (담당: 김대희, 분기 1회).

### 2.5 매실에이전시 ↔ 매실허브 양방향 인증·메트릭 API [P1]
**사업계획서**: "월 1만+ 고객사 관리 구조 = 매실 에이전시 + 매요AI + 파트너스 + OPS".
**현재 갭**:
- agency가 hub의 매출/재고/주문 데이터를 분석하려면 직접 Supabase 조회 가정. 두 DB 별개 Supabase 프로젝트.
- hub가 agency의 AI 의사결정 결과(인사이트)를 위젯으로 표시하려면 양방향 API 필요.

**해결책** (P1):
- `agent_work.external_api_tokens` 테이블 (hub의 read-only token 저장)
- `services/hub_client.py` 신설 (`/api/v1/metrics/*` 호출, Bearer 토큰)
- 역방향: agency가 hub에 webhook (`POST /api/v1/agency/insights` 라우트 hub에 신설)
- 멱등키: `agency_run_id`

### 2.6 슬랙/디스코드 알림 채널 [P2]
**근거**: `ARCHITECTURE.md` §10.2 — "알림 채널 (Slack/Discord) — 이메일만 지원".
**조치**: `alert_channels` `kind` enum에 `slack`/`discord` 추가. `notify_client.py`에 Webhook URL 발송 함수. 추가 마이그 + UI 1개.

### 2.7 Vector DB 도입 시점 결정 [P2]
**근거**: `ARCHITECTURE.md` §15 검토 항목 — "Vector DB 없이 키워드 기반 검색으로 어디까지 버틸 수 있는가".
**판단 기준**:
- `maeyo_l2_scripts` 300건 돌파 시점 → 키워드 매칭 정확도 급락 (동의어/오타 미처리)
- `dev_lessons_learned` 100건 + 파일경로 모호화 → 시맨틱 검색 효익 발생
**선택지**: Supabase pgvector(별도 인프라 0) vs Pinecone/Qdrant. pgvector 우선 검토.

---

## 3. 옵저버빌리티·신뢰성 보강 [P1]

### 3.1 단일 스케줄러 SPOF [HIGH]
**근거**: `ARCHITECTURE.md` §12.1 — "asyncio 단일 루프 — 한 작업이 느리면 전체 지연".
**해결책**:
- 무거운 작업(repo_mirror.sync_all_active) → 별도 worker process로 분리
- Render Worker Service 1개 추가 ($7/mo) + Redis 큐 (Phase 2)
- 현 시점: 우선 `asyncio.gather(..., return_exceptions=True)`로 격리

### 3.2 응답 latency P95/P99 추적 [MED]
**근거**: `ARCHITECTURE.md` §10.2 — 미구현 명시.
**해결책**: `tool_calls.latency_ms` 이미 있음. 집계 뷰 + Grafana(Render Metrics) 또는 자체 `/api/admin/metrics` 라우트.

### 3.3 단일 Supabase 클라이언트 idle 버그 회귀 방지 [MED]
**근거**: §12.3 — "매 요청 새 클라이언트 생성 (이전 idle 버그 수정) — 연결 수 증가 가능".
**보강**: 연결 풀 모니터링 + Supabase 측 활성 연결 수 추적 알림.

---

## 4. Phase 4+ Developer/Tester 안전 가드 [P2]

**근거**: `DESIGN.md` §15 Phase 4+ — "Self-coding loop **가드레일** 필수".
**현재**: `dev_chat_agent`가 이미 PR 생성 기능을 가짐 (사실상 Developer 에이전트 진입).
**미흡한 가드레일**:
- 테스트 N회 연속 실패 시 중단 ← 미구현
- diff 크기 상한 ← 미구현
- 롤백 스크립트 자동 준비 ← 미구현

**즉시 보강**:
```python
# services/dev_chat_agent.py — execute_pending() 진입 직전
MAX_DIFF_LINES = 200
MAX_CONSECUTIVE_FAILURES = 3

if patch_lines > MAX_DIFF_LINES:
    return reject("diff too large; split into smaller PRs")

recent_fails = count_recent_failed_prs(repo, hours=24)
if recent_fails >= MAX_CONSECUTIVE_FAILURES:
    return reject("3 consecutive PR failures in 24h; manual review required")
```

`test_security_simulation.py`에 케이스 추가:
- "100-line diff approval"
- "201-line diff rejected"
- "3 consecutive PR failures → 4th attempt blocked"

---

## 5. SQL 마이그레이션 신규 발행 목록 (우선순위)

```
024_secrets_encryption.sql          [P0] secrets pgcrypto/Fernet
025_pending_actions.sql             [P0] _pending 영구화
026_cost_guard.sql                  [P0] cost_limits + agent별 한도
027_multitenancy_v2.sql             [P1] users.hub_biz_id + quota
028_maeyo_multitenant.sql           [P1] maeyo_* biz_id 컬럼
029_external_api_tokens.sql         [P1] hub 연동 토큰
030_alert_channels_slack_discord.sql [P2] 알림 채널 확대
031_pgvector_setup.sql              [P2] Vector DB 도입
```

---

## 6. 회귀 테스트 추가 항목 (test_security_simulation.py)

현재 42 케이스 → 보강 후 60+ 목표:
- 시크릿 평문 노출 차단 (4)
- pending_actions TTL 만료 동작 (3)
- 비용 한도 초과 시 graceful degrade (3)
- 타 에이전트 template_key 차단 (5)
- AST: import/exec/eval/subprocess 차단 (5)
- diff 200줄 초과 reject (2)
- 연속 PR 실패 누적 차단 (2)
- 매요AI biz_id 격리 (4)

---

## 7. 사업계획서 체크리스트 보강 (제출 직전)

- [ ] `agent_work.secrets` 암호화 마이그 완료 + 평문 컬럼 DROP
- [ ] `pending_actions` 테이블 적용 → 재배포 영향 없음 검증
- [ ] `cost_limits` 동작 확인 (의도적 한도 초과 → 차단 메시지)
- [ ] 슈퍼어드민 토큰 24h, 고객 토큰 7d 정책 통일
- [ ] TIPA 기술임치 1회차 패키지 빌드 (`scripts/build_escrow_package.py` 실행 로그)
- [ ] hub 연동 read-only 토큰 발급 + `/api/v1/metrics/daily-revenue` 200 OK
- [ ] 회귀 테스트 60/60 PASS (`backend/run_checks.py`)

---

## 8. 우선순위 D-13 → D-0 작업 순서

| Day | 작업 | 파일 |
|---|---|---|
| D-13 | secrets 암호화 마이그 + 코드 적용 | `024_*.sql`, `services/secrets.py` |
| D-12 | pending_actions DB 영구화 | `025_*.sql`, `services/dev_chat_agent.py` |
| D-12 | cost_limits + BaseAgent 가드 | `026_*.sql`, `agents/base.py` |
| D-11 | AST 안전 검증 강화 + 테스트 5건 | `services/code_safety.py`, `test_security_simulation.py` |
| D-10 | dev PR diff 크기·연속실패 가드 | `services/dev_chat_agent.py` |
| D-9 | hub 연동 토큰 + hub_client.py | `029_*.sql`, `services/hub_client.py` |
| D-7 | 매요AI biz_id 마이그 (운영 데이터 백업 후) | `028_*.sql` |
| D-5 | TIPA 임치 패키지 1회차 빌드 | `scripts/build_escrow_package.py` |
| D-3 | 회귀 60/60 + 보안 스캔 (bandit) | CI |
| D-1 | staging→prod 최종 머지 | branch protection |

---

*이 문서는 사업계획서 vs maesil-agency v0.3 (2026-05-18, Phase A 운영 중) 대비표.*
*Phase 4+ Developer/Tester 진입 전 본 문서의 P0~P1 항목 100% 클리어 필수.*
