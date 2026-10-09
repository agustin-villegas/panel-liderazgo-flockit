from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import McpToken
from app.ai.schemas import TokenNew, TokenOut
from app.auth.models import User
from app.auth.tokens import digest, new_token
from app.core.clock import now
from app.core.errors import NotFoundError

PREFIX = "pnl_"


class McpTokenService:
    """Tokens personales del MCP: el crudo se muestra una vez; en base solo el hash."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user: User, name: str) -> TokenNew:
        raw = PREFIX + new_token()
        row = McpToken(user_id=user.id, name=name.strip(), token_hash=digest(raw), last4=raw[-4:])
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return TokenNew(**TokenOut.model_validate(row).model_dump(), token=raw)

    async def all(self, user: User) -> list[TokenOut]:
        rows = await self.db.scalars(
            select(McpToken)
            .where(McpToken.user_id == user.id, McpToken.revoked_at.is_(None))
            .order_by(McpToken.created_at.desc())
        )
        return [TokenOut.model_validate(r) for r in rows]

    async def revoke(self, tid: UUID, user: User) -> None:
        """Revoca un token propio.

        Raises:
            NotFoundError: Si no existe, ya está revocado o es de otro usuario.
        """
        row = await self.db.get(McpToken, tid)
        if row is None or row.user_id != user.id or row.revoked_at:
            raise NotFoundError("Token no encontrado")
        row.revoked_at = now()
        await self.db.commit()

    async def user_for(self, raw: str) -> User | None:
        """Usuario dueño del token si está vigente y el usuario sigue activo."""
        found = (
            await self.db.execute(
                select(McpToken, User)
                .join(User, User.id == McpToken.user_id)
                .where(McpToken.token_hash == digest(raw))
            )
        ).first()
        if not found:
            return None
        tok, user = found
        if tok.revoked_at or not user.active:
            return None
        tok.last_used_at = now()
        await self.db.commit()
        return user
