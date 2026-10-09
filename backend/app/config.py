from functools import lru_cache
from urllib.parse import quote

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_MODEL = "gpt-5.4-mini"


class Settings(BaseSettings):
    """Config desde variables de entorno. Si falta una obligatoria, la app no arranca."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Panel de liderazgo"
    env: str = "dev"

    # Base: URL completa, o las partes (la contraseña se codifica sola)
    database_url: str = ""
    db_password: str = ""
    db_user: str = "postgres"
    db_host: str = "localhost"
    db_port: int = 6543
    db_name: str = "postgres"

    session_secret: str = Field(min_length=32)
    encryption_key: str
    cron_secret: str = Field(min_length=16)

    admin_email: str
    admin_password_hash: str = Field(pattern=r"^\$argon2id\$")
    admin_reset_password: bool = False

    session_hours: int = 8
    login_max_fails: int = 5
    login_window_min: int = 15

    frontend_origin: str = "http://localhost:3000"
    webauthn_rp_id: str = "localhost"

    ai_model: str = ""  # vacío = DEFAULT_MODEL
    openai_api_key: str = ""
    google_api_key: str = ""
    # local con antivirus que inspecciona HTTPS (ej. Kaspersky): confiar en los certs del SO
    system_certs: bool = False

    @model_validator(mode="after")
    def _need_db(self) -> "Settings":
        if not self.database_url and not self.db_password:
            raise ValueError("Falta DB_PASSWORD (o DATABASE_URL) en el .env")
        return self

    @property
    def model(self) -> str:
        """Modelo de IA a usar (AI_MODEL o el default)."""
        return self.ai_model or DEFAULT_MODEL

    @property
    def db_url(self) -> str:
        """URL async para SQLAlchemy."""
        if not self.database_url:
            pwd = quote(self.db_password, safe="")
            return (
                f"postgresql+asyncpg://{self.db_user}:{pwd}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        # Supabase da postgresql://; SQLAlchemy async necesita el driver
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
