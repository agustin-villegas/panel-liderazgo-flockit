from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import LoginAttempt
from app.core.clock import now, utc


class LoginLimiter:
    """N fallos por email+IP dentro de la ventana bloquean hasta que vence la ventana."""

    def __init__(self, db: AsyncSession, max_fails: int, window_min: int) -> None:
        self.db = db
        self.max = max_fails
        self.window = timedelta(minutes=window_min)

    async def retry_after(self, email: str, ip: str) -> int:
        """Segundos hasta poder reintentar. 0 = no bloqueado."""
        since = now() - self.window
        last_ok = await self.db.scalar(
            select(func.max(LoginAttempt.at)).where(
                LoginAttempt.email == email, LoginAttempt.ip == ip, LoginAttempt.ok.is_(True)
            )
        )
        if last_ok and utc(last_ok) > since:
            since = utc(last_ok)
        rows = await self.db.scalars(
            select(LoginAttempt.at)
            .where(
                LoginAttempt.email == email,
                LoginAttempt.ip == ip,
                LoginAttempt.ok.is_(False),
                LoginAttempt.at > since,
            )
            .order_by(LoginAttempt.at)
        )
        fails = [utc(t) for t in rows]
        if len(fails) < self.max:
            return 0
        until = fails[-self.max] + self.window
        return max(int((until - now()).total_seconds()), 1)

    async def record(self, email: str, ip: str, ok: bool) -> None:
        self.db.add(LoginAttempt(email=email, ip=ip, ok=ok, at=now()))
        await self.db.commit()
