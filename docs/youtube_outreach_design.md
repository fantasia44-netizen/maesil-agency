# YouTube 파트너 영업 자동화 시스템 설계서

> 버전: 1.0 | 작성일: 2026-06-12 | 담당: maesil-agency

---

## 1. 시스템 개요

### 목적
쿠팡·스마트스토어 셀러 교육 유튜버를 자동 발굴하여 매실인사이트 파트너십 제안 이메일을 자동 발송하는 영업 자동화 파이프라인.

### 핵심 원칙
- **영상 우선 탐색**: 채널 단위가 아닌 영상 단위로 검색하여 신생 유튜버 포함
- **중복 방지**: 이미 스캔한 영상은 재처리하지 않음 (DB dedup)
- **완전 자동화**: 스케줄러가 매일 실행 → 리드 빌드 → 이메일 자동 발송
- **구독자 하한 없음**: 조회수 500회 이상 롱폼이면 소규모 채널도 대상

### 시스템 구성도

```
[Google YouTube Data API v3]
         │
         ▼
[youtube_scanner.py] ────────────────────────────────────────┐
   1. 키워드 검색 (search.list)                              │
   2. DB 중복 제거 (outreach_scanned_videos)                  │
   3. 영상 상세 + 필터 (videos.list)                          │
   4. 자막 수집 (youtube-transcript-api, 0 units)             │
   5. Claude Haiku 콘텐츠 분석                               │
   6. 채널 상세 조회 (channels.list)                          │
   7. 점수 계산 + outreach_leads 업서트                       │
         │                                                    │
         ▼                                                    │
[outreach_mailer.py]                                          │
   score >= 55 + email 보유 → 이메일 자동 발송                │
   (notify_client → maesil-insight 메일 게이트웨이)           │
         │                                                    │
         ▼                                                    │
[Supabase agent_work schema] ◄────────────────────────────────┘
   outreach_scanned_videos  (중복 방지)
   outreach_leads           (리드 목록)
         │
         ▼
[/outreach 프론트엔드 페이지]
   통계 / 리드 목록 / 수동 발송 / 상태 관리
```

---

## 2. 파이프라인 상세

### 2-1. 실행 주기
- **자동**: `main.py` 스케줄러에서 UTC 날짜가 바뀔 때 1회 실행
- **수동**: `POST /api/outreach/scan` 호출 시 백그라운드 스레드로 즉시 실행

### 2-2. Step-by-Step 흐름

```
Step 1  키워드 검색 (10개 키워드 × 50결과 = 최대 500개 video_id)
         └─ search.list, videoDuration=medium (4~20분, Shorts 자동 제외)
         └─ relevanceLanguage=ko, regionCode=KR
         └─ 중복 video_id 제거 (세션 내)

Step 2  DB 중복 제거
         └─ outreach_scanned_videos 조회 → 이미 있는 video_id 제외

Step 3  영상 상세 조회 (videos.list, 50개씩 배치)
         └─ 조회수 < 500 제외
         └─ 재생시간 ≤ 60초 제외 (Shorts 2차 방어)
         └─ 통과한 영상만 다음 단계로

Step 4  자막 수집 (youtube-transcript-api, API 유닛 0)
         └─ 한국어 → 영어 순으로 시도
         └─ 실패해도 다음 단계 진행 (선택적)

Step 5  Claude Haiku 콘텐츠 분석 (영상당 1 API 호출)
         └─ 입력: 제목 + 설명 + 자막 일부
         └─ 출력: is_seller_content (bool), content_summary, confidence
         └─ 셀러 콘텐츠 여부 판단 핵심 단계

Step 6  채널 상세 조회 (channels.list, 50개씩 배치)
         └─ 구독자 수, 채널 URL, 채널 설명(이메일/카페 추출용)

Step 7  연락처 추출 (정규식, 영상 설명 + 채널 설명 통합)
         └─ 이메일, 네이버 카페, 블로그, 인스타그램

Step 8  점수 계산 → outreach_leads UPSERT (channel_id 기준)
         └─ 이미 있는 채널이면 업데이트 (더 높은 점수 영상 발견 시)

Step 9  자동 이메일 발송
         └─ score >= 55 + contact_email 보유 + status = 'new' 조건
         └─ 최대 10건/1회 실행 (BATCH_LIMIT)
         └─ 발송 성공 시 status → 'emailed'

Step 10 스캔 기록
         └─ 처리한 모든 video_id → outreach_scanned_videos 삽입
```

---

## 3. 검색 키워드 목록

| # | 키워드 | 타겟 유저 |
|---|--------|-----------|
| 1 | 스마트스토어 운영 노하우 | 스마트스토어 셀러/강사 |
| 2 | 쿠팡파트너스 수익 후기 | 쿠팡 파트너스 운영자 |
| 3 | 온라인 셀러 강의 | 셀러 교육 채널 |
| 4 | 구매대행 방법 알려드림 | 해외 구매대행 운영자 |
| 5 | 위탁판매 시작하기 | 위탁판매 강사 |
| 6 | 스마트스토어 상위노출 방법 | SEO/광고 전문 셀러 |
| 7 | 쿠팡 광고 최적화 | 쿠팡 광고 전문가 |
| 8 | 온라인 쇼핑몰 운영 | 종합 커머스 채널 |
| 9 | 네이버 스마트스토어 강의 | 스마트스토어 교육자 |
| 10 | 셀러마켓 수익 공개 | 수익 공개 셀러 |

---

## 4. 점수 계산 로직

| 항목 | 점수 | 비고 |
|------|------|------|
| 이메일 주소 추출됨 | +30 | 실제 연락 가능성 최우선 |
| 네이버 카페 URL 있음 | +25 | 커뮤니티 운영 → 영향력 있음 |
| Claude가 셀러 콘텐츠 확인 | +25 | 타겟 맞음 확인 |
| 최근 90일 이내 업로드 | +15 | 활성 채널 여부 |
| 구독자 500~500,000명 | +10 | 적정 규모 (너무 크면 파트너십 어려움) |
| 블로그/인스타그램 있음 | +5 | 멀티채널 운영자 |
| **최대 합계** | **110** | 실제 최대 100점으로 cap |

### 자동 발송 기준
- **score ≥ 55**: 이메일 + Claude 확인 모두 있을 때 달성 가능한 최소 점수
- 이메일 없으면 발송 불가 (30점 미달로 기준 미충족)

---

## 5. 이메일 템플릿

### 제목
```
[매실인사이트] {채널명}님께 파트너십을 제안드립니다 🌿
```

### 본문 구성 (HTML)
1. **헤더**: 매실인사이트 로고 + 그라디언트 배경
2. **인사말**: 채널명 + content_summary 삽입
3. **파트너 혜택 박스**:
   - 수익 쉐어 10~20% (파트너 링크 유입 기준)
   - 전용 파트너 링크 + 실시간 전환 통계
   - 무료 체험 3개월
   - 광고비 절감 사례 제공
4. **서비스 소개**: 쿠팡·스마트스토어 AI 광고 분석
5. **CTA 버튼**: "파트너십 문의하기" → maesil-insight.com
6. **푸터**: 수신거부 안내

### 발송 경로
```
outreach_mailer.send_email()
    → notify_client.send_email()
        → maesil-insight /api/v1/notify/email
            → 실제 메일 발송
```

---

## 6. DB 스키마

### outreach_scanned_videos
```sql
CREATE TABLE agent_work.outreach_scanned_videos (
    video_id    TEXT PRIMARY KEY,
    channel_id  TEXT,
    scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- 역할: 중복 스캔 방지 (영상 단위)
- 삭제 정책: 없음 (계속 누적)

### outreach_leads
```sql
CREATE TABLE agent_work.outreach_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id              TEXT NOT NULL UNIQUE,   -- 채널 단위로 1건
    channel_title           TEXT,
    channel_url             TEXT,
    subscriber_count        INTEGER,
    contact_email           TEXT,                   -- 추출된 이메일
    naver_cafe_url          TEXT,
    blog_url                TEXT,
    instagram_url           TEXT,
    best_video_id           TEXT,                   -- 가장 먼저 발견된 영상
    best_video_title        TEXT,
    best_video_views        INTEGER,
    best_video_published_at TIMESTAMPTZ,
    content_summary         TEXT,                   -- Claude 분석 요약
    score                   INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'new',
    -- status: new | emailed | replied | rejected
    emailed_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 상태(status) 전이
```
new → emailed  (자동 발송 or 수동 발송)
    → rejected (관리자가 제외 처리)
emailed → replied (회신 수신 시 수동 업데이트)
        → rejected
```

---

## 7. API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/outreach/leads` | 리드 목록 (쿼리: status, min_score, limit, offset) |
| GET | `/api/outreach/leads/{id}` | 리드 상세 |
| POST | `/api/outreach/leads/{id}/send` | 수동 이메일 발송 |
| PATCH | `/api/outreach/leads/{id}/status` | 상태 변경 `{ status: "replied" }` |
| POST | `/api/outreach/scan` | 스캔 수동 트리거 (백그라운드) |
| GET | `/api/outreach/scan/stats` | 통계 (총 리드 수, 상태별, 스캔 영상 수) |

모든 엔드포인트: `require_admin` (super_admin 권한 필요)

---

## 8. 프론트엔드 페이지 (`/outreach`)

### 레이아웃
```
[헤더] 유튜브 영업 리드          [🔍 지금 스캔]

[통계 카드 5개]
 전체 리드 | 신규 | 발송 완료 | 회신 수신 | 스캔된 영상

[필터 탭] 전체(n) | 신규(n) | 발송됨(n) | 회신옴(n) | 제외(n)

[리드 카드 목록]
┌─────────────────────────────────────────────────┐
│  [점수]  채널명(링크)  [상태뱃지]               │
│   72    구독자 1.2만 · 📧 abc@naver.com · 카페  │
│         스마트스토어 세금신고 A-Z 강의채널      │
│         🎬 스마트스토어 절세 방법 (3.2천회)     │
│                              [📧 이메일 발송]   │
│                              [상태 드롭다운 ▾]  │
└─────────────────────────────────────────────────┘
```

### 점수 색상 코딩
- 70점 이상: 초록색
- 50~69점: 주황색
- 50점 미만: 회색

---

## 9. YouTube API 유닛 예산

| 작업 | 단위 | 횟수/일 | 소비 |
|------|------|---------|------|
| search.list | 100 | 10회 | 1,000 |
| videos.list (50개씩) | 1 | ~10회 | 10 |
| channels.list (50개씩) | 1 | ~5회 | 5 |
| 자막 수집 (transcript-api) | 0 | 무제한 | 0 |
| **합계** | | | **~1,015** |
| **일일 한도** | | | **10,000** |
| **사용률** | | | **~10%** |

---

## 10. 파일 구조

```
backend/
├── sql/
│   └── 030_outreach_youtube.sql        # DB 마이그레이션
├── app/
│   ├── services/
│   │   ├── youtube_scanner.py          # 스캔 파이프라인 (신규)
│   │   └── outreach_mailer.py          # 이메일 발송 (신규)
│   ├── routers/
│   │   └── outreach.py                 # API 엔드포인트 (기존 + 추가)
│   └── main.py                         # 스케줄러 (수정)
├── requirements.txt                    # 패키지 추가

frontend/
└── app/
    ├── outreach/
    │   └── page.tsx                    # 리드 관리 페이지 (신규)
    └── ClientLayout.tsx                # 네비게이션 "영업" 링크 추가
```

---

## 11. 설정 필요 항목

### Render 환경변수 / Secrets (`/settings` 페이지)

| 키 | 값 | 비고 |
|----|-----|------|
| `youtube_api_key` | AIza... | Google Cloud Console → YouTube Data API v3 |
| `anthropic_api_key` | sk-ant-... | Claude Haiku 사용 (기존 키 재사용) |
| `maesil_insight_url` | https://... | 이메일 게이트웨이 주소 (기존) |
| `harness_api_token` | ... | maesil-insight API 토큰 (기존) |

### YouTube API 키 발급 절차
1. Google Cloud Console → 새 프로젝트 생성
2. YouTube Data API v3 활성화
3. 사용자 인증 정보 → API 키 생성
4. (권장) IP 제한 또는 Referrer 제한 설정

### Supabase 마이그레이션
```
Supabase 대시보드 → SQL Editor → 아래 파일 내용 실행:
backend/sql/030_outreach_youtube.sql
```

---

## 12. 운영 주의사항

### YouTube API 할당량
- 일일 10,000 유닛 (무료 기준)
- 초과 시 `HttpError 403` → 당일 스캔 중단됨
- 초과 방지: 키워드 수 줄이기 or Google Cloud에서 할당량 증가 신청

### 이메일 발송 제한
- 1회 실행당 최대 10건 (`BATCH_LIMIT = 10`)
- 스팸 방지: 같은 채널에 중복 발송 없음 (status='emailed' 체크)
- 발송 실패 시 status 변경 안 됨 → 다음 배치에서 재시도 가능

### Claude Haiku 비용
- 영상 1건당 약 $0.0003 (200 output tokens 기준)
- 일 500건 분석 시 약 $0.15/일

### 자동 발송 비활성화 방법
`youtube_scanner.py` 마지막 블록에서 `send_pending_batch()` 호출 주석 처리하면
스캔 및 리드 수집은 하되 이메일은 발송하지 않음.
수동 발송만 원할 경우 해당 처리 권장.
