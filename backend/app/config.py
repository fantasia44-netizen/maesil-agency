from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# 프로젝트 루트의 .env 를 사용 (backend/ 한 단계 위)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    # 신규 이름 우선, 구 이름(AUTOTOOL_*) 폴백 — Render 환경변수 전환 전까지 호환
    maesil_total_supabase_url: str = Field(
        validation_alias=AliasChoices("MAESIL_TOTAL_SUPABASE_URL", "AUTOTOOL_SUPABASE_URL"),
    )
    maesil_total_service_role_key: str = Field(
        validation_alias=AliasChoices("MAESIL_TOTAL_SERVICE_ROLE_KEY", "AUTOTOOL_SERVICE_ROLE_KEY"),
    )

    api_bearer_token: str = ""
    cors_origins: str = "http://localhost:3000"

    # ── 보안 토글 (운영 기본값 = 안전. 불편하면 환경변수로 완화) ──────────
    # 관리자 디버그 엔드포인트(/admin/*) 활성화 여부. 기본 비활성(운영 안전).
    # 진단 필요 시 ENABLE_DEBUG_ENDPOINTS=1 로 한시적 활성화.
    enable_debug_endpoints: bool = False

    # 시크릿 봉투암호화 키 (Fernet, base64 32바이트).
    # 미설정 시 평문 저장으로 폴백(기존 호환). 생성:
    #   python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"
    secrets_enc_key: str = ""

    # 매 요청마다 DB에서 사용자 상태(is_active/role)를 재검증할지.
    # True면 계정 비활성화/강등이 즉시 반영(토큰 만료 대기 불필요).
    # 부하가 부담되면 AUTH_REVALIDATE=0 으로 끄고 토큰 만료에만 의존.
    auth_revalidate: bool = True
    # 재검증 결과 캐시 TTL(초) — DB 부하 완화. 0이면 매 요청 조회.
    auth_revalidate_cache_ttl: int = 30

    # 로그인 무차별 대입 방어. 동일 키(IP+이메일) 실패 누적 임계/잠금시간.
    # 0이면 비활성화.
    login_max_attempts: int = 10
    login_lockout_minutes: int = 15

    # Growth 대화 조회를 super_admin 전용으로 제한. 기본 True(안전).
    growth_admin_only: bool = True

    # Gmail 이메일 회신 분석(스케줄러). 영업이 카톡 오픈챗으로 전환되어 기본 off.
    # 이메일 회신 추적이 다시 필요하면 ENABLE_GMAIL_WATCHER=1.
    enable_gmail_watcher: bool = False

    # ── 영업 이메일 컴플라이언스 (정보통신망법) ────────────────────────
    # 수신거부 링크 베이스 URL. 예: https://maesil-agency.onrender.com
    # 비우면 메일에 링크 없이 "수신거부 회신" 안내만 표기.
    unsubscribe_base_url: str = ""
    # 광고 메일 하단 전송자 정보(상호·연락처·주소 등). 법적 표기 의무.
    outreach_sender_info: str = "매실인사이트 · support@maesil-insight.com"
    # 제목 맨 앞 "(광고)" 자동 표기 (영리 광고성 메일 의무).
    outreach_ad_prefix: bool = True
    # 야간(21~08시 KST) 자동 팔로업 발송 보류.
    outreach_quiet_hours: bool = True

    # 영업 메일 제목 템플릿 — 운영자가 직접 카피 통제. {handle}=채널명, {company}=회사명.
    # (광고) 접두는 발송 시 자동 부착되므로 여기엔 넣지 말 것.
    outreach_influencer_subject: str = "광고비 -75% 줄인 실제 데이터, 영상 소재로 써보실래요?"
    outreach_agency_subject: str = "무료체험 — {company}님 네이버·쿠팡 광고 리포트 10분 자동화"
    # 희소성 후킹: N>0 이면 "현재 셀러 유튜버 N팀만 테스트 파트너 모집 중" 노출.
    # 0이면 숨김(거짓 희소성 방지 — 실제 한정할 때만 숫자 입력).
    outreach_beta_slots: int = 0
    # 메일 내 링크 (매파스 파트너 페이지 / 실제 사례 페이지)
    outreach_maepas_url: str = "https://maesil-insight.com/partners"
    outreach_cases_url: str = "https://maesil-insight.com/cases"

    # ── 콜드 드립 발송 (유튜버 콜드 — Gmail API, 별도 Workspace 메일박스) ──
    # 세팅(메일박스+gmail OAuth 시크릿) 완료 후 1로 켜면 스케줄러가 자동 발송.
    outreach_cold_drip_enabled: bool = False
    outreach_daily_cap: int = 50            # 하루 최대 발송 수
    outreach_drip_grades: str = "S,A,B,C"  # 발송 대상 등급 (콤마)
    outreach_send_start_hour: int = 10      # 발송 시작 시각 (KST)
    outreach_send_end_hour: int = 17        # 발송 종료 시각 (KST)
    outreach_kakao_url: str = "https://open.kakao.com/o/sg6QOxDg"  # 오픈톡 실제 링크
    # gmail 발송 시크릿은 secrets 테이블 사용:
    #   outreach_gmail_client_id / _client_secret / _refresh_token / outreach_gmail_from

    @property
    def cors_origin_list(self) -> list[str]:
        # 와일드카드는 credentials와 충돌 + 보안 위험 → 거부
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if "*" in origins:
            raise RuntimeError("CORS_ORIGINS에 와일드카드(*)는 허용되지 않습니다. 명시적 origin을 나열하세요.")
        return origins


settings = Settings()  # type: ignore[call-arg]

# api_bearer_token은 admin 디버그 엔드포인트 게이트로 쓰임. 운영에서 기본값 사용 차단.
_BAD_BEARER = {"", "change-me", "changeme", "test", "default"}
if not settings.api_bearer_token or settings.api_bearer_token.strip().lower() in _BAD_BEARER or len(settings.api_bearer_token) < 16:
    raise RuntimeError(
        "API_BEARER_TOKEN 환경변수가 비어 있거나 너무 약합니다(16자 이상, 기본값 금지). "
        "Render 환경변수에 강력한 토큰을 설정하세요."
    )
