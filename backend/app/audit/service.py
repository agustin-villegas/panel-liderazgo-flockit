from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditEvent

SECRET_KEYS = {"password", "pwd", "token", "api_token", "secret"}


class AuditService:
    """Registro de acciones sensibles. Nunca guarda secretos."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        action: str,
        actor: UUID | None = None,
        entity: str | None = None,
        entity_id: str | None = None,
        data: dict[str, Any] | None = None,
        ip: str | None = None,
    ) -> None:
        """Agrega un evento de auditoría y lo confirma."""
        clean = {k: v for k, v in (data or {}).items() if k.lower() not in SECRET_KEYS}
        self.db.add(
            AuditEvent(
                action=action,
                actor_id=actor,
                entity=entity,
                entity_id=entity_id,
                data=clean or None,
                ip=ip,
            )
        )
        await self.db.commit()
