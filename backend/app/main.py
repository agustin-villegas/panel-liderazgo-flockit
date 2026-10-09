import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.bootstrap import ensure_admin
from app.auth.router import router as auth_router
from app.compliance.service import Cache
from app.config import Settings, get_settings
from app.connections.factory import SourceFactory
from app.connections.router import router as conn_router
from app.connections.service import ensure_demo
from app.core.crypto import Cipher
from app.core.errors import AppError, app_error_handler
from app.core.security import security_headers
from app.db.database import Database
from app.health import router as health_router
from app.notifications.router import internal as internal_router
from app.notifications.router import router as notif_router
from app.projects.router import router as projects_router
from app.reports.router import router as reports_router

LOG_FMT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)


def create_app(cfg: Settings | None = None, db: Database | None = None) -> FastAPI:
    """Arma la app. En tests se inyectan config y base."""
    cfg = cfg or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.db = db or Database(cfg.db_url)
        app.state.cipher = Cipher(cfg.encryption_key)
        app.state.factory = SourceFactory(app.state.cipher)
        app.state.cache = Cache()
        app.state.boards = {}  # caché del tablero (60 s)
        app.state.notif_runs = {}  # última detección de avisos por proyecto
        async with app.state.db.maker() as s:
            await ensure_admin(s, cfg)
            await ensure_demo(s)
        yield
        await app.state.db.close()

    app = FastAPI(title=cfg.app_name, version="0.1.0", lifespan=lifespan)
    app.middleware("http")(security_headers)
    app.add_exception_handler(AppError, app_error_handler)
    for r in (
        health_router, auth_router, conn_router, projects_router, reports_router, notif_router,
    ):  # fmt: skip
        app.include_router(r, prefix="/api")
    app.include_router(internal_router)
    return app


app = create_app()
