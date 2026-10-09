import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.board.models import BoardIssue
from app.compliance.models import SprintResult, State
from app.compliance.service import ComplianceService, JiraReadError
from app.connections.factory import SourceFactory
from app.connections.models import Connection
from app.core.clock import now
from app.core.errors import NotFoundError
from app.jira.source import JiraError
from app.notifications.detector import Detector, Event
from app.notifications.models import Notification
from app.projects.models import Project, ProjectManager

log = logging.getLogger(__name__)

TTL = timedelta(minutes=15)
LIMIT = 50


class NotificationService:
    """Detecta eventos por proyecto, los reparte a los destinatarios y lista los avisos."""

    def __init__(
        self,
        db: AsyncSession,
        comp: ComplianceService,
        factory: SourceFactory,
        runs: dict[UUID, datetime],
    ) -> None:
        self.db = db
        self.comp = comp
        self.factory = factory
        self.runs = runs  # última corrida por proyecto (en memoria)

    # ── detección ──
    async def run(self, projs: list[Project], force: bool = False) -> int:
        """Corre la detección en los proyectos (si toca). Devuelve avisos nuevos."""
        total = 0
        for p in projs:
            last = self.runs.get(p.id)
            if not force and last and now() - last < TTL:
                continue
            self.runs[p.id] = now()
            try:
                total += await self._project(p)
            except (JiraReadError, JiraError) as e:
                log.warning("Notificaciones: Jira falló para %s: %s", p.name, e)
        return total

    async def _project(self, proj: Project) -> int:
        conn = await self.db.get(Connection, proj.conn_id) if proj.conn_id else None
        snap = await self.comp.snapshot(proj, conn)
        cards = await self._cards(conn, snap.results)
        events = Detector(proj.id, proj.name, now().date()).detect(snap.results, cards)
        return await self._fan_out(proj.id, events) if events else 0

    async def _cards(
        self, conn: Connection | None, results: list[SprintResult]
    ) -> list[BoardIssue]:
        active = next((r for r in results if r.sprint.state == State.ACTIVE), None)
        if active is None or conn is None:
            return []
        try:
            return await self.factory.make(conn).board_issues(active.sprint.id, conn.sp_field or "")
        except JiraError as e:
            raise JiraReadError(str(e)) from e

    async def _recipients(self, pid: UUID) -> list[UUID]:
        mgrs = await self.db.scalars(
            select(ProjectManager.user_id).where(ProjectManager.project_id == pid)
        )
        admins = await self.db.scalars(
            select(User.id).where(User.role == Role.ADMIN, User.disabled_at.is_(None))
        )
        return list(set(mgrs) | set(admins))

    async def _fan_out(self, pid: UUID, events: list[Event]) -> int:
        keys = [e.dedupe_key for e in events]
        n = 0
        for uid in await self._recipients(pid):
            q = select(Notification.dedupe_key).where(
                Notification.user_id == uid, Notification.dedupe_key.in_(keys)
            )
            seen = set(await self.db.scalars(q))
            for e in events:
                if e.dedupe_key in seen:
                    continue
                self.db.add(
                    Notification(
                        user_id=uid, project_id=pid, kind=e.kind, dedupe_key=e.dedupe_key,
                        title=e.title, body=e.body, link=e.link,
                    )
                )  # fmt: skip
                n += 1
        await self.db.commit()
        return n

    # ── lectura ──
    async def mine(self, user: User) -> tuple[list[Notification], int]:
        """Últimos avisos del usuario y cuántos están sin leer."""
        rows = await self.db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc(), Notification.id)
            .limit(LIMIT)
        )
        unread = await self.db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        )
        return list(rows), unread or 0

    async def mark(self, nid: UUID, user: User) -> None:
        """Marca un aviso como leído.

        Raises:
            NotFoundError: Si no existe o no es del usuario.
        """
        n = await self.db.get(Notification, nid)
        if n is None or n.user_id != user.id:
            raise NotFoundError("Aviso no encontrado")
        if n.read_at is None:
            n.read_at = now()
            await self.db.commit()

    async def mark_all(self, user: User) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
            .values(read_at=now())
        )
        await self.db.commit()
