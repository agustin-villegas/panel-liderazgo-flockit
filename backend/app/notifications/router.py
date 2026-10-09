import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select

from app.audit.service import AuditService
from app.auth.deps import Cfg, CurrentUser, Db
from app.compliance.service import ComplianceService
from app.core.errors import AuthError
from app.notifications.schemas import JobOut, NotificationOut, NotificationsOut
from app.notifications.service import NotificationService
from app.projects.models import Project
from app.projects.service import ProjectService

router = APIRouter(tags=["notificaciones"])
internal = APIRouter(prefix="/internal", tags=["interno"], include_in_schema=False)


def get_notifs(req: Request, db: Db) -> NotificationService:
    st = req.app.state
    return NotificationService(
        db, ComplianceService(st.factory, st.cache), st.factory, st.notif_runs
    )


Notifs = Annotated[NotificationService, Depends(get_notifs)]


@router.get("/notificaciones")
async def mine(user: CurrentUser, db: Db, svc: Notifs) -> NotificationsOut:
    """Avisos del usuario; antes revisa sus proyectos si la última corrida fue hace >15 min."""
    projs = await ProjectService(db, AuditService(db)).visible(user)
    await svc.run(projs)
    rows, unread = await svc.mine(user)
    return NotificationsOut(items=[NotificationOut.model_validate(n) for n in rows], unread=unread)


@router.post("/notificaciones/leer-todas", status_code=204)
async def read_all(user: CurrentUser, svc: Notifs) -> None:
    await svc.mark_all(user)


@router.post("/notificaciones/{nid}/leida", status_code=204)
async def read_one(nid: UUID, user: CurrentUser, svc: Notifs) -> None:
    await svc.mark(nid, user)


@internal.post("/jobs/notificaciones")
async def job(
    cfg: Cfg, db: Db, svc: Notifs, x_cron_secret: Annotated[str | None, Header()] = None
) -> JobOut:
    """Cron: detección para todos los proyectos activos."""
    if not x_cron_secret or not secrets.compare_digest(x_cron_secret, cfg.cron_secret):
        raise AuthError("Secreto de cron inválido")
    projs = list(await db.scalars(select(Project).where(Project.archived_at.is_(None))))
    return JobOut(projects=len(projs), created=await svc.run(projs, force=True))
