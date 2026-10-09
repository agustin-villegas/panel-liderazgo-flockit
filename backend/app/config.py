from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Config desde variables de entorno. Si falta una obligatoria, la app no arranca."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Panel de liderazgo"
    env: str = "dev"

    database_url: str
    session_secret: str = Field(min_length=32)
    encryption_key: str
    cron_secret: str = Field(min_length=16)

    admin_email: str
    admin_password_hash: str = Field(pattern=r"^\$argon2id\$")

    session_hours: int = 8
    login_max_fails: int = 5
    login_window_min: int = 15

    frontend_origin: str = "http://localhost:3000"
    webauthn_rp_id: str = "localhost"

    ai_model: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    @property
    def db_url(self) -> str:
        # Supabase da postgresql://; SQLAlchemy async necesita el driver
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
