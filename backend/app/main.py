import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.bootstrap import ensure_admin
from app.auth.router import router as auth_router
from app.config import Settings, get_settings
from app.core.errors import AppError, app_error_handler
from app.core.security import security_headers
from app.db.database import Database
from app.health import router as health_router

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)


def create_app(cfg: Settings | None = None, db: Database | None = None) -> FastAPI:
    """Arma la app. En tests se inyectan config y base."""
    cfg = cfg or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.db = db or Database(cfg.db_url)
        async with app.state.db.maker() as s:
            await ensure_admin(s, cfg)
        yield
        await app.state.db.close()

    app = FastAPI(title=cfg.app_name, version="0.1.0", lifespan=lifespan)
    app.middleware("http")(security_headers)
    app.add_exception_handler(AppError, app_error_handler)
    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    return app


app = create_app()
