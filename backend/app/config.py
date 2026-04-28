import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 프로젝트 루트의 .env 를 사용 (backend/ 한 단계 위)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    # 신규 이름 우선, 구 이름(AUTOTOOL_*) 폴백 — Render 환경변수 전환 전까지 호환
    maesil_total_supabase_url: str = ""
    maesil_total_service_role_key: str = ""

    api_bearer_token: str = "change-me"
    cors_origins: str = "http://localhost:3000"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 구 환경변수 폴백
        if not self.maesil_total_supabase_url:
            self.maesil_total_supabase_url = os.environ.get("AUTOTOOL_SUPABASE_URL", "")
        if not self.maesil_total_service_role_key:
            self.maesil_total_service_role_key = os.environ.get("AUTOTOOL_SERVICE_ROLE_KEY", "")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]
