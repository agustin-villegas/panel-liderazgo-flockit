from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.auth.models import Role, User
from app.connections.models import Connection
from app.core.clock import now
from app.core.errors import AppError, ForbiddenError, NotFoundError
from app.projects.models import Account, Project, ProjectManager
from app.projects.schemas import AccountIn, AccountOut, ProjectIn, ProjectOut


class InvalidProjectError(AppError):
    status = 422
    code = "PROJECT_INVALID"


class ProjectService:
    """Cuentas y proyectos. Visibilidad: admin ve todo, Team Manager solo lo asignado."""

    def __init__(self, db: AsyncSession, audit: AuditService) -> None:
        self.db = db
        self.audit = audit

    # ── cuentas ──
    async def accounts(self) -> list[AccountOut]:
        rows = await self.db.scalars(select(Account).order_by(Account.name))
        return [AccountOut.model_validate(a) for a in rows]

    async def add_account(self, body: AccountIn, actor: UUID, ip: str) -> AccountOut:
        name = body.name.strip()
        if await self.db.scalar(select(Account).where(Account.name == name)):
            raise InvalidProjectError("Ya existe una cuenta con ese nombre")
        acc = Account(name=name)
        self.db.add(acc)
        await self.db.flush()
        await self.audit.log("cuenta.alta", actor, "cuenta", str(acc.id), {"name": name}, ip)
        return AccountOut.model_validate(acc)

    # ── proyectos ──
    async def visible(self, user: User) -> list[Project]:
        """Proyectos activos que el usuario puede ver."""
        q = select(Project).where(Project.archived_at.is_(None)).order_by(Project.name)
        if user.role != Role.ADMIN:
            q = q.join(ProjectManager, ProjectManager.project_id == Project.id).where(
                ProjectManager.user_id == user.id
            )
        return list(await self.db.scalars(q))

    async def get(self, pid: UUID, user: User) -> Project:
        """Proyecto si existe y el usuario lo puede ver.

        Raises:
            NotFoundError: Si no existe o está archivado.
            ForbiddenError: Si no es suyo.
        """
        proj = await self.db.get(Project, pid)
        if proj is None or proj.archived_at:
            raise NotFoundError("Proyecto no encontrado")
        if user.role != Role.ADMIN and not await self._manages(pid, user.id):
            raise ForbiddenError("No tenés acceso a este proyecto")
        return proj

    async def all(self, user: User) -> list[ProjectOut]:
        return [await self.out(p) for p in await self.visible(user)]

    async def create(self, body: ProjectIn, actor: UUID, ip: str) -> ProjectOut:
        await self._check_refs(body)
        proj = Project(
            name=body.name.strip(),
            account_id=body.account_id,
            conn_id=body.conn_id,
            board_id=body.board_id,
            board_name=body.board_name,
            from_sprint=body.from_sprint,
        )
        self.db.add(proj)
        await self.db.flush()
        await self._set_managers(proj.id, body.managers)
        await self.audit.log(
            "proyecto.alta", actor, "proyecto", str(proj.id), {"name": proj.name}, ip
        )
        return await self.out(proj)

    async def update(self, pid: UUID, body: ProjectIn, actor: User, ip: str) -> ProjectOut:
        proj = await self.get(pid, actor)
        await self._check_refs(body)
        proj.name = body.name.strip()
        proj.account_id = body.account_id
        proj.conn_id = body.conn_id
        proj.board_id = body.board_id
        proj.board_name = body.board_name
        proj.from_sprint = body.from_sprint
        await self._set_managers(pid, body.managers)
        await self.audit.log("proyecto.edicion", actor.id, "proyecto", str(pid), None, ip)
        return await self.out(proj)

    async def archive(self, pid: UUID, actor: User, ip: str) -> None:
        proj = await self.get(pid, actor)
        proj.archived_at = now()
        await self.audit.log("proyecto.archivo", actor.id, "proyecto", str(pid), None, ip)

    async def out(self, proj: Project) -> ProjectOut:
        acc = await self.db.get(Account, proj.account_id)
        mgrs = await self.db.scalars(
            select(ProjectManager.user_id).where(ProjectManager.project_id == proj.id)
        )
        return ProjectOut(
            id=proj.id,
            name=proj.name,
            account_id=proj.account_id,
            account=acc.name if acc else "",
            conn_id=proj.conn_id,
            board_id=proj.board_id,
            board_name=proj.board_name,
            from_sprint=proj.from_sprint,
            managers=list(mgrs),
        )

    async def _manages(self, pid: UUID, uid: UUID) -> bool:
        row = await self.db.get(ProjectManager, (pid, uid))
        return row is not None

    async def _check_refs(self, body: ProjectIn) -> None:
        if await self.db.get(Account, body.account_id) is None:
            raise InvalidProjectError("La cuenta no existe")
        if await self.db.get(Connection, body.conn_id) is None:
            raise InvalidProjectError("La conexión no existe")
        for uid in body.managers:
            if await self.db.get(User, uid) is None:
                raise InvalidProjectError("Uno de los Team Managers no existe")

    async def _set_managers(self, pid: UUID, users: list[UUID]) -> None:
        await self.db.execute(delete(ProjectManager).where(ProjectManager.project_id == pid))
        self.db.add_all(ProjectManager(project_id=pid, user_id=u) for u in set(users))
        await self.db.flush()
