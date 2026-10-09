import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.config import Settings

log = logging.getLogger(__name__)


async def ensure_admin(db: AsyncSession, cfg: Settings) -> None:
    """Crea el admin inicial desde ADMIN_EMAIL / ADMIN_PASSWORD_HASH.

    Si ya existe, conserva su contraseña (la pudo cambiar desde la app).
    Con ADMIN_RESET_PASSWORD=true se fuerza la del .env (para recuperar acceso).
    """
    email = cfg.admin_email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        db.add(User(email=email, name="Admin", role=Role.ADMIN, pwd_hash=cfg.admin_password_hash))
        log.info("Admin inicial creado: %s", email)
    else:
        user.role = Role.ADMIN
        user.disabled_at = None
        if cfg.admin_reset_password:
            user.pwd_hash = cfg.admin_password_hash
            log.warning("Contraseña del admin restablecida desde el .env")
    await db.commit()
