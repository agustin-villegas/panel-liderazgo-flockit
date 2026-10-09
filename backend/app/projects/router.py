from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.audit.service import AuditService
from app.auth.deps import AdminUser, CurrentUser, Db, client_ip
from app.board.schemas import SprintBoardOut
from app.board.service import BoardService
from app.compliance.schemas import CardOut, ComplianceOut, DetailOut
from app.compliance.service import ComplianceService, JiraReadError
from app.connections.models import Connection
from app.projects.models import Account, Project
from app.projects.schemas import AccountIn, AccountOut, ProjectIn, ProjectOut
from app.projects.service import ProjectService

router = APIRouter(tags=["proyectos"])


def get_projects(db: Db) -> ProjectService:
    return ProjectService(db, AuditService(db))


def get_compliance(req: Request) -> ComplianceService:
    return ComplianceService(req.app.state.factory, req.app.state.cache)


Projects = Annotated[ProjectService, Depends(get_projects)]
Compliance = Annotated[ComplianceService, Depends(get_compliance)]


# ── cuentas ──
@router.get("/cuentas")
async def accounts(_: CurrentUser, svc: Projects) -> list[AccountOut]:
    return await svc.accounts()


@router.post("/cuentas", status_code=201)
async def add_account(body: AccountIn, req: Request, user: AdminUser, svc: Projects) -> AccountOut:
    return await svc.add_account(body, user.id, client_ip(req))


# ── proyectos ──
@router.get("/proyectos")
async def projects(user: CurrentUser, svc: Projects) -> list[ProjectOut]:
    return await svc.all(user)


@router.post("/proyectos", status_code=201)
async def create(body: ProjectIn, req: Request, user: AdminUser, svc: Projects) -> ProjectOut:
    return await svc.create(body, user.id, client_ip(req))


@router.patch("/proyectos/{pid}")
async def edit(
    pid: UUID, body: ProjectIn, req: Request, user: AdminUser, svc: Projects
) -> ProjectOut:
    return await svc.update(pid, body, user, client_ip(req))


@router.delete("/proyectos/{pid}", status_code=204)
async def archive(pid: UUID, req: Request, user: AdminUser, svc: Projects) -> None:
    await svc.archive(pid, user, client_ip(req))


# ── cumplimiento ──
@router.get("/cartera")
async def portfolio(user: CurrentUser, db: Db, svc: Projects, comp: Compliance) -> list[CardOut]:
    """Una card por proyecto visible, ordenadas por riesgo."""
    projs = await svc.visible(user)

    async def one(p: Project) -> CardOut:
        acc = await db.get(Account, p.account_id)
        conn = await db.get(Connection, p.conn_id) if p.conn_id else None
        name = acc.name if acc else ""
        try:
            return comp.card(p, name, await comp.snapshot(p, conn))
        except JiraReadError as e:
            return CardOut(
                id=p.id, name=p.name, account=name, light="none",
                last=None, active=None, trend=[], month=None, error=e.msg,
            )  # fmt: skip

    cards = [await one(p) for p in projs]  # una sesión de base: secuencial
    order = {"crit": 0, "warn": 1, "ok": 2, "none": 3}
    return sorted(cards, key=lambda c: (order[c.light], c.name))


async def _load(pid: UUID, user, db, svc: ProjectService, comp: ComplianceService, fresh=False):
    proj = await svc.get(pid, user)
    conn = await db.get(Connection, proj.conn_id) if proj.conn_id else None
    return await comp.snapshot(proj, conn, fresh=fresh)


@router.get("/proyectos/{pid}/cumplimiento")
async def compliance(
    pid: UUID, user: CurrentUser, db: Db, svc: Projects, comp: Compliance
) -> ComplianceOut:
    snap = await _load(pid, user, db, svc, comp)
    return ComplianceOut(
        project_id=pid,
        sprints=[comp.sprint_out(r) for r in snap.results],
        months=[comp.month_out(m) for m in snap.months],
    )


@router.get("/proyectos/{pid}/sprints/{sid}")
async def sprint_detail(
    pid: UUID, sid: str, user: CurrentUser, db: Db, svc: Projects, comp: Compliance
) -> DetailOut:
    return comp.detail(await _load(pid, user, db, svc, comp), sid)


@router.post("/proyectos/{pid}/recalcular", status_code=204)
async def refresh(pid: UUID, user: CurrentUser, db: Db, svc: Projects, comp: Compliance) -> None:
    await _load(pid, user, db, svc, comp, fresh=True)


@router.get("/proyectos/{pid}/tablero")
async def board(
    pid: UUID, req: Request, user: CurrentUser, db: Db, svc: Projects
) -> SprintBoardOut:
    """Tablero de Jira del sprint activo (solo lectura)."""
    proj = await svc.get(pid, user)
    conn = await db.get(Connection, proj.conn_id) if proj.conn_id else None
    return await BoardService(req.app.state.factory, req.app.state.boards).board(proj, conn)
