from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import McpToken
from app.audit.service import AuditService
from app.auth.models import Role, User
from app.auth.passwords import Passwords
from app.auth.sessions import SessionService
from app.core.clock import now
from app.core.errors import AppError, NotFoundError
from app.users.schemas import UserIn, UserOut, UserPatch

DUP_MSG = "Ya existe un usuario con ese email"


class DuplicateEmailError(AppError):
    status = 409
    code = "EMAIL_DUPLICATE"


class UserGuardError(AppError):
    status = 409
    code = "USER_GUARD"


class UserService:
    """Alta, edición y baja lógica de usuarios (solo admin)."""

    def __init__(
        self, db: AsyncSession, pwds: Passwords, sessions: SessionService, audit: AuditService
    ) -> None:
        self.db = db
        self.pwds = pwds
        self.sessions = sessions
        self.audit = audit

    async def all(self) -> list[UserOut]:
        rows = await self.db.scalars(select(User).order_by(User.name, User.email))
        return [UserOut.model_validate(u) for u in rows]

    async def create(self, body: UserIn, actor: UUID, ip: str) -> UserOut:
        """Crea el usuario.

        Raises:
            DuplicateEmailError: Si el email ya existe.
        """
        await self._check_email(body.email)
        user = User(
            email=body.email,
            name=f"{body.first_name} {body.last_name}",
            role=body.role,
            pwd_hash=self.pwds.hash(body.password),
        )
        self.db.add(user)
        await self._flush()
        await self.db.refresh(user)
        out = UserOut.model_validate(user)
        data = {"email": body.email, "role": body.role}
        await self.audit.log("usuario.alta", actor, "usuario", str(user.id), data, ip)
        return out

    async def update(self, uid: UUID, body: UserPatch, actor: User, ip: str) -> UserOut:
        """Edita datos, rol y opcionalmente la contraseña (corta sus sesiones).

        Raises:
            NotFoundError: Si el usuario no existe.
            DuplicateEmailError: Si el email ya lo usa otro.
            UserGuardError: Si deja al sistema sin admin o el admin se degrada a sí mismo.
        """
        user = await self._get(uid)
        if body.email != user.email:
            await self._check_email(body.email)
        if user.role == Role.ADMIN and body.role != Role.ADMIN:
            if user.id == actor.id:
                raise UserGuardError("No podés quitarte el rol de admin")
            await self._check_last_admin(user.id)
        user.name = f"{body.first_name} {body.last_name}"
        user.email = body.email
        user.role = body.role
        if body.password:
            user.pwd_hash = self.pwds.hash(body.password)
            user.must_change_pwd = False
        await self._flush()
        if body.password:
            await self.sessions.revoke_all(user.id)
        await self.db.refresh(user)
        out = UserOut.model_validate(user)
        data = {"email": body.email, "role": body.role, "pwd": bool(body.password)}
        await self.audit.log("usuario.edicion", actor.id, "usuario", str(uid), data, ip)
        return out

    async def disable(self, uid: UUID, actor: User, ip: str) -> UserOut:
        """Deshabilita: corta sesiones y revoca tokens MCP. No borra nada.

        Raises:
            NotFoundError: Si el usuario no existe.
            UserGuardError: Si es uno mismo o el último admin activo.
        """
        user = await self._get(uid)
        if user.id == actor.id:
            raise UserGuardError("No podés deshabilitarte a vos mismo")
        if user.role == Role.ADMIN and user.active:
            await self._check_last_admin(user.id)
        if user.active:
            user.disabled_at = now()
            await self.db.execute(
                update(McpToken)
                .where(McpToken.user_id == uid, McpToken.revoked_at.is_(None))
                .values(revoked_at=now())
            )
            await self.sessions.revoke_all(uid)
            await self.audit.log("usuario.deshabilitado", actor.id, "usuario", str(uid), None, ip)
        await self.db.refresh(user)
        return UserOut.model_validate(user)

    async def enable(self, uid: UUID, actor: User, ip: str) -> UserOut:
        """Vuelve a habilitar al usuario.

        Raises:
            NotFoundError: Si el usuario no existe.
        """
        user = await self._get(uid)
        if not user.active:
            user.disabled_at = None
            await self._flush()
            await self.audit.log("usuario.habilitado", actor.id, "usuario", str(uid), None, ip)
        await self.db.refresh(user)
        return UserOut.model_validate(user)

    async def _get(self, uid: UUID) -> User:
        user = await self.db.get(User, uid)
        if not user:
            raise NotFoundError("Usuario no encontrado")
        return user

    async def _check_email(self, email: str) -> None:
        if await self.db.scalar(select(User.id).where(User.email == email)):
            raise DuplicateEmailError(DUP_MSG)

    async def _check_last_admin(self, uid: UUID) -> None:
        others = await self.db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.role == Role.ADMIN, User.disabled_at.is_(None), User.id != uid)
        )
        if not others:
            raise UserGuardError("Tiene que quedar al menos un admin activo")

    async def _flush(self) -> None:
        try:
            await self.db.flush()
        except IntegrityError:
            await self.db.rollback()
            raise DuplicateEmailError(DUP_MSG) from None
