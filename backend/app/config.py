from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Config desde variables de entorno (.env en local)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Panel de liderazgo"
    env: str = "dev"
    frontend_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
