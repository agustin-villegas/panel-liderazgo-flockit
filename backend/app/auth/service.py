from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.auth.models import User
from app.auth.passwords import Passwords
from app.auth.ratelimit import LoginLimiter
from app.auth.sessions import SessionService
from app.core.clock import now
from app.core.errors import AuthError, RateLimitError

BAD_LOGIN = "Email o contraseña incorrectos"


class AuthService:
    """Login y logout. Orquesta limiter, contraseñas, sesiones y auditoría."""

    def __init__(
        self,
        db: AsyncSession,
        pwds: Passwords,
        sessions: SessionService,
        limiter: LoginLimiter,
        audit: AuditService,
    ) -> None:
        self.db = db
        self.pwds = pwds
        self.sessions = sessions
        self.limiter = limiter
        self.audit = audit

    async def login(self, email: str, pwd: str, ip: str, agent: str | None) -> tuple[User, str]:
        """Valida credenciales y crea la sesión.

        Raises:
            RateLimitError: Si superó los intentos permitidos.
            AuthError: Si las credenciales no son válidas (mensaje genérico).
        """
        email = email.strip().lower()
        if wait := await self.limiter.retry_after(email, ip):
            await self.audit.log("auth.login_blocked", data={"email": email}, ip=ip)
            raise RateLimitError(wait)

        user = await self.db.scalar(select(User).where(User.email == email))
        valid = self.pwds.verify(user.pwd_hash if user else None, pwd)
        if not user or not valid or not user.active:
            await self.limiter.record(email, ip, ok=False)
            await self.audit.log("auth.login_failed", data={"email": email}, ip=ip)
            raise AuthError(BAD_LOGIN)

        await self.limiter.record(email, ip, ok=True)
        user.last_login_at = now()
        token = await self.sessions.create(user, ip, agent)
        await self.audit.log("auth.login", actor=user.id, ip=ip)
        return user, token

    async def logout(self, token: str, user: User, ip: str) -> None:
        """Revoca la sesión en el servidor."""
        await self.sessions.revoke(token)
        await self.audit.log("auth.logout", actor=user.id, ip=ip)
