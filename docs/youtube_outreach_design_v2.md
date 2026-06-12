# YouTube 파트너 영업 자동화 시스템 설계서 v2

> 버전: 2.0 | 작성일: 2026-06-12
> v1 대비 변경: 자동발송 제거 / 맞춤 분석 추가 / Gmail 답신 추적 / CRM 파이프라인

---

## 1. 시스템 철학 (v2 핵심 변경)

### v1 vs v2 목적 비교

| 항목 | v1 (초안) | v2 (개선) |
|------|-----------|-----------|
| 목표 | 1,000명에게 자동 메일 | 협업 가능한 100명 발굴 → 10명과 실제 대화 |
| 이메일 발송 | score ≥ 55 자동 발송 | AI 초안 생성 → 담당자 승인 → 수동 발송 |
| 이메일 내용 | 전체 동일 템플릿 | 채널 분석 기반 맞춤 초안 |
| 답신 처리 | 없음 | Gmail API 연동, AI 답신 분석 |
| 상태 관리 | 4단계 | 7단계 CRM 파이프라인 |

### 핵심 원칙
- **발굴은 자동, 판단은 사람**: 스캔·분석·초안은 AI가, 발송 결정은 담당자가
- **채널마다 다른 접근**: 구매대행 강사 ≠ 광고 전문가 ≠ 카페 운영자
- **영향력 = 구독자 + 커뮤니티**: 구독자 3,000명 + 카페 12,000명 > 구독자 50,000명

---

## 2. 전체 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: 자동 발굴 (스케줄러, 매일)                                │
│                                                                     │
│  [YouTube Data API v3]                                              │
│       │ search.list (키워드 10개)                                   │
│       ▼                                                             │
│  [youtube_scanner.py]                                               │
│    1. 키워드 검색 → video_id 수집                                   │
│    2. DB 중복 제거 (outreach_scanned_videos)                         │
│    3. 영상 필터 (조회수≥500, 길이>60s)                              │
│    4. 자막 수집 (youtube-transcript-api, 0 units)                   │
│    5. Claude Haiku 채널 분석 → is_educator 판정 (GATE)              │
│    6. 채널 상세 조회 + 연락처 추출                                  │
│    7. 점수 계산 + outreach_leads 업서트 (status='discovered')       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: AI 맞춤 분석 + 이메일 초안 생성 (담당자 트리거)           │
│                                                                     │
│  [channel_analyzer.py] (신규)                                       │
│    - Claude Sonnet: 채널 심층 분석                                  │
│      * 채널 유형 (구매대행/광고/강의/카페/수익공개)                  │
│      * 주요 시청자 (초보셀러/중급셀러/예비셀러)                     │
│      * 핵심 콘텐츠 주제 3가지                                       │
│      * 매실인사이트 연계 포인트                                      │
│      * 추천 접근 전략 ("무료 광고분석 이벤트 제안" 등)              │
│    - Claude Sonnet: 맞춤 이메일 초안 생성                           │
│      * 채널명, 베스트 영상 제목 직접 언급                           │
│      * 채널 유형별 다른 가치 제안                                   │
│    → outreach_leads에 analysis_json, email_draft 저장               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: 담당자 검토 + 발송 승인 (/outreach 페이지)                │
│                                                                     │
│  [Frontend /outreach]                                               │
│    - 리드 카드: 채널 분석 요약 + AI 초안 미리보기                   │
│    - 초안 직접 편집 가능 (textarea)                                 │
│    - "발송 승인" 버튼 → status: draft_ready → approved              │
│    - 발송: POST /api/outreach/leads/{id}/send                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: 답신 추적 + AI 분석 (Gmail API, 스케줄러)                 │
│                                                                     │
│  [gmail_watcher.py] (신규)                                          │
│    - Gmail API: 발송한 이메일의 답신 감지                           │
│    - Claude Haiku: 답신 내용 분석                                   │
│      * 답신 유형: interested / declined / question / auto_reply     │
│      * 요약 + 권장 다음 액션                                        │
│    → outreach_leads status 자동 업데이트                            │
│    → 담당자에게 알림 이메일 발송                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. CRM 파이프라인 (7단계 상태)

```
discovered ──→ analyzing ──→ draft_ready ──→ approved ──→ emailed
                                                              │
                                          ┌───────────────────┤
                                          │                   │
                                       no_reply          replied
                                          │              │
                                       (7일 후        ┌──┴──┐
                                        archived)  interested  declined
                                                       │
                                                   negotiating
                                                       │
                                                 ┌─────┴─────┐
                                                deal       rejected
```

| 상태 | 설명 | 트리거 |
|------|------|--------|
| `discovered` | 스캔으로 발굴됨, 점수 계산 완료 | 자동 (scanner) |
| `analyzing` | Claude 심층 분석 + 초안 생성 중 | 자동 or 수동 |
| `draft_ready` | AI 초안 생성 완료, 검토 대기 | 자동 (analyzer) |
| `approved` | 담당자 검토·수정 완료, 발송 대기 | 수동 (담당자) |
| `emailed` | 이메일 발송 완료 | 수동 발송 |
| `replied` | 답신 수신 (유형 세분화 별도 필드) | 자동 (Gmail 감지) |
| `no_reply` | 7일 이상 무응답 | 자동 (스케줄러) |
| `negotiating` | 협의 진행 중 | 수동 |
| `deal` | 계약 완료 | 수동 |
| `rejected` | 거절 or 제외 | 자동 or 수동 |
| `archived` | 보관 처리 | 수동 |

---

## 4. 점수 계산 로직 v2

### GATE 조건 (이것이 False면 점수 = 0, 즉시 drop)
```
Claude 분석 결과:
  is_seller_content = True
  AND
  is_educational_or_instructor = True  (← v2 추가)
```

단순 "나 스마트스토어로 돈 벌었어요" 브이로그는 제외.
**교육/정보 제공형 콘텐츠를 운영하는 인플루언서만** 통과.

### 점수 항목

| 항목 | 점수 | 설명 |
|------|------|------|
| 이메일 주소 추출됨 | +25 | 연락 가능 (v1 -5) |
| **네이버 카페 운영** | +30 | v2에서 +5 상향 (커뮤니티 영향력이 핵심) |
| Claude 셀러+교육 확인 | +20 | GATE 통과 후 추가 가점 |
| 최근 90일 이내 업로드 | +10 | 활성 채널 |
| 구독자 1,000~50,000명 | +10 | 마이크로 인플루언서 최적 구간 |
| 구독자 500~1,000명 | +5 | 성장 중 채널 |
| 블로그 + 인스타 동시 운영 | +5 | 멀티채널 |
| 카페 회원 5,000명 이상 추정 | +10 | (카페 URL에서 회원수 크롤링 가능 시) |
| **최대 합계** | **110 → cap 100** | |

### 등급 분류
| 등급 | 점수 | 액션 |
|------|------|------|
| A | 75+ | 즉시 심층 분석 + 초안 생성 |
| B | 55~74 | 심층 분석 대기열 |
| C | 35~54 | 발굴만, 분석 보류 |
| D | 35 미만 | 자동 archived |

---

## 5. Claude 채널 분석 프롬프트 설계

### 5-1. Step 5: 빠른 분류 (Haiku, 기존 유지)
```
목적: GATE 판단 (is_seller_content + is_educational)
모델: claude-haiku-4-5
입력: 제목 + 설명 200자 + 자막 500자
출력:
{
  "is_seller_content": bool,
  "is_educational_or_instructor": bool,
  "content_summary": "30자 이내",
  "confidence": "low|medium|high"
}
```

### 5-2. Phase 2: 심층 분석 (Sonnet, 신규)
```
목적: 채널 유형 파악 + 맞춤 전략 수립
모델: claude-sonnet-4-6
입력: 채널 설명 + 상위 영상 3개 제목 + 자막 통합 2000자
출력:
{
  "channel_type": "구매대행|광고전문|강의판매|카페운영|수익공개|복합",
  "target_audience": "초보셀러|중급셀러|예비셀러|사장님",
  "core_topics": ["주제1", "주제2", "주제3"],
  "pain_points": ["시청자가 겪는 문제1", "문제2"],
  "maesil_fit": "매실인사이트 연계 포인트 2문장",
  "approach_strategy": "추천 접근 방식 (예: 수강생 무료 광고분석 이벤트 제안)",
  "email_tone": "격식체|친근체",
  "influencer_tier": "nano|micro|mid|macro"
}
```

### 5-3. 이메일 초안 생성 (Sonnet, 신규)

#### 채널 유형별 이메일 전략

| 채널 유형 | 핵심 가치 제안 | 첫 문장 예시 |
|-----------|--------------|-------------|
| 구매대행 강사 | "수강생들에게 무료 광고분석 리포트 제공" | "구매대행 수강생분들이 광고비 절감에 가장 어려움을 겪더라고요" |
| 스마트스토어 광고 | "ROAS 비교 데이터 제공 (콘텐츠 소재)" | "올려주신 광고 최적화 영상 보고 연락드렸습니다" |
| 카페 운영자 | "카페 회원 전용 할인 + 제휴 배너" | "카페 회원분들께 특별 혜택을 드릴 수 있다면" |
| 수익 공개형 | "실제 데이터로 수익 공개 콘텐츠 제작" | "저희 사용자 데이터로 수익 공개 콘텐츠 같이 만들면 어떨까요" |

#### 개인화 필수 요소 (AI가 반드시 삽입)
1. 채널명 직접 호칭
2. 베스트 영상 제목 언급 ("올려주신 [{best_video_title}] 영상을 보니...")
3. content_summary 기반 공감 문장
4. approach_strategy 반영한 제안
5. 수신거부 문구

---

## 6. Gmail API 연동 설계

### 목적
발송한 이메일의 답신을 자동 감지하여 lead 상태 업데이트 + AI 분석

### 필요 권한 (OAuth 2.0 Scope)
```
gmail.readonly        — 수신 메일 읽기
gmail.send            — (선택) Gmail로 직접 발송 시
gmail.modify          — 읽음 처리
```

### 구현 방식

**Option A: Push Notification (권장)**
```
Gmail API Pub/Sub Watch
→ 새 메일 수신 시 Pub/Sub 메시지
→ webhook: POST /api/outreach/gmail-webhook
→ gmail_watcher.process_reply()
```

**Option B: Polling (간단, 초기 구현)**
```
스케줄러: 매 30분 gmail.users.threads.list
→ 발송 이메일 thread_id 기준으로 답신 확인
→ gmail_watcher.check_replies()
```

### 답신 분석 흐름
```python
def process_reply(email_body: str, lead: dict) -> dict:
    """
    Claude Haiku로 답신 분석
    반환:
    {
      "reply_type": "interested|declined|question|auto_reply|spam",
      "summary": "답신 요약 1~2문장",
      "next_action": "48시간 내 통화 제안 | 추가 자료 발송 | 없음",
      "sentiment": "positive|neutral|negative"
    }
    """
```

### 답신 유형별 자동 처리

| 답신 유형 | status 변경 | 담당자 알림 |
|-----------|------------|------------|
| interested | replied → negotiating 대기 | 즉시 이메일 알림 |
| question | replied | 즉시 알림 + 질문 내용 요약 |
| declined | rejected | 알림 없음 (로그만) |
| auto_reply | - | 7일 후 재확인 |

### DB 추가 컬럼 (outreach_leads)
```sql
reply_type      TEXT,         -- interested | declined | question | auto_reply
reply_summary   TEXT,         -- Claude 요약
reply_received_at TIMESTAMPTZ,
gmail_thread_id TEXT,         -- 답신 추적용 thread ID
next_action     TEXT,         -- AI 권장 다음 액션
```

---

## 7. DB 스키마 v2

### outreach_leads (업데이트)
```sql
CREATE TABLE agent_work.outreach_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 채널 기본 정보
    channel_id              TEXT NOT NULL UNIQUE,
    channel_title           TEXT,
    channel_url             TEXT,
    subscriber_count        INTEGER,
    influencer_tier         TEXT,          -- nano|micro|mid|macro

    -- 연락처
    contact_email           TEXT,
    naver_cafe_url          TEXT,
    blog_url                TEXT,
    instagram_url           TEXT,

    -- 베스트 영상
    best_video_id           TEXT,
    best_video_title        TEXT,
    best_video_views        INTEGER,
    best_video_published_at TIMESTAMPTZ,

    -- AI 분석 결과 (Phase 2)
    content_summary         TEXT,          -- Haiku 빠른 요약
    analysis_json           JSONB,         -- Sonnet 심층 분석 전체
    channel_type            TEXT,          -- 구매대행|광고전문|강의판매|카페운영|...
    approach_strategy       TEXT,          -- 추천 접근 전략
    email_draft             TEXT,          -- AI 생성 이메일 초안 (편집 가능)
    email_final             TEXT,          -- 담당자 최종 편집본

    -- 점수
    score                   INTEGER NOT NULL DEFAULT 0,
    grade                   TEXT,          -- A|B|C|D

    -- CRM 상태
    status                  TEXT NOT NULL DEFAULT 'discovered',
    -- discovered|analyzing|draft_ready|approved|emailed
    -- |replied|no_reply|negotiating|deal|rejected|archived

    -- 답신 추적
    reply_type              TEXT,
    reply_summary           TEXT,
    reply_received_at       TIMESTAMPTZ,
    gmail_thread_id         TEXT,
    next_action             TEXT,

    -- 타임스탬프
    emailed_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT outreach_leads_status_check CHECK (status IN (
        'discovered','analyzing','draft_ready','approved','emailed',
        'replied','no_reply','negotiating','deal','rejected','archived'
    ))
);
```

---

## 8. API 엔드포인트 v2

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/outreach/leads` | 리드 목록 (status, grade, limit, offset 필터) |
| GET | `/api/outreach/leads/{id}` | 리드 상세 (analysis_json, email_draft 포함) |
| POST | `/api/outreach/leads/{id}/analyze` | Phase 2 심층 분석 트리거 |
| PATCH | `/api/outreach/leads/{id}/email-draft` | 이메일 초안 편집 저장 |
| POST | `/api/outreach/leads/{id}/approve` | 발송 승인 (status → approved) |
| POST | `/api/outreach/leads/{id}/send` | 이메일 발송 (approved 상태만 허용) |
| PATCH | `/api/outreach/leads/{id}/status` | 상태 수동 변경 |
| POST | `/api/outreach/scan` | 스캔 수동 트리거 |
| GET | `/api/outreach/scan/stats` | 통계 |
| POST | `/api/outreach/gmail-webhook` | Gmail Pub/Sub 웹훅 (답신 수신) |

---

## 9. 프론트엔드 v2

### 9-1. 리드 목록 뷰

```
┌────────────────────────────────────────────────────────────────────┐
│  유튜브 영업 리드                              [🔍 지금 스캔]      │
│  AI가 발굴 → 분석 → 초안 → 담당자 승인 → 발송 → 답신 추적        │
├────────────────────────────────────────────────────────────────────┤
│ [통계 카드]                                                        │
│  발굴 | 초안완료 | 승인대기 | 발송완료 | 답신옴 | 협의중 | 계약   │
├────────────────────────────────────────────────────────────────────┤
│ [파이프라인 탭]  발굴됨 | 초안완료 | 승인대기 | 발송됨 | 답신     │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  [A급 82점]  셀링메이트TV  [draft_ready 초록뱃지]            │   │
│ │  구매대행 강의 채널 · 구독자 8,200명 · 카페회원 추정 1.5만   │   │
│ │  📧 selling@naver.com · 카페 링크                             │   │
│ │  🎬 "구매대행 완전 정복 풀코스" (12,400회)                   │   │
│ │  ─────────────────────────────────────────────               │   │
│ │  AI 분석: 수강생 대상 구매대행 A-Z 강의 채널.               │   │
│ │  추천 접근: 수강생 전용 무료 광고분석 이벤트 제안            │   │
│ │                        [📋 초안 보기·편집]  [✅ 승인 후 발송]│   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 9-2. 이메일 초안 편집 패널

```
┌─────────────────────────────────────────────────────────────┐
│  이메일 초안 편집  ← 셀링메이트TV                           │
├─────────────────────────────────────────────────────────────┤
│  수신: selling@naver.com                                     │
│  제목: [매실인사이트] 셀링메이트TV님의 수강생분들께         │
│         제안드리고 싶은 게 있어서요 🌿                       │
├─────────────────────────────────────────────────────────────┤
│  [본문 편집 영역 - textarea]                                 │
│                                                              │
│  안녕하세요, 셀링메이트TV 채널 운영자님 👋                  │
│                                                              │
│  올려주신 "구매대행 완전 정복 풀코스" 영상을 보니           │
│  수강생분들이 실전에서 광고비 낭비로 고생하시는 부분을      │
│  정확히 짚어주시더라고요.                                    │
│                                                              │
│  저는 쿠팡·스마트스토어 광고 데이터를 AI로 분석해           │
│  ROAS와 키워드별 수익을 자동으로 뽑아주는                   │
│  매실인사이트를 운영하고 있습니다.                           │
│                                                              │
│  수강생분들께 무료 광고분석 리포트를 제공하는               │
│  이벤트를 함께 진행하면 어떨까요?...                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [AI 재생성]  [저장]  [✅ 이대로 발송 승인]                 │
└─────────────────────────────────────────────────────────────┘
```

### 9-3. 답신 분석 뷰

```
┌─────────────────────────────────────────────────────────────┐
│  💬 답신 수신  ←  셀링메이트TV                             │
│  수신 시각: 2026-06-13 오전 11:32                          │
├─────────────────────────────────────────────────────────────┤
│  AI 분석 결과                                               │
│  유형: 관심 있음 ✅                                         │
│  요약: 매실인사이트에 관심 있고, 무료 체험 조건과          │
│        수익 쉐어 비율에 대해 상세 자료를 요청함             │
│  권장 액션: 48시간 내 통화 또는 상세 제안서 발송           │
├─────────────────────────────────────────────────────────────┤
│  원문 보기 ↓                                                │
│  "안녕하세요, 메일 잘 받았습니다. 관심 있는 내용인데       │
│   혹시 파트너 조건 상세 자료를 보내주실 수 있나요?..."    │
├─────────────────────────────────────────────────────────────┤
│  [협의중으로 변경]  [자료 발송]  [제외]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 파일 구조 v2

```
backend/
├── sql/
│   ├── 030_outreach_youtube.sql      ✅ 완료 (v1)
│   └── 031_outreach_v2.sql           🔲 신규 (v2 컬럼 추가)
├── app/
│   ├── services/
│   │   ├── youtube_scanner.py        ✅ 완료 (is_educator gate 수정 필요)
│   │   ├── channel_analyzer.py       🔲 신규 (Sonnet 심층 분석 + 초안)
│   │   ├── outreach_mailer.py        ✅ 완료 (자동발송 제거 필요)
│   │   └── gmail_watcher.py          🔲 신규 (Gmail API 답신 추적)
│   └── routers/
│       └── outreach.py               🔧 수정 (v2 엔드포인트 추가)

frontend/
└── app/
    ├── outreach/
    │   └── page.tsx                  🔧 수정 (파이프라인 뷰 + 초안 편집)
    └── ClientLayout.tsx              ✅ 완료
```

---

## 11. 구현 우선순위 (Roadmap)

### Sprint 1 (즉시) — 기존 코드 수정
- [ ] `youtube_scanner.py`: `is_educational_or_instructor` GATE 추가
- [ ] `youtube_scanner.py`: 자동 발송 로직 제거 (score 기준 자동발송 삭제)
- [ ] `outreach.py`: `/leads/{id}/approve`, `/leads/{id}/analyze` 엔드포인트 추가
- [ ] `031_outreach_v2.sql`: v2 컬럼 마이그레이션

### Sprint 2 — 핵심 신규 기능
- [ ] `channel_analyzer.py`: Claude Sonnet 심층 분석
- [ ] `channel_analyzer.py`: 채널 유형별 이메일 초안 생성
- [ ] `outreach/page.tsx`: 파이프라인 뷰 + 초안 편집 패널

### Sprint 3 — Gmail 연동
- [ ] Google OAuth 설정 (Gmail API 권한)
- [ ] `gmail_watcher.py`: 답신 폴링 (30분 간격)
- [ ] 답신 AI 분석 + 상태 자동 업데이트
- [ ] 답신 알림 이메일 (담당자에게)

### Sprint 4 — 고도화
- [ ] 네이버 카페 회원수 추출 (크롤링)
- [ ] 협의 단계 템플릿 (제안서 PDF 자동 생성)
- [ ] 전환율 대시보드 (발송 → 회신률 → 계약률)

---

## 12. 예상 성과 지표

| 지표 | 목표 |
|------|------|
| 일일 발굴 리드 | 20~50건 |
| A급 리드 비율 | 10~20% |
| 심층 분석 대상 | A급 전수 + B급 일부 |
| 이메일 발송 (주간) | 10~30건 (담당자 승인 후) |
| 예상 회신률 | 10~20% (개인화 기반) |
| 예상 협의 전환 | 회신의 30~50% |
| Claude API 비용 | Haiku ~$0.05/일, Sonnet ~$0.50/일 |
| YouTube API 유닛 | ~1,015 / 10,000/일 (10%) |
