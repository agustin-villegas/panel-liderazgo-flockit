from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserSession
from app.auth.tokens import digest, new_token
from app.core.clock import now, utc

TOUCH_EVERY = timedelta(minutes=5)


class SessionService:
    """Sesiones opacas en base: revocables desde el servidor."""

    def __init__(self, db: AsyncSession, hours: int) -> None:
        self.db = db
        self.ttl = timedelta(hours=hours)

    async def create(self, user: User, ip: str | None, agent: str | None) -> str:
        token = new_token()
        ts = now()
        self.db.add(
            UserSession(
                user_id=user.id,
                token_hash=digest(token),
                expires_at=ts + self.ttl,
                last_seen_at=ts,
                ip=ip,
                agent=(agent or "")[:300],
            )
        )
        await self.db.commit()
        return token

    async def user(self, token: str) -> User | None:
        row = await self.db.execute(
            select(UserSession, User)
            .join(User, User.id == UserSession.user_id)
            .where(UserSession.token_hash == digest(token))
        )
        found = row.first()
        if not found:
            return None
        sess, user = found
        ts = now()
        if sess.revoked_at or utc(sess.expires_at) <= ts or not user.active:
            return None
        # sesión deslizante: se renueva con la actividad
        if ts - utc(sess.last_seen_at) > TOUCH_EVERY:
            sess.last_seen_at = ts
            sess.expires_at = ts + self.ttl
            await self.db.commit()
        return user

    async def revoke(self, token: str) -> None:
        await self.db.execute(
            update(UserSession)
            .where(UserSession.token_hash == digest(token), UserSession.revoked_at.is_(None))
            .values(revoked_at=now())
        )
        await self.db.commit()

    async def revoke_all(self, user_id) -> None:
        await self.db.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
            .values(revoked_at=now())
        )
        await self.db.commit()

    async def revoke_others(self, user_id, keep: str) -> None:
        """Corta todas las sesiones del usuario menos la actual."""
        await self.db.execute(
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.token_hash != digest(keep),
            )
            .values(revoked_at=now())
        )
        await self.db.commit()
