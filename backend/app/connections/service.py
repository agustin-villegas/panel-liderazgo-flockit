from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.connections.factory import SourceFactory
from app.connections.models import DEMO, JIRA, Connection
from app.connections.schemas import BoardOut, ConnIn, ConnOut, FieldOut, TestIn, TestOut
from app.core.clock import now
from app.core.crypto import Cipher
from app.core.errors import AppError, NotFoundError
from app.jira.source import JiraError, JiraSource, guess_sp_field
from app.projects.models import Project

DEMO_NAME = "Demo (datos sintéticos)"


class ConnInvalidError(AppError):
    status = 422
    code = "CONNECTION_INVALID"


class ConnectionService:
    """ABM de conexiones de Jira. El token se guarda cifrado y nunca sale."""

    def __init__(
        self, db: AsyncSession, cipher: Cipher, factory: SourceFactory, audit: AuditService
    ) -> None:
        self.db = db
        self.cipher = cipher
        self.factory = factory
        self.audit = audit

    async def all(self) -> list[ConnOut]:
        counts = dict(
            (
                await self.db.execute(
                    select(Project.conn_id, func.count()).group_by(Project.conn_id)
                )
            ).all()
        )
        rows = await self.db.scalars(select(Connection).order_by(Connection.created_at))
        return [
            ConnOut.model_validate(c).model_copy(update={"projects": counts.get(c.id, 0)})
            for c in rows
        ]

    async def get(self, cid: UUID) -> Connection:
        conn = await self.db.get(Connection, cid)
        if conn is None:
            raise NotFoundError("Conexión no encontrada")
        return conn

    async def source(self, cid: UUID) -> tuple[Connection, JiraSource]:
        conn = await self.get(cid)
        return conn, self.factory.make(conn)

    async def test(self, body: TestIn) -> TestOut:
        """Prueba credenciales sin guardar. Sin token, usa el guardado de conn_id."""
        token = body.token
        if not token and body.conn_id:
            stored = await self.get(body.conn_id)
            token = self.cipher.open(stored.token_enc) if stored.token_enc else None
        if not token:
            return TestOut(ok=False, error="Falta el API token")
        src = self.factory.raw(str(body.site), body.email, token)
        try:
            user = await src.me()
            sp = guess_sp_field(await src.sp_fields())
        except JiraError as e:
            return TestOut(ok=False, error=str(e))
        return TestOut(ok=True, user=user, sp_field=sp)

    async def create(self, body: ConnIn, actor: UUID, ip: str) -> ConnOut:
        if not body.token:
            raise ConnInvalidError("El API token es obligatorio")
        check = await self.test(TestIn(site=body.site, email=body.email, token=body.token))
        if not check.ok:
            raise ConnInvalidError(check.error or "La conexión no pasó la prueba")
        conn = Connection(
            name=body.name.strip(),
            kind=JIRA,
            site=str(body.site).rstrip("/"),
            email=body.email.strip(),
            token_enc=self.cipher.seal(body.token),
            token_last4=body.token[-4:],
            sp_field=body.sp_field or check.sp_field,
            skip_subtasks=body.skip_subtasks,
            status="ok",
            checked_at=now(),
            created_by=actor,
        )
        self.db.add(conn)
        await self.db.flush()
        await self.audit.log(
            "conexion.alta", actor, "conexion", str(conn.id), {"name": conn.name}, ip
        )
        return ConnOut.model_validate(conn)

    async def update(self, cid: UUID, body: ConnIn, actor: UUID, ip: str) -> ConnOut:
        conn = await self.get(cid)
        if conn.kind == DEMO:
            raise ConnInvalidError("La conexión Demo no se edita")
        check = await self.test(
            TestIn(site=body.site, email=body.email, token=body.token, conn_id=cid)
        )
        if not check.ok:
            raise ConnInvalidError(check.error or "La conexión no pasó la prueba")
        conn.name = body.name.strip()
        conn.site = str(body.site).rstrip("/")
        conn.email = body.email.strip()
        if body.token:
            conn.token_enc = self.cipher.seal(body.token)
            conn.token_last4 = body.token[-4:]
        conn.sp_field = body.sp_field or conn.sp_field or check.sp_field
        conn.skip_subtasks = body.skip_subtasks
        conn.status, conn.last_error, conn.checked_at = "ok", None, now()
        await self.audit.log(
            "conexion.edicion", actor, "conexion", str(cid), {"name": conn.name}, ip
        )
        return ConnOut.model_validate(conn)

    async def delete(self, cid: UUID, confirm: str, actor: UUID, ip: str) -> None:
        conn = await self.get(cid)
        if conn.kind == DEMO:
            raise ConnInvalidError("La conexión Demo no se borra")
        if confirm.strip() != conn.name:
            raise ConnInvalidError("Escribí el nombre exacto de la conexión para confirmar")
        await self.db.execute(update(Project).where(Project.conn_id == cid).values(conn_id=None))
        await self.db.delete(conn)
        await self.audit.log("conexion.baja", actor, "conexion", str(cid), {"name": conn.name}, ip)

    async def boards(self, cid: UUID) -> list[BoardOut]:
        _, src = await self.source(cid)
        try:
            return [BoardOut(id=b.id, name=b.name, key=b.key) for b in await src.boards()]
        except JiraError as e:
            raise ConnInvalidError(str(e)) from e

    async def fields(self, cid: UUID) -> list[FieldOut]:
        _, src = await self.source(cid)
        try:
            return [FieldOut(id=f.id, name=f.name) for f in await src.sp_fields()]
        except JiraError as e:
            raise ConnInvalidError(str(e)) from e


async def ensure_demo(db: AsyncSession) -> None:
    """La conexión Demo existe siempre (deploy público sin credenciales)."""
    found = await db.scalar(select(Connection).where(Connection.kind == DEMO))
    if found is None:
        db.add(Connection(name=DEMO_NAME, kind=DEMO, sp_field="customfield_demo_sp"))
        await db.commit()
