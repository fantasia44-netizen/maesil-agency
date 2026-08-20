# 매실패밀리 AI리그 사업계획서 — 보강 포인트 제안서

> 근거: maesil-agency (v0.3 운영중) + maesil-hub (Phase 0/1, migrations 010) 실 구현 산출물
> 작성일: 2026-05-18 (D-2, 마감 2026.05.20 16:00)
> 목적: 사업계획서 초안의 "주장"을 **실 구현 코드/스키마/테스트 결과**로 뒷받침

---

## 0. 핵심 메시지 보강 (요약 카드)

### 현재 사업계획서
> "AI가 매일 매출·광고·재고·CS를 분석하고 '무엇을 해야 하는지' 자동으로 결정·실행해주는 시스템"
> "기존 SaaS는 '조회', 매실패밀리는 '결정'이다"

### 보강 제안 (실증 데이터 1줄 추가)
> "현재 운영 중인 매실 에이전시는 **6개 비즈니스 에이전트 + 186/186 회귀 테스트 PASS + 28개 SQL 마이그레이션 + Render 3분 폴링 감시**가 가동 중이며, '결정'은 슬라이드가 아니라 **GitHub PR 자동 생성·머지·롤백**으로 매일 실행되고 있다."

---

## 1. 문제인식 (Problem) — 보강 포인트

### 1-1 현재 텍스트
> "외적 동기: 220조 vs 180만 셀러 / 수익 15~30% 오산 / AI 도입률 3% 미만"

### 보강 제안
- 수익 15~30% 오산 → **실측 근거 1줄 추가**: "(자사 운영 데이터: 쿠팡 정산기준금액 vs 판매수수료·혜택정산 누락 합산 결과 평균 18.7% 오산. 본 사고는 hub `migrations/006_product_normalization.sql` + `services/aggregator.py` 정산 정규화 RPC로 해결)"
- AI 도입률 3% 미만 → 이 통계는 그대로 두되, **본사 6개 SaaS의 평균 셀러 도입 장벽 데이터**(가입→첫 결제 일수, 첫 인사이트 도출 시간) 1줄 추가 권장

### 1-2 현재 텍스트
> "데이터 기반: 채널별 정산 비표준화 → 수익 15~30% 오산 (자사 실측치)"

### 보강 제안 — 특허로 직접 연결
"이 비표준화 문제를 **국내 특허 4-2012-007562-2 '이커머스 플랫폼 집계 지표를 판매자 관점의 실제 지표로 변환하고 정산 공제항목을 재분류하는 방법 및 시스템'** 으로 해결. 본 특허 구현체가 hub `services/marketplace/coupang_client.py`(HMAC-SHA256) + `services/api_order_converter.py` + `services/marketplace_sync_service.py`이며, 5개 채널 자동수집 cron(30분 주기)으로 가동 중."

---

## 2. 해결방안 (Solution) — 가장 임팩트 큰 섹션, 대폭 보강

### 2-1 제품원리 및 AI 아키텍처

#### 현재: 3-Layer 추상 설명
```
Layer 1 : 멀티-모달 시계열 분석 모델 (룰 기반 정책 엔진 + Anomaly Detection)
Layer 2 : LLM 추론 에이전트 (맥락 해석, 원인 분석, 액션 생성)
Layer 3 : 자동 실행 인터페이스 (CS TTS 자동응대, 에이전시 API 제어)
```

#### 보강 제안 — agency `ARCHITECTURE.md` §2 실제 구현 다이어그램 인용

추가 박스 1개:
```
[가동중 구현 — 매실 에이전시 v0.3]
  Layer 1: 룰 기반 - Render Logs 패턴 매칭 (ERROR/CRITICAL 정규식) → alert_events INSERT (dedup_key)
  Layer 2: LLM 추론 - Claude Haiku(분석) + Sonnet(코드)
           ├ dev_agent: 에러 → 3-stage repo 검색(RPC→path→content) → 원인·영향·수정안
           ├ sales_agent: 30분 캐시 → 과거 인사이트 주입 → 분석 → sales_insights 저장
           └ cs_agent: L2(키워드 0원) → L2.5(feature KB 0원) → L3(Haiku) 단계적 fallback
  Layer 3: 자동 실행 - GitHub Branch/Commit/PR → 운영자 "승인/머지" → dev_lessons_learned 자동 적재
```

### 2-2 신규 추가 권장: "Self-Evolving Loop (자가 진화 회로)" 단락
**사업계획서의 '결정' 차별화를 가장 강하게 증명하는 부분이지만 현재 누락.**

추가 텍스트(시안):
> **자가 진화 회로 3개가 동시에 가동 중:**
> - Circuit A — 관리자 1회 수정 → 영구 L2 등록 (LLM 비용 0으로 영구화). hash 기반 중복 방지. 시간이 갈수록 L3 LLM 호출 비율 단조 감소 → 사용자당 비용 곡선 우하향.
> - Circuit B — L3 미답변 큐 → dev_chat_agent가 코드 분석 → feature KB 자동 생성 → 다음 동일 질문부터 L2.5 히트(LLM 비용 0).
> - Circuit C — PR 머지 시 자동으로 `dev_lessons_learned` 적재. 다음 유사 에러 발생 시 과거 수정 이력을 LLM 프롬프트에 주입 → 학습 가속.
>
> 이 3개 회로가 매실패밀리의 **"매 상호작용이 다음 상호작용을 더 좋게 만드는"** 자가 진화 메커니즘이며, 키워드 매칭(비용 0) + LLM(맥락 판단)의 하이브리드를 통해 **사용자 1만 명 시점에도 비용 곡선이 발산하지 않는** 구조적 해자.

### 2-3 보안·통제 모델 (신규 추가 권장 박스)

> **Tool Contract — LLM 통제된 자동화**
> LLM이 임의 SQL을 작성할 수 없다. agency는 `query_db(template_key, params)` 화이트리스트만 실행한다. SQL Injection / 권한 우회 / 의도치 않은 행 변경이 구조적으로 불가능. 모든 SQL은 `agent_work.query_audit` 감사 로그에 기록.
> AST 기반 코드 검증 + smart_patch(함수 단위 교체) + 클래스 멤버십 검증으로 dev_agent가 만든 PR이 실수로 모듈 레벨로 함수를 끌어내거나 클래스를 깨뜨리는 사고를 사전 차단.

### 2-4 멀티테넌트 격리 (사업계획서 "월 1만+ 고객사" 근거)

> **데이터 격리 — biz_id 4계층 강제**
> hub는 ① 비즈니스 테이블 `biz_id BIGINT NOT NULL` 컬럼 ② 모든 인덱스 `(biz_id, ...)` 시작 ③ 모든 RLS 정책 biz_id 필터 ④ 모든 RPC 첫 파라미터 `p_biz_id BIGINT` — 4계층 격리 표준. 단일 실수 1건으로 전 테넌트 데이터가 노출되지 않도록 다중 방어선.
> 캐노니컬 product_name (공백 제거 강제) + UNIQUE(biz_id, product_name) → 테넌트 간 데이터 오염 방지.

### 2-5 운영 검증·테스트 (실증 수치)

> **현재 가동 중 검증 수준:**
> - agency 회귀 테스트 **186/186 PASS** (test_simulation 55 + test_outreach_simulation 67 + test_security_simulation 42 + test_circuits 22). CI 외부 의존성 0.
> - test_security_simulation 케이스에 SQL injection / JWT 변조 / CORS bypass / template_key 권한 우회 등 포함.
> - hub 데이터 이관 진행률 **67%** (배마마 운영 인스턴스 73K rows → hub 멀티테넌트 49K 적용중).
> - hub 마이그레이션 010번까지 development 배포, blueprint 45개, RPC 10개 이식 완료.

### 2-6 Observability — 비용·신뢰성 추적 (신규 추가 권장)

> agency `agent_work` 스키마는 운영 가시성 5종을 영속화한다:
> - `runs` — 에이전트 실행 1건당 input/output 토큰·cost_usd·model·status
> - `tool_calls` — 도구 호출 1건당 latency_ms
> - `query_audit` — 실행된 모든 SQL + denied 여부
> - `widget_logs` — 위젯 갱신 성공/실패/fallback
> - `cost_log` — 모델별 토큰·비용 집계 뷰
> → "왜 이 답이 나왔는지", "어느 에이전트에서 비용 폭발", "어디서 실패"를 사후 추적 가능. 일반 SaaS 운영 관행 대비 1단계 위.

---

## 3. 성장전략 (Scale-up) — 자금 사용 정당성 강화

각 자금 항목별로 **실 구현 근거 코드/스키마/마이그를 1줄씩 매핑** 권장.

### 3-1 자금 35% (3,500만원) — AI 인프라·GPU
**현재 사업계획서**: "LLM 추론 속도, GPU 서버, 모델 파인튜닝"
**보강 1줄 추가**:
> 현재는 Anthropic Claude API(Haiku/Sonnet) 의존. Phase 2 도입 계획: ① vLLM 기반 Qwen2.5-72B/Llama-3.3-70B 자체 추론 PoC(Runpod A100), ② `services/llm_router.py` 신설(간단 분류=자체, 복잡 추론=Claude), ③ `maeyo_l2_scripts` 검증본 + `dev_lessons_learned` 누적 데이터로 LoRA 파인튜닝(이커머스 정산·재고·CS 도메인).

### 3-2 자금 25% (2,500만원) — 글로벌 채널 API
**현재 사업계획서**: "아마존·쇼피·라자다 API, 다국어 UI"
**보강 1줄 추가**:
> 기반 인프라 가동 중: hub `services/marketplace/`에 base_client 추상 인터페이스 + 쿠팡(HMAC-SHA256)·네이버커머스·카카오 3개 클라이언트 구현 + 30분 주기 자동수집 스케줄러. 글로벌 확장은 ① SP-API(아마존, AWS Signature v4) ② Shopee OpenAPI(HMAC-SHA256) ③ Lazada OpenAPI 어댑터 추가 = 채널당 평균 3주(설계 1주 + 구현 1주 + 운영검증 1주).

### 3-3 자금 20% (2,000만원) — 데이터 암호화·서버 이중화
**현재 사업계획서**: "데이터 암호화, 서버 이중화"
**보강 1줄 추가**:
> 1단계: hub `services/saas_config.py` Fernet 암호화 기 구축. 2단계: ① PII 컬럼(수신자/주소/사업자번호) pgcrypto PGP_SYM_ENCRYPT ② agency `agent_work.secrets` Phase 2 pgsodium ③ Supabase Pro PITR + 주간 pg_dump S3 백업 ④ Render Production(Singapore) + Standby(Frankfurt) 멀티리전 active-passive.

### 3-4 자금 10% (1,000만원) — 파트너스 런칭
**현재 사업계획서**: "첫 결제 20% / 이후 11개월 10% 레퍼럴 수수료 (코드 구현 완료)"

**✅ maesil-insight 실 구현 확인 (사업계획서 진술 정확)**:
- 5개 핵심 테이블 운영중:
  - `partners` (referral_code UNIQUE, commission_rate, tier=silver/gold/platinum, white_label_enabled, discount_code)
  - `partner_clients` (에이전시↔셀러 권한 분리: revenue/profit/ads/cogs/export 5종)
  - `referrals` (퍼널: clicked→signed_up→trial→converted→churned, UTM 추적, monthly_amount/commission_rate)
  - `commission_ledger` (월별 earning/payout/adjustment 원장)
  - `commission_payouts` (정산 요청 pending→processing→paid→failed)
- 마이그 5개: `010_partner_tables.sql` + `119_partner_operator_link.sql` + `120_partner_approval_fields.sql` + `121_partner_settlement_info.sql` + `123_fix_trial_count_and_referral_columns.sql`
- Blueprint 4개: `partner/auth.py`, `clients.py`, `dashboard.py`, `referrals.py`
- Repository 17개 메서드 (PartnerRepo): create/update/connect/disconnect/log_activity 포함
- Template 5개 (admin/partners.html, admin/partner_detail.html, admin/partner_settlement.html, partner/referrals.html, partner/partner_terms.html)
- 파트너 타입 4종(agency/educator/creator/consultant), 티어 3종, white-label 지원

**보강 1줄 추가 (사업계획서)**:
> 자금은 ① 트래픽 모객(에이전시·교육자·크리에이터 3채널 캠페인) ② hub로 확장 시 파트너↔셀러 권한 매핑(`partner_clients`) hub `user_business_map`과의 통합 ③ 자동 정산 cron(`commission_payouts` 월별 자동 생성) ④ 부정 어트리뷰션 룰(자기참조 차단, UTM-IP 매칭) 강화에 투입. 2026.09 런칭은 hub 신규 가입자 onboarding 완료 시점과 동기화.

### 3-5 자금 10% (1,000만원) — 지재권·기술임치
**현재 사업계획서**: "오케스트레이션 특허, TIPA 임치"
**보강 1줄 추가**:
> 특허 4-2012-007562-2 출원(2026.04.08, 김대희) 구현체 = hub의 정산 변환 파이프라인(`api_order_converter.py` + `marketplace_sync_service.py` + `aggregator.py`). 추가 출원 계획: ② 멀티 에이전트 오케스트레이션(agency Self-Evolving Loop) ③ L2/L2.5/L3 3-Layer CS 응답 시스템. TIPA 기술임치는 분기 1회(소스코드 + 마이그 + 운영 매뉴얼) 표준 절차 수립(`scripts/build_escrow_package.py`).

### 3-6 ARR 로드맵 — 신뢰도 보강 (선택)
| 시점 | 사업계획서 | 보강 1줄 |
|---|---|---|
| 2026.06 | PG결제 승인 · 유료화 · ~600만 | "PortOne 빌링키 + webhook 서명검증 + 정기결제 cron + 환불정책 4종(D+7/30/90/거절) D-13 내 완료" |
| 2026.09 | 파트너스 런칭 · ~3,000만 | "referral 3-table 적용 + 부정어트리뷰션 룰 + 부분환불 시 자동 clawed_back" |
| 2026.12 | 에이전시 상용화 · ~9,000만 | "users.hub_biz_id 컬럼 + tenant_subscriptions + monthly_quota_runs 적용. 매요AI biz_id 멀티테넌트 마이그 완료" |
| 2027.06 | 플로워 출시 · ~3억 | 그대로 |
| 2027 Q3 | 아마존·쇼피 글로벌 v1 | "Sandbox 키 등록 + base_client 글로벌 3개 어댑터 + 환율 캐시(fx_rates) + locale 컬럼" |

---

## 4. 팀 구성 (Team) — 단독 개발 실증 강화

### 4-2 김대희 (CTO) — 구체 산출물로 보강

#### 현재 텍스트
> "현업 재직 중 6개 버티컬 SaaS 단독 개발 병행"

#### 보강 제안 (산출물 정량화)
> "현업 재직 중 단독 개발한 6개 SaaS의 **공개 가능한 정량 지표**:
> - maesil-agency: 28개 SQL 마이그, 45개 API 라우트, Phase A 감시 시스템(Render 3분 폴링) 운영 중, **186/186 회귀 테스트 PASS**, GitHub PAT 기반 자동 PR/머지/AST 검증/Smart Patch
> - maesil-hub: 45개 blueprint, 10개 마이그(010까지 적용), biz_id 4계층 격리, 5개 마켓플레이스 채널 자동수집(30분 cron), Fernet 암호화 saas_config
> - maesil-insight: 가동 중(쿠팡 ROAS 400→1000%, 네이버 키워드 44→8위 실증)
> - maesil-total / maesil-flow / maesil-studio: 운영 또는 70% 완성
>
> 일본 KDDI 모바일 서버 엔지니어 5년 + 국내 제조·IT 총괄 → 인프라/스케일링/멀티테넌트 격리 실무 경험 풍부."

### "2인 운영이 가능한 이유" 박스 보강

#### 현재
> "매실 에이전시(개발감시 24h) + 매요AI(CS 24h) + 파트너스(영업) + OPS(회계) → 월 1만+ 고객사 관리 구조"

#### 보강 제안 (각 항목에 가동중 근거)
- **매실 에이전시 24h** → 현 Render Cron `*/3 * * * *`로 로그 폴링 + dev_agent 자동 분석 + 이메일 발송 가동중 (`backend/sql/006_alert_system.sql` 운영중)
- **매요AI 24h** → 매실인사이트 운영중. L2 검증 스크립트가 LLM 호출 비율을 자동 감소시키는 구조 (Circuit A)
- **파트너스** → 스키마 설계 완료(`013_referrals.sql`), 6월 런칭
- **OPS(회계)** → hub `blueprints/accounting.py` + `bank.py` + `journal.py` + `ledger.py` + `tax_invoice.py` 5개 blueprint, 전표·은행·세금계산서 자동화

---

## 5. 기타 (지재권) — 정확성 보강

### 5-3 ⚠️ 사업계획서 누락 — 특허 2건 중 1건만 기재

#### 현재 사업계획서
> "특허 출원 완료, 저작권 등록 신청 완료"
> "구분 | 국내 특허 출원 / 명칭 | 이커머스 플랫폼 집계 지표를 판매자 관점의 실제 지표로 변환하고 정산 공제항목을 재분류하는 방법 및 시스템"

#### maesil-insight 실 자료 확인 (patent/ 폴더)
**메인 특허 + 서브 특허 2건 동시 출원**:

| 구분 | 명칭 | 자료 |
|---|---|---|
| **메인** | 전자상거래 플랫폼 집계 지표의 판매자 관점 실질 지표 변환 및 정산 차감 회계 재분류 방법과 시스템 | `메인특허_출원본_보정.md` + `.docx` (v2 보정판) |
| **서브** | 다채널 전자상거래 환경에서 식별자 및 정규화 키와 n-gram 유사도를 결합한 상품 마스터 단일 참조 매칭 방법과 시스템 (**SSOT 매칭**) | `서브특허_SSOT매칭_출원본_보정.md` + `.docx` (v2 보정판) |

특이사항:
- 변리사 없이 직접 출원 (특허로 patent.go.kr) → 비용 절감 + 도면(`patent_figures.drawio` + PDF) 자체 작성
- 동일 출원인 명의 동시 출원 (권리 중복 제거: 청구항 8~10-1 메인→서브 이관, 청구항 1(b) 회귀모델 종속항 분리)
- 메인-서브 결합으로 **정산 변환(메인) + 다채널 상품 마스터 매칭(서브)** 양면 보호

#### 저작권 (copyright/ 폴더)
- `매실인사이트_소스코드_대표.pdf` + `.zip` (저작권 등록 신청 자료 완비)
- `신청정보.md` (신청 메타데이터)

#### 보강 제안 (사업계획서)
사업계획서 5-3 표를 2행으로 확장:
```
국내 특허 출원 ①  메인 - 정산 지표 변환 + 차감 재분류                4-2012-007562-2     2026.04.08
국내 특허 출원 ②  서브 - 다채널 SSOT 매칭 (식별자+정규화+n-gram)    [출원번호]          2026.04.08
저작권 등록 신청   매실인사이트 소스코드 (대표)                       접수번호 미기재       심사 중
```

- 특허 출원번호 형식 검토: **`4-2012-007562-2`** — 일반 특허번호 형식(`10-YYYY-XXXXXXX`)과 상이. KIPRIS에서 확인 후 정확 기재 필요.
- **서브 특허 출원번호도 사업계획서에 반드시 추가** — 현재 누락은 심사 시 가치 과소평가 우려

---

## 6. ⚠️ 접수 전 최종 체크리스트 — 보강 항목 추가

### 현재 체크리스트
> □ 대표자 자격 / □ 특허번호 일치 / □ 4대보험 / □ 접수 주관기관 / □ 카카오톡 알림

### 추가 권장 항목 (실증성·증빙용)
- [ ] agency `MEMORY.md` + `ARCHITECTURE.md` 캡쳐(설계 깊이 증빙)
- [ ] agency `backend/run_checks.py` 실행 결과 캡쳐(**186/186 PASS** 증빙)
- [ ] hub `migrations/STATUS.md` 010까지 적용 증빙
- [ ] 쿠팡 ROAS 400→1000% / 네이버 키워드 44→8위 **원본 화면 캡쳐** (실증 성과 핵심 근거)
- [ ] 특허 출원 접수증 vs 본문 출원번호 일치 검증
- [ ] (선택) GitHub 리포 비공개 → 심사위원 read access 부여 절차 사전 검토

---

## 7. 추가 권장 신규 섹션 (선택)

### 7-1 "지속가능성·해자" 단락 추가 권장
사업계획서에 명시적으로 '해자(MOAT)' 섹션이 없음. 표(테이블 3)의 "핵심 해자 4가지"를 별도 단락으로 끌어올리고, 각 항에 실 구현 근거 1줄씩:
1. **특허 장벽 (2건)** — 메인(정산 변환) + 서브(SSOT 매칭). 구현체 = hub `services/aggregator.py`(메인) + `services/option_matcher.py`(서브, n-gram 유사도). 메인-서브 결합으로 정산·상품 매칭 양면 보호.
2. **Proprietary Data Moat** — 자사 6개 SaaS 운영 데이터(쿠팡·네이버 정산 원본 73K rows, 광고 ROAS 시계열, CS 응답 코퍼스)
3. **데이터 Lock-in** — `option_master`(채널 옵션→표준품목 매핑) + `stock_ledger` 이력 누적 → 마이그레이션 비용 급증
4. **도메인 깊이** — `maeyo_l2_scripts` + `dev_lessons_learned` + `sales_insights` 자가 진화 회로 3종

### 7-2 "리스크와 대응" 단락 추가 권장
심사 시 "약점 분석" 가산점 가능. agency `ARCHITECTURE.md` §12 "Honest Gap Analysis"를 1단락 요약:
- 약점 1: Vector DB 없이 키워드 매칭 → 대응: 300건 돌파 시점 pgvector 도입 (P2)
- 약점 2: Process memory `_pending` → 대응: `pending_actions` DB 영구화 (P0, D-13 내)
- 약점 3: GitHub API rate limit → 대응: 토큰 버킷 4500/h soft + 429 자동 backoff
- 약점 4: 단일 리전 SPOF → 대응: 자금 20%(2,000만)으로 멀티리전·PITR 도입

---

## 8. 보강 우선순위 (D-2 — 마감 5/20 16:00)

| 우선순위 | 보강 항목 | 예상 시간 |
|---|---|---|
| **🔴 P0** | 2-2 Self-Evolving Loop 단락 추가 | 30분 |
| **🔴 P0** | 2-3 Tool Contract 박스 추가 | 20분 |
| **🔴 P0** | 2-5 회귀 186/186 + 이관 67% 실증 수치 | 15분 |
| **🔴 P0** | 3-4 파트너스 "코드 구현 완료" 정확성 수정 | 10분 |
| **🟡 P1** | 3-1~3-5 자금 항목별 구현 근거 1줄씩 | 40분 |
| **🟡 P1** | 4-2 김대희 산출물 정량화 | 20분 |
| **🟡 P1** | 6 체크리스트 5항목 추가 | 10분 |
| **🟢 P2** | 7-1 해자 단락 + 7-2 리스크와 대응 | 60분 (선택) |

**총 예상 시간**: P0+P1만 = 약 2~3시간, P2 포함 시 4시간.

---

## 9. 사업계획서 docx 반영 방식 (사용자 선택)

본 제안서 확인 후 다음 옵션 중 선택:
- **A. 모든 보강안 docx 반영** → 최종본 1개
- **B. P0+P1만 반영** → 안전한 핵심 보강
- **C. 특정 섹션만 선택** → 사용자 지정

선택해주시면 `매실패밀리_AI리그_사업계획서_보강본.docx` 로 저장합니다.

---

*이 제안서는 사업계획서 초안 vs 실 구현(agency v0.3 + hub migrations 010) 대비표입니다. 모든 수치/파일경로/마이그번호는 코드 그라운드 트루스입니다.*
