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
