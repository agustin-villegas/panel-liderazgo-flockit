from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.ai.narrative import Narrator
from app.audit.service import AuditService
from app.auth.deps import Cfg, CurrentUser, Db, client_ip
from app.compliance.service import ComplianceService
from app.projects.service import ProjectService
from app.reports.schemas import PreviewOut, ReportIn, ReportOut, ReportRow, SaveIn
from app.reports.service import ReportService

router = APIRouter(prefix="/informes", tags=["informes"])


def get_writer(req: Request, cfg: Cfg) -> Narrator:
    # en tests se inyecta un writer falso en app.state.writer
    return getattr(req.app.state, "writer", None) or Narrator(cfg.openai_api_key, cfg.model)


def get_service(req: Request, db: Db, writer: Annotated[Narrator, Depends(get_writer)]):
    audit = AuditService(db)
    comp = ComplianceService(req.app.state.factory, req.app.state.cache)
    return ReportService(db, ProjectService(db, audit), comp, writer, audit)


Svc = Annotated[ReportService, Depends(get_service)]


@router.post("/preview")
async def preview(body: ReportIn, user: CurrentUser, svc: Svc) -> PreviewOut:
    return await svc.preview(body, user)


@router.post("", status_code=201)
async def save(body: SaveIn, req: Request, user: CurrentUser, svc: Svc) -> ReportOut:
    return await svc.save(body, user, client_ip(req))


@router.get("")
async def list_all(user: CurrentUser, svc: Svc) -> list[ReportRow]:
    return await svc.all(user)


@router.get("/{rid}")
async def get(rid: UUID, user: CurrentUser, svc: Svc) -> ReportOut:
    return await svc.get(rid, user)
