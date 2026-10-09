from fastapi import FastAPI

from app.config import get_settings
from app.health import router as health_router


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(title=cfg.app_name, version="0.1.0")
    app.include_router(health_router, prefix="/api")
    return app


app = create_app()
