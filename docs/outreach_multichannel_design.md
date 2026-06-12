# 멀티채널 파트너 영업 시스템 설계서

> 버전: 3.0 | 작성일: 2026-06-12
> YouTube 단일 → YouTube + 블로그 + 카페 + 인스타 통합 플랫폼

---

## 1. 확장 방향

### 지원 플랫폼 (우선순위 순)

| 우선순위 | 플랫폼 | API | 비고 |
|----------|--------|-----|------|
| 1 | YouTube | YouTube Data API v3 | 자막 분석 가능, 설계 완료 |
| 2 | 네이버 블로그 | Naver Search API | 무료, 즉시 사용 가능 |
| 3 | 티스토리 | 없음 (크롤링) | robots.txt 허용 범위 내 |
| 4 | 브런치 | 없음 (크롤링) | 글 퀄리티 높음 |
| 5 | 인스타그램 | Meta Graph API | 사업자 계정 필요 |
| 확장 | 네이버 카페 | Naver Search API | 카페글 검색 가능 |

### 핵심 설계 원칙
- **플랫폼 무관 통합 DB**: 유튜브든 블로그든 `outreach_leads` 1개 테이블
- **플러그인 구조 스캐너**: 플랫폼별 scanner 모듈 → 공통 데이터 형식으로 변환
- **채널 유형 표준화**: 플랫폼과 관계없이 동일한 유형 분류 체계
- **UI 통합 뷰**: 플랫폼 아이콘만 다르고 나머지 UX 동일

---

## 2. 플랫폼별 데이터 수집 방법

### 2-1. YouTube (완료)
```
API: YouTube Data API v3
키워드 검색 → video_id → videos.list → channels.list
자막: youtube-transcript-api (0 units)
일 예산: ~1,015 units / 10,000
```

### 2-2. 네이버 블로그
```
API: Naver Search API (무료, 일 25,000 호출)
엔드포인트: GET https://openapi.naver.com/v1/search/blog
파라미터: query={키워드}, display=100, sort=date
반환: title, link, description, bloggername, bloggerlink, postdate

추가: 블로그 포스트 HTML 파싱 (requests + BeautifulSoup)
  → 이메일, 카카오채널, 오픈채팅 추출
  → 최근 포스트 수 / 댓글 수 수집

시크릿: naver_client_id, naver_client_secret
```

**네이버 블로그 키워드**
```
스마트스토어 운영 노하우
쿠팡 광고 최적화 방법
온라인셀러 수익공개
구매대행 시작하기
위탁판매 마진 계산
스마트스토어 상위노출 SEO
쿠팡파트너스 수익 후기
온라인쇼핑몰 정산 방법
스마트스토어 세금 처리
셀러 광고비 절감
```

### 2-3. 티스토리
```
API: 없음 → Google Custom Search API 활용
  site:tistory.com {키워드}
또는 Naver Search API webkr (웹문서 검색)

수집 후 포스트 HTML 파싱
  → 블로그 홈 URL 추출 → 메인 페이지에서 연락처
```

### 2-4. 인스타그램 (Phase 3)
```
API: Meta Graph API (Basic Display API)
  → 해시태그 검색: #스마트스토어 #쿠팡셀러
  → Business Discovery API로 팔로워 수 조회
제약: 비즈니스 앱 승인 필요 (1~2주)
```

---

## 3. DB 스키마 v3 (플랫폼 무관 통합)

### 3-1. outreach_leads (메인 테이블)

```sql
CREATE TABLE agent_work.outreach_leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── 플랫폼 ──────────────────────────────────────────────────────
    platform                TEXT NOT NULL,
    -- youtube | naver_blog | tistory | brunch | instagram | naver_cafe
    platform_id             TEXT NOT NULL,
    -- youtube: channel_id
    -- naver_blog: bloggerlink (https://blog.naver.com/xxx)
    -- tistory: 블로그 루트 URL
    -- instagram: username
    platform_url            TEXT,

    -- ── 채널/블로그 기본 정보 ───────────────────────────────────────
    handle_name             TEXT,   -- 채널명 / 블로그 제목 / 닉네임
    owner_name              TEXT,   -- 실명 (공개된 경우)

    -- ── 영향력 지표 (플랫폼별 의미 다름) ───────────────────────────
    subscriber_count        INTEGER,
    -- youtube: 구독자 수
    -- naver_blog: 이웃 수 (크롤링)
    -- instagram: 팔로워 수

    content_count           INTEGER,   -- 총 영상 수 / 포스트 수
    avg_views               INTEGER,   -- 평균 조회수 / 평균 방문자
    avg_comments            INTEGER,   -- 평균 댓글 수 (참여도)
    community_size          INTEGER,   -- 카페 회원 수 / 오픈채팅 인원

    -- ── 콘텐츠 분류 (AI 분석 결과) ─────────────────────────────────
    channel_type            TEXT,
    -- seller_educator   : 셀러 대상 교육/강의
    -- ad_specialist     : 광고·마케팅 전문
    -- community_owner   : 카페·커뮤니티 운영자
    -- product_reviewer  : 제품 리뷰어 (셀러 관련)
    -- income_sharer     : 수익 공개형
    -- general_ecommerce : 일반 이커머스 관련

    content_category        TEXT[],
    -- ['smartstore', 'coupang', 'overseas_purchase', 'consignment', 'naver_ad', 'coupang_ad']

    target_audience         TEXT,
    -- 초보셀러 | 중급셀러 | 예비셀러 | 사업자

    activity_level          TEXT,
    -- active (90일 내 업로드) | semi_active | inactive

    -- ── 연락처 ──────────────────────────────────────────────────────
    contact_email           TEXT,
    contact_kakao           TEXT,   -- 카카오채널 or 오픈채팅 링크
    contact_naver_cafe      TEXT,
    contact_blog            TEXT,   -- 타 블로그 링크
    contact_instagram       TEXT,
    contact_youtube         TEXT,   -- 블로거가 유튜브도 운영하는 경우

    -- ── 대표 콘텐츠 (가장 좋은 영상/포스트 1개) ────────────────────
    best_content_id         TEXT,   -- video_id / post_url
    best_content_title      TEXT,
    best_content_views      INTEGER,
    best_content_published_at TIMESTAMPTZ,

    -- ── AI 분석 (Haiku 빠른 분류) ──────────────────────────────────
    is_seller_content       BOOLEAN DEFAULT FALSE,
    is_educational          BOOLEAN DEFAULT FALSE,   -- GATE 조건
    content_summary         TEXT,                    -- 30자 요약
    ai_confidence           TEXT,                    -- low|medium|high

    -- ── AI 심층 분석 (Sonnet, Phase 2) ─────────────────────────────
    analysis_json           JSONB,
    -- {
    --   channel_type, content_category, target_audience,
    --   core_topics: ["주제1","주제2","주제3"],
    --   pain_points: ["문제1","문제2"],
    --   maesil_fit: "연계 포인트",
    --   approach_strategy: "추천 접근 방식",
    --   email_tone: "격식체|친근체",
    --   influencer_tier: "nano|micro|mid|macro"
    -- }

    approach_strategy       TEXT,   -- analysis_json에서 발췌, 빠른 조회용

    -- ── 이메일 초안 ─────────────────────────────────────────────────
    email_draft             TEXT,   -- AI 생성 초안
    email_final             TEXT,   -- 담당자 최종 편집본
    email_subject           TEXT,

    -- ── 점수 ────────────────────────────────────────────────────────
    score                   INTEGER NOT NULL DEFAULT 0,
    score_detail            JSONB,  -- 항목별 점수 내역
    grade                   TEXT,   -- A | B | C | D

    -- ── CRM 상태 ────────────────────────────────────────────────────
    status                  TEXT NOT NULL DEFAULT 'discovered',
    -- discovered | analyzing | draft_ready | approved
    -- | emailed | replied | no_reply
    -- | negotiating | deal | rejected | archived

    -- ── 답신 추적 ───────────────────────────────────────────────────
    reply_type              TEXT,
    -- interested | declined | question | auto_reply | spam
    reply_summary           TEXT,
    reply_received_at       TIMESTAMPTZ,
    gmail_thread_id         TEXT,
    next_action             TEXT,

    -- ── 타임스탬프 ──────────────────────────────────────────────────
    emailed_at              TIMESTAMPTZ,
    last_scanned_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT outreach_leads_platform_id_key UNIQUE (platform, platform_id),
    CONSTRAINT outreach_leads_status_check CHECK (status IN (
        'discovered','analyzing','draft_ready','approved','emailed',
        'replied','no_reply','negotiating','deal','rejected','archived'
    )),
    CONSTRAINT outreach_leads_platform_check CHECK (platform IN (
        'youtube','naver_blog','tistory','brunch','instagram','naver_cafe'
    ))
);

-- 인덱스
CREATE INDEX ON agent_work.outreach_leads (platform, status);
CREATE INDEX ON agent_work.outreach_leads (score DESC);
CREATE INDEX ON agent_work.outreach_leads (grade, status);
CREATE INDEX ON agent_work.outreach_leads (channel_type);
```

### 3-2. outreach_scanned_content (중복 방지)

```sql
CREATE TABLE agent_work.outreach_scanned_content (
    platform    TEXT NOT NULL,
    content_id  TEXT NOT NULL,   -- video_id / post_url / post_id
    lead_id     UUID REFERENCES agent_work.outreach_leads(id) ON DELETE SET NULL,
    scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (platform, content_id)
);

CREATE INDEX ON agent_work.outreach_scanned_content (lead_id);
```

---

## 4. 점수 계산 v3

### 4-1. GATE (False면 점수 0, 즉시 drop)
```
is_seller_content = TRUE
AND is_educational = TRUE
```

### 4-2. 점수 항목

```
[연락 가능성]
  이메일 주소 보유               +25
  카카오채널 / 오픈채팅 보유     +15
  연락처 없음                     +0

[커뮤니티 영향력]
  네이버 카페 운영               +30  ← 최고 가중치
  카페 추정 회원 5,000명 이상   +10  (추가)
  오픈채팅 운영                  +10

[콘텐츠 신뢰도]
  Claude 셀러+교육 확인          +20
  최근 90일 내 업로드/발행       +10
  콘텐츠 10개 이상               +5

[채널 규모]
  구독자/이웃 1,000~50,000       +10  (마이크로 인플루언서 최적)
  구독자/이웃 500~1,000          +5   (성장 중)
  평균 조회수/방문자 1,000 이상  +5

[멀티채널 보너스]
  YouTube + 블로그 동시 운영     +10
  유튜브 + 블로그 + 카페 삼중    +15
  블로그 + 인스타 동시            +5

[최대 합계 → cap 100]
```

### 4-3. 등급 기준

| 등급 | 점수 | 의미 | 액션 |
|------|------|------|------|
| S | 85+ | 즉시 심층 분석 + 초안 | 최우선 |
| A | 70~84 | 심층 분석 + 초안 | 당일 처리 |
| B | 50~69 | 분석 대기열 | 여유 시 처리 |
| C | 30~49 | 발굴만 저장 | 보류 |
| D | 30 미만 | 자동 archived | 무시 |

---

## 5. 스캐너 모듈 구조

### 플러그인 인터페이스

```python
# base_scanner.py (공통 인터페이스)
class BaseScanner:
    platform: str  # 'youtube' | 'naver_blog' | ...
    keywords: list[str]

    def search(self, keyword: str) -> list[str]:
        """키워드 검색 → content_id 목록 반환"""

    def fetch_content_detail(self, content_ids: list[str]) -> list[ContentItem]:
        """콘텐츠 상세 조회 → 표준 형식으로 변환"""

    def extract_contact(self, text: str) -> ContactInfo:
        """설명/본문에서 연락처 추출 (공통 로직)"""

    def to_lead_payload(self, item: ContentItem) -> dict:
        """outreach_leads 업서트용 dict 변환"""


@dataclass
class ContentItem:
    """플랫폼 무관 표준 콘텐츠 형식"""
    platform: str
    platform_id: str          # channel_id / blog_url
    platform_url: str
    content_id: str           # video_id / post_url
    handle_name: str
    content_title: str
    content_body: str         # 설명 / 본문 (분석용)
    content_transcript: str   # 자막 / 전문 (분석용)
    views: int
    published_at: datetime
    subscriber_count: int | None
    avg_comments: int | None
    community_size: int | None
    raw_contact_text: str     # 이메일/카페 추출 원본
```

### 파일 구조
```
backend/app/services/
├── scanners/
│   ├── __init__.py
│   ├── base.py               # BaseScanner, ContentItem, ContactInfo
│   ├── youtube_scanner.py    # YouTube 스캐너 (기존 리팩토링)
│   ├── naver_blog_scanner.py # 네이버 블로그 스캐너 (신규)
│   ├── tistory_scanner.py    # 티스토리 스캐너 (신규, Phase 2)
│   └── instagram_scanner.py  # 인스타 스캐너 (신규, Phase 3)
├── outreach_pipeline.py      # 스캐너 통합 실행 + DB 업서트
├── channel_analyzer.py       # Sonnet 심층 분석 + 이메일 초안
├── outreach_mailer.py        # 이메일 발송
└── gmail_watcher.py          # 답신 추적 (Phase 3)
```

---

## 6. 네이버 블로그 스캐너 설계

```python
# naver_blog_scanner.py

SEARCH_KEYWORDS = [
    "스마트스토어 운영 노하우",
    "쿠팡 광고 최적화",
    "온라인셀러 수익공개",
    "구매대행 시작하기",
    "위탁판매 마진 계산",
    "스마트스토어 상위노출",
    "쿠팡파트너스 수익 후기",
    "셀러 광고비 절감",
    "스마트스토어 세금 처리",
    "네이버 광고 ROAS",
]

NAVER_SEARCH_URL = "https://openapi.naver.com/v1/search/blog"

def search_blogs(keyword: str, display: int = 100) -> list[dict]:
    """
    Naver Search API → 블로그 포스트 검색
    반환: [{ title, link, description, bloggername, bloggerlink, postdate }]
    필요 헤더: X-Naver-Client-Id, X-Naver-Client-Secret
    """

def fetch_blog_home(blog_url: str) -> dict:
    """
    블로그 메인 페이지 파싱
    → { email, kakao, cafe_url, recent_post_count, last_post_date }
    BeautifulSoup으로 HTML 파싱
    robots.txt 허용 범위 내 (naver.com/robots.txt: /blog/ Disallow 없음)
    """

def get_blog_stats(blog_url: str) -> dict:
    """
    공개 블로그 통계
    → { total_posts, subscriber_count (이웃), avg_comments_estimate }
    """
```

### 네이버 블로그 점수 특이사항
- **이웃 수**: 유튜브 구독자와 동일 가중치
- **댓글 수**: 네이버 블로그는 댓글 많으면 영향력 높음
- **카페 연결**: 블로그 + 카페 조합이 국내에서 가장 강력한 커뮤니티 구조

---

## 7. UI 설계 v3

### 7-1. 리드 목록 (통합 플랫폼 뷰)

```
┌────────────────────────────────────────────────────────────────────┐
│  파트너 영업 리드                              [+ 스캔 설정]       │
│  YouTube · 네이버블로그 · 티스토리 통합 관리                      │
├────────────────────────────────────────────────────────────────────┤
│  [통계]  발굴 42 | 초안완료 8 | 승인대기 3 | 발송 12 | 답신 2    │
├────────────────────────────────────────────────────────────────────┤
│  [플랫폼 필터] 전체 | 🎬 YouTube | 📝 네이버블로그 | 📄 티스토리 │
│  [상태 필터]   전체 | 발굴됨 | 초안완료 | 발송됨 | 답신           │
│  [등급 필터]   전체 | S급 | A급 | B급                             │
│  [채널 유형]   전체 | 셀러교육 | 광고전문 | 카페운영 | 수익공개   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │  🎬  [S급 91점]  셀링메이트TV            [draft_ready 🟢]   │  │
│ │      셀러교육 · YouTube · 구독자 8,200 · 카페 추정 1.5만    │  │
│ │      📧 sell@naver.com · 카페 · 인스타                       │  │
│ │      스마트스토어+구매대행 A-Z 강의채널                      │  │
│ │      → 수강생 무료 광고분석 이벤트 제안 추천                │  │
│ │                              [📋 초안 보기]  [✅ 승인·발송]  │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │  📝  [A급 78점]  스마트스토어연구소          [discovered 🔵] │  │
│ │      카페운영 · 네이버블로그 · 이웃 1,200 · 카페 8,700       │  │
│ │      📧 없음 · 카카오채널 있음                               │  │
│ │      스마트스토어 세금/정산 전문 블로그                      │  │
│ │      → 카페 회원 대상 무료 체험 이벤트 제안                  │  │
│ │                              [🔍 심층분석]  [제외]           │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │  🎬  [A급 74점]  쿠팡광고마스터              [emailed 🟡]   │  │
│ │      광고전문 · YouTube + 네이버블로그 멀티                   │  │
│ │      📧 admin@coupangad.com                                   │  │
│ │      쿠팡 광고 ROAS 최적화 전문 채널                         │  │
│ │      ✅ 발송: 2026-06-10 · 무응답 중                          │  │
│ │                              [💬 답신 분석]  [리마인드 발송]  │  │
│ └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 7-2. 리드 상세 / 채널 분석 카드

```
┌──────────────────────────────────────────────────────────────────┐
│  채널 분석 상세  ──  셀링메이트TV                                │
├───────────────────────────────┬──────────────────────────────────┤
│  기본 정보                    │  영향력 지표                     │
│  플랫폼: YouTube              │  구독자: 8,200명                 │
│  채널 유형: 셀러 교육         │  카페: 추정 15,000명             │
│  대상: 초보셀러               │  평균 조회수: 3,400회            │
│  카테고리: 스마트스토어,      │  최근 업로드: 6일 전             │
│            구매대행           │  콘텐츠 수: 142개                │
├───────────────────────────────┴──────────────────────────────────┤
│  AI 분석 요약                                                    │
│  구매대행 + 스마트스토어 병행 강의 채널. 초보 셀러 대상          │
│  실전형 튜토리얼 중심. 유료 수강 프로그램 운영 중.              │
│  카페에서 수강생 Q&A 커뮤니티 운영.                             │
│                                                                  │
│  핵심 주제: 구매대행 소싱, 스마트스토어 SEO, 세금신고           │
│  시청자 고충: 광고비 낭비, 정산 오류, 키워드 선정               │
│                                                                  │
│  매실인사이트 연계: 수강생들이 직접 겪는 광고비 낭비 문제를     │
│  정확히 해결함. 강사가 직접 사용 후기 → 강의 소재로 활용 가능. │
├──────────────────────────────────────────────────────────────────┤
│  추천 접근 전략                                                  │
│  "수강생 전원 무료 광고분석 이벤트 제안"                        │
│  → 강사가 수강생에게 특별혜택 제공하는 구조                     │
│  → 수강생 전환 시 수익 쉐어 발생                                │
├──────────────────────────────────────────────────────────────────┤
│  점수 내역                                                       │
│  이메일 보유 +25 | 카페 운영 +30 | 교육 확인 +20               │
│  최근 업로드 +10 | 구독자 규모 +10 | 유튜브+블로그 멀티 없음   │
│  합계: 95점 → cap 100 적용 → 91점                               │
├──────────────────────────────────────────────────────────────────┤
│  이메일 초안 편집                                                │
│  제목: [매실인사이트] 수강생분들께 드리고 싶은 선물이 있어서요  │
│  ─────────────────────────────────────────────────────────────  │
│  안녕하세요, 셀링메이트TV 채널 운영자님 👋                      │
│                                                                  │
│  "구매대행 완전 정복 풀코스" 강의 시리즈 보면서                 │
│  수강생분들이 실전에서 광고비 때문에 많이 고생하신다는 걸       │
│  느꼈습니다.                                                     │
│  ...                                                             │
│  [AI 재생성]  [저장]  [✅ 이대로 발송 승인]                     │
└──────────────────────────────────────────────────────────────────┘
```

### 7-3. 스캔 설정 페이지 (`/outreach/settings`)

```
┌──────────────────────────────────────────────────────────────────┐
│  영업 스캔 설정                                                  │
├──────────────────────────────────────────────────────────────────┤
│  활성화된 플랫폼                                                 │
│  ☑ YouTube      (API 키 등록됨 ✅)                               │
│  ☑ 네이버 블로그 (Client ID 등록됨 ✅)                           │
│  ☐ 티스토리     (설정 필요)                                     │
│  ☐ 인스타그램   (Meta 앱 승인 필요)                             │
├──────────────────────────────────────────────────────────────────┤
│  검색 키워드 관리                                                │
│  YouTube: [스마트스토어 운영] [쿠팡 광고] [+ 추가]              │
│  블로그:  [스마트스토어 노하우] [온라인셀러] [+ 추가]           │
├──────────────────────────────────────────────────────────────────┤
│  점수 필터                                                       │
│  자동 심층분석 시작 등급: [A급 이상 ▾]                          │
│  자동 archived 기준: [D급 (30점 미만) ▾]                        │
├──────────────────────────────────────────────────────────────────┤
│  발송 설정                                                       │
│  자동 발송: ☐ 비활성화 (추천: 수동 승인)                        │
│  리마인드: 발송 후 [ 7 ]일 무응답 시 알림                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. API 엔드포인트 v3

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/outreach/leads` | 통합 리드 목록 (platform, grade, channel_type, status 필터) |
| GET | `/api/outreach/leads/{id}` | 리드 상세 + analysis_json 전체 |
| POST | `/api/outreach/leads/{id}/analyze` | 심층 분석 트리거 (Sonnet) |
| PATCH | `/api/outreach/leads/{id}/email-draft` | 이메일 초안 저장 |
| POST | `/api/outreach/leads/{id}/approve` | 발송 승인 |
| POST | `/api/outreach/leads/{id}/send` | 이메일 발송 |
| PATCH | `/api/outreach/leads/{id}/status` | 상태 수동 변경 |
| GET | `/api/outreach/scan/stats` | 플랫폼별 통계 |
| POST | `/api/outreach/scan` | 전체 스캔 트리거 |
| POST | `/api/outreach/scan/{platform}` | 특정 플랫폼만 스캔 |
| GET | `/api/outreach/settings` | 스캔 설정 조회 |
| PATCH | `/api/outreach/settings` | 스캔 설정 수정 |
| POST | `/api/outreach/gmail-webhook` | Gmail 답신 웹훅 |

---

## 9. 구현 로드맵

### Sprint 1 (즉시) — DB + 기존 코드 정리
- [ ] `031_outreach_v3.sql`: 테이블 재설계 (platform 컬럼 추가, 컬럼 추가)
- [ ] `youtube_scanner.py` 리팩토링: BaseScanner 상속, GATE 추가, 자동발송 제거
- [ ] `outreach.py` 라우터: v3 엔드포인트로 업데이트

### Sprint 2 — 네이버 블로그 스캐너 + 심층 분석
- [ ] `naver_blog_scanner.py`: Naver Search API 연동
- [ ] `channel_analyzer.py`: Sonnet 심층 분석 + 채널 유형별 이메일 초안
- [ ] 프론트엔드: 플랫폼 필터 + 채널 유형 분류 + 초안 편집 패널

### Sprint 3 — Gmail 답신 추적
- [ ] Gmail API OAuth 설정
- [ ] `gmail_watcher.py`: 답신 폴링 (30분) + AI 분석
- [ ] 프론트엔드: 답신 분석 뷰

### Sprint 4 — 고도화
- [ ] 티스토리 스캐너
- [ ] 스캔 설정 UI (`/outreach/settings`)
- [ ] 전환율 대시보드 (발굴 → 발송 → 회신 → 계약 funnel)
- [ ] 인스타그램 스캐너 (Meta 승인 후)

---

## 10. 필요 시크릿

| 키 | 플랫폼 | 발급처 |
|----|--------|--------|
| `youtube_api_key` | YouTube | Google Cloud Console |
| `naver_client_id` | 네이버 블로그 | Naver Developers |
| `naver_client_secret` | 네이버 블로그 | Naver Developers |
| `anthropic_api_key` | Claude 분석 | 기존 재사용 |
| `maesil_insight_url` | 이메일 발송 | 기존 재사용 |
| `harness_api_token` | 이메일 발송 | 기존 재사용 |
| `gmail_oauth_credentials` | 답신 추적 | Google Cloud Console |
