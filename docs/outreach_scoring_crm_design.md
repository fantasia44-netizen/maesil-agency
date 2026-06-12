# 파트너 영업 시스템 — 점수 설계 + CRM 멀티터치 설계서

> 버전: 4.0 | 작성일: 2026-06-12
> 이전 v3 대비 추가: conversion_power / 경쟁리스크 감점 / 멀티터치 CRM / KPI / 동일인 병합

---

## 1. 점수 체계 전면 재설계

### 점수 구성 (3개 축)

```
최종 점수 = 영향력 점수 + 전환력 점수 - 리스크 감점
```

| 축 | 최대 | 목적 |
|----|------|------|
| 영향력 (reach) | +50 | 얼마나 많은 사람에게 닿는가 |
| 전환력 (conversion_power) | +40 | 실제 구매 행동을 일으키는 사람인가 |
| 리스크 (competitive_risk) | -40 | 우리 서비스를 쓸 가능성 낮은 유형 |
| **합계** | **0~100** | cap 적용 |

---

### 1-1. 영향력 점수 (최대 50점)

| 항목 | 점수 | 탐지 방법 |
|------|------|-----------|
| 이메일 주소 보유 | +15 | 정규식 추출 |
| 카카오채널 / 오픈채팅 보유 | +10 | URL 패턴 추출 |
| 네이버 카페 운영 | +20 | cafe.naver.com URL |
| 카페 추정 규모 5,000+ | +5 | 카페 페이지 파싱 |
| 최근 90일 내 업로드/발행 | +5 | published_at |
| 유튜브+블로그+카페 삼중 운영 | +5 | 멀티채널 보너스 (동일인 확인 후) |

---

### 1-2. 전환력 점수 conversion_power (최대 40점)

**핵심 개념**: 이 사람이 팔로워에게 실제 구매 결정을 유도하는 사람인가.  
단순 정보 전달자는 파트너가 되어도 전환이 낮음.

| 탐지 신호 | 점수 | 탐지 대상 (제목/설명/자막에서) |
|-----------|------|-------------------------------|
| **유료 강의 판매** (자신의 수강생 있음) | +15 | "수강생", "강의 신청", "클래스", "수강료", "기수 모집" |
| **오픈채팅 / 카카오 유료 멤버십 운영** | +12 | "오픈채팅 입장", "멤버십", "프리미엄 채널" |
| **전자책 / PDF 판매** | +8 | "전자책", "PDF 구매", "노션 템플릿" |
| **컨설팅 / 코칭 판매** | +10 | "컨설팅", "1:1 코칭", "멘토링 신청" |
| **제휴 마케팅 경험 있음** | +5 | "파트너", "제휴", "추천인 코드", "affiliate" |
| **도구 추천형 콘텐츠** | +8 | "사용 후기", "추천 툴", "이거 써보니까", "도구 소개" |

**탐지 로직 (Claude에 추가)**
```json
{
  "conversion_signals": {
    "has_paid_course": bool,
    "has_paid_membership": bool,
    "has_ebook_sale": bool,
    "has_consulting": bool,
    "has_affiliate_experience": bool,
    "has_tool_recommendation_content": bool,
    "conversion_power_score": 0~40
  }
}
```

---

### 1-3. 리스크 감점 competitive_risk (최대 -40점)

**핵심 개념**: 이 사람이 우리 서비스를 쓰거나 추천할 가능성이 낮은 유형.  
아무리 팔로워가 많아도 이런 유형은 파트너가 되지 않음.

| 감점 조건 | 점수 | 탐지 신호 |
|-----------|------|-----------|
| **자체 프로그램/툴 판매** | -30 | "저만의 솔루션", "제가 만든 프로그램", "엑셀 자동화 판매", "제 대시보드" |
| **경쟁 서비스 공식 파트너** | -25 | 특정 광고 솔루션사 로고, "공식 파트너사" |
| **강의 수익 100% 의존** | -15 | 강의 판매 + 다른 수익 구조 없음 + "강의만이 수익" |
| **프로그램 비교 콘텐츠 부정적** | -20 | "이런 프로그램 쓰지 마세요", "자동화 툴 사기" |
| **매실인사이트 언급 부정적** | -40 | 직접 언급 + 부정적 리뷰 |

**탐지 로직 (Claude에 추가)**
```json
{
  "risk_signals": {
    "sells_competing_tool": bool,
    "is_official_competitor_partner": bool,
    "course_revenue_only": bool,
    "has_negative_tool_content": bool,
    "competitive_risk_score": 0~40  (감점 절대값)
  }
}
```

**실제 예시**

| 채널 | 상황 | 점수 |
|------|------|------|
| 셀러A | 구독자 8천, 강의 판매, 이메일 있음, 도구 추천형 | 영향력 35 + 전환력 28 - 리스크 0 = **63점 (A)** |
| 셀러B | 구독자 5만, 자체 엑셀 솔루션 판매, 이메일 있음 | 영향력 25 + 전환력 15 - 리스크 30 = **10점 (D)** |
| 셀러C | 구독자 3천, 카페 12천명, 오픈채팅 판매, 이메일 없음 | 영향력 40 + 전환력 22 - 리스크 0 = **62점 (A)** |
| 셀러D | 구독자 2천, 정보성만, 이메일 없음 | 영향력 5 + 전환력 0 - 리스크 0 = **5점 (D)** |

---

## 2. 동일인 멀티채널 병합 (Dedup)

### 문제
```
유튜브 scanner → 셀링메이트TV (channel_id: UCxxx) → 리드 1건 생성
네이버 블로그 scanner → 셀링메이트 블로그 (bloggerlink: xxx) → 리드 1건 생성
→ 같은 사람인데 2건으로 쌓임
→ 멀티채널 보너스 미적용
→ 이메일 중복 발송 가능
```

### 해결: outreach_pipeline.py의 dedup 로직

```python
def find_existing_lead(contact_email: str | None, contact_kakao: str | None) -> str | None:
    """
    이미 같은 이메일 or 카카오 링크를 가진 리드가 있으면 해당 id 반환.
    """

def merge_lead(existing_id: str, new_data: dict) -> None:
    """
    기존 리드에 새 플랫폼 정보 병합.
    - platforms_json에 새 플랫폼 추가
    - 더 높은 점수 항목으로 업데이트
    - 멀티채널 보너스 +5~15점 추가
    """
```

### DB 추가 컬럼

```sql
-- 동일인이 여러 플랫폼을 운영하는 경우 모두 기록
platforms_json  JSONB,
-- [
--   { "platform": "youtube", "platform_id": "UCxxx", "url": "...", "subscribers": 8200 },
--   { "platform": "naver_blog", "platform_id": "blogxxx", "url": "...", "neighbors": 1200 }
-- ]

primary_platform TEXT,  -- 가장 영향력 높은 플랫폼
```

---

## 3. 멀티터치 CRM

### 현실 직시
```
1차 메일 → 무응답
2차 메일 → 무응답
3차 메일 → 무응답
...
→ 대부분 이렇게 됨

해결: 여러 채널로 여러 번 접촉 + 이력 추적
```

### 접촉 채널 & 순서

| 차수 | 채널 | 시점 | 비고 |
|------|------|------|------|
| 1차 | 이메일 | Day 0 | 메인 제안 |
| 2차 | 이메일 | Day 3 | 짧은 리마인드 ("혹시 보셨나요?") |
| 3차 | 이메일 | Day 10 | 마지막 시도 ("이번이 마지막입니다") |
| 4차 | 인스타 DM | Day 14 | 이메일 미응답 시 (인스타 있는 경우) |
| 5차 | 카페 쪽지 | Day 17 | 네이버 카페 있는 경우 |
| 6차 | 유튜브 댓글 | Day 21 | 최후 수단 (영상 최신 댓글) |

### outreach_touchpoints 테이블

```sql
CREATE TABLE agent_work.outreach_touchpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL REFERENCES agent_work.outreach_leads(id) ON DELETE CASCADE,

    touch_sequence  INTEGER NOT NULL,   -- 1, 2, 3, 4, 5, 6
    channel         TEXT NOT NULL,
    -- email | instagram_dm | naver_cafe_message | youtube_comment | kakao_message | phone

    status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | sent | failed | replied | bounced

    content_preview TEXT,   -- 발송한 메시지 앞 200자
    sent_at         TIMESTAMPTZ,
    replied_at      TIMESTAMPTZ,
    error_msg       TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (lead_id, touch_sequence)
);

CREATE INDEX ON agent_work.outreach_touchpoints (lead_id, status);
CREATE INDEX ON agent_work.outreach_touchpoints (status, sent_at);
```

### 멀티터치 스케줄러 로직

```python
def check_pending_followups():
    """
    3분마다 실행. 다음 접촉 시점이 된 리드에 자동 트리거.
    """
    # 이메일 발송된 리드 중 무응답 + 일정 일수 경과
    leads = get_leads_needing_followup()

    for lead in leads:
        next_touch = get_next_touch(lead)
        if next_touch is None:
            # 모든 차수 완료 → no_reply로 변경
            mark_no_reply(lead.id)
            continue

        if next_touch.channel == "email":
            send_followup_email(lead, next_touch.sequence)
        elif next_touch.channel == "instagram_dm":
            # 인스타 DM은 수동 처리 (자동화 어려움) → 담당자에게 알림
            notify_manual_dm(lead)
        elif next_touch.channel == "naver_cafe_message":
            notify_manual_cafe(lead)
        elif next_touch.channel == "youtube_comment":
            notify_manual_youtube_comment(lead)
```

### 이메일 시퀀스 템플릿

**1차 메일**: 풀 제안 (기존 outreach_mailer.py)

**2차 메일 (Day 3)**
```
제목: Re: [매실인사이트] 혹시 메일 받으셨나요?

안녕하세요, 다시 연락드립니다.
지난번 파트너십 제안 메일을 보내드렸는데 바쁘신 관계로
못 보셨을 것 같아 다시 한번 연락드립니다.

매실인사이트는 쿠팡·스마트스토어 광고 데이터를
AI로 분석해 ROAS와 비용을 최적화해드리는 서비스입니다.

관심이 있으시면 간단히 회신만 주셔도 됩니다.
혹시 관심이 없으시다면 말씀해 주시면 더 이상 연락드리지 않겠습니다.
```

**3차 메일 (Day 10)**
```
제목: 마지막으로 한 번만 더 — 매실인사이트

안녕하세요, 마지막으로 연락드립니다.

파트너십이 맞지 않는다면 완전히 이해합니다.
다만 혹시라도 구독자분들께 광고비 절감 방법을 소개하고 싶으실 때
저희가 떠오르신다면 언제든지 연락 주세요.

더 이상 연락드리지 않겠습니다. 채널 항상 잘 보고 있습니다!
```

---

## 4. KPI 목표 (30일)

| 단계 | 목표 | 측정 방법 |
|------|------|-----------|
| 발굴 | 100명 | outreach_leads count |
| A급 이상 | 30명 | grade = 'A' or 'S' |
| 심층 분석 완료 | 30명 | status >= 'draft_ready' |
| 이메일 발송 | 30건 | outreach_touchpoints touch_sequence=1 sent |
| 2차 메일 | 15건 | touch_sequence=2 sent |
| 답신 수신 | 3건 | replied_at IS NOT NULL |
| 미팅 / 통화 | 1건 | status = 'negotiating' |
| 제휴 계약 | 1건 | status = 'deal' |

### KPI 대시보드 UI
```
┌──────────────────────────────────────────────────────────────────┐
│  30일 목표 KPI                                                   │
│                                                                  │
│  발굴    ████████████████░░░  82/100 (82%)                       │
│  발송    ████████░░░░░░░░░░░  24/30  (80%)                       │
│  답신    ████░░░░░░░░░░░░░░░  1/3    (33%)  ← 집중 필요          │
│  미팅    ░░░░░░░░░░░░░░░░░░░  0/1    (0%)                        │
│  계약    ░░░░░░░░░░░░░░░░░░░  0/1    (0%)                        │
│                                                                  │
│  다음 액션: 2차 메일 발송 예정 8건 | 인스타 DM 대기 3건         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Claude 분석 프롬프트 최종 설계

### Haiku (GATE + 빠른 점수)

```
입력: 제목 + 설명 1000자 + 자막 500자
출력 (strict JSON):
{
  "is_seller_content": bool,
  "is_educational": bool,
  "content_summary": "30자 이내",
  "conversion_signals": {
    "has_paid_course": bool,
    "has_paid_membership": bool,
    "has_ebook_sale": bool,
    "has_consulting": bool,
    "has_affiliate_experience": bool,
    "has_tool_recommendation_content": bool,
    "conversion_power_score": int (0~40)
  },
  "risk_signals": {
    "sells_competing_tool": bool,
    "sells_own_program": bool,
    "is_competitor_partner": bool,
    "has_negative_tool_content": bool,
    "competitive_risk_score": int (0~40)
  },
  "confidence": "low|medium|high"
}
```

### Sonnet (A/S급만, 심층 분석 + 초안)

```
입력: 채널 전체 분석 데이터 (채널설명 + 영상 3개 + conversion/risk 신호)
출력 (strict JSON):
{
  "channel_type": "seller_educator|ad_specialist|community_owner|product_reviewer|income_sharer",
  "target_audience": "초보셀러|중급셀러|예비셀러|사업자",
  "core_topics": ["주제1", "주제2", "주제3"],
  "pain_points": ["시청자 문제1", "문제2"],
  "why_good_partner": "파트너로 적합한 이유 2문장",
  "why_risk": "리스크 요인 (없으면 null)",
  "approach_strategy": "추천 접근 방식",
  "email_tone": "격식체|친근체",
  "email_draft": "이메일 본문 전체 (채널명, 영상 제목 직접 삽입)"
}
```

**Sonnet 비용 제어**
- 점수 70점 이상 (A/S급)만 호출
- 이미 `analysis_json` 있으면 스킵 (재호출 방지)
- 일 최대 20건 제한 (비용 cap)

---

## 6. 최종 DB 스키마 (통합)

### outreach_leads 추가 컬럼

```sql
-- 전환력
conversion_power_score  INTEGER DEFAULT 0,
has_paid_course         BOOLEAN DEFAULT FALSE,
has_paid_membership     BOOLEAN DEFAULT FALSE,
has_consulting          BOOLEAN DEFAULT FALSE,
has_tool_recommendation BOOLEAN DEFAULT FALSE,

-- 리스크
competitive_risk_score  INTEGER DEFAULT 0,
sells_competing_tool    BOOLEAN DEFAULT FALSE,
sells_own_program       BOOLEAN DEFAULT FALSE,

-- 점수 내역
score_breakdown         JSONB,
-- { "reach": 35, "conversion_power": 22, "risk_deduction": -5, "total": 52 }

-- 멀티채널 병합
platforms_json          JSONB,   -- 운영 중인 모든 플랫폼
primary_platform        TEXT,

-- KPI 추적
touch_count             INTEGER DEFAULT 0,   -- 총 접촉 횟수
last_touch_at           TIMESTAMPTZ,
last_touch_channel      TEXT,
```

---

## 7. 파일 구조 최종

```
backend/app/services/
├── scanners/
│   ├── base.py                   # ContentItem, ContactInfo, BaseScanner
│   ├── youtube_scanner.py        # 리팩토링 (GATE 추가, 자동발송 제거)
│   └── naver_blog_scanner.py     # 신규 (Naver Search API + HTML 파싱)
│
├── outreach_pipeline.py          # 통합 실행 + dedup + 병합
├── outreach_scorer.py            # 점수 계산 (reach + conversion - risk)
├── channel_analyzer.py           # Sonnet 심층 분석 + 이메일 초안
├── outreach_mailer.py            # 이메일 발송 (시퀀스 지원)
├── outreach_followup.py          # 멀티터치 팔로업 스케줄러
└── gmail_watcher.py              # Gmail 답신 추적

backend/sql/
├── 030_outreach_youtube.sql      # ✅ 완료
└── 031_outreach_v4.sql           # 전체 재설계 (이 문서 기준)

frontend/app/outreach/
├── page.tsx                      # 리드 목록 (플랫폼 + 등급 + 유형 필터)
├── [id]/page.tsx                 # 리드 상세 (채널분석 + 이메일편집 + 접촉이력)
└── settings/page.tsx             # 스캔 설정 + KPI 대시보드
```

---

## 8. 구현 우선순위 재정렬

### 즉시 (Sprint 1)
1. `031_outreach_v4.sql` — 스키마 전면 재설계
2. `outreach_scorer.py` — reach + conversion_power - competitive_risk 계산
3. `scanners/base.py` — ContentItem 표준 인터페이스
4. `youtube_scanner.py` 리팩토링 — GATE + 새 점수 체계 + 자동발송 제거
5. `outreach_touchpoints` 테이블 + 라우터 엔드포인트

### Sprint 2
6. `channel_analyzer.py` — Sonnet 심층 분석 (A/S급 only)
7. `naver_blog_scanner.py` — Naver Search API + HTML 파싱
8. `outreach_followup.py` — 멀티터치 시퀀스 스케줄러
9. 프론트엔드 전면 개편 (KPI 대시보드 + 접촉 이력)

### Sprint 3
10. `gmail_watcher.py` — 답신 자동 감지
11. 인스타/카페 DM 수동 알림 (자동화 불가 채널)
12. 전환율 funnel 대시보드
