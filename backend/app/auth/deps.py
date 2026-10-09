from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.auth.models import Role, User
from app.auth.passwords import get_passwords
from app.auth.ratelimit import LoginLimiter
from app.auth.service import AuthService
from app.auth.sessions import SessionService
from app.config import Settings, get_settings
from app.core.errors import AuthError, ForbiddenError

COOKIE = "panel_session"


async def get_db(req: Request) -> AsyncIterator[AsyncSession]:
    async for db in req.app.state.db.session():
        yield db


Db = Annotated[AsyncSession, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


def client_ip(req: Request) -> str:
    """IP del cliente; detrás del proxy de Vercel viene en X-Forwarded-For."""
    fwd = req.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


def get_sessions(db: Db, cfg: Cfg) -> SessionService:
    return SessionService(db, cfg.session_hours)


def get_auth(db: Db, cfg: Cfg, sessions: Annotated[SessionService, Depends(get_sessions)]):
    return AuthService(
        db,
        get_passwords(),
        sessions,
        LoginLimiter(db, cfg.login_max_fails, cfg.login_window_min),
        AuditService(db),
    )


async def current_user(
    req: Request, sessions: Annotated[SessionService, Depends(get_sessions)]
) -> User:
    """Usuario de la cookie de sesión.

    Raises:
        AuthError: Sin cookie o sesión inválida/vencida.
    """
    token = req.cookies.get(COOKIE)
    user = await sessions.user(token) if token else None
    if user is None:
        raise AuthError("Sesión inválida o vencida")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def require_role(*roles: Role) -> Callable[[User], Awaitable[User]]:
    """Dependencia que exige uno de los roles dados."""

    async def check(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError("No tenés permiso para esta acción")
        return user

    return check


AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))]
