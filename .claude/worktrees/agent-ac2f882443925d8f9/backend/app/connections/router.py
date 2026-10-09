from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.audit.service import AuditService
from app.auth.deps import AdminUser, Db, client_ip
from app.connections.schemas import BoardOut, ConnIn, ConnOut, FieldOut, TestIn, TestOut
from app.connections.service import ConnectionService

router = APIRouter(prefix="/conexiones", tags=["conexiones"])


def get_service(req: Request, db: Db) -> ConnectionService:
    st = req.app.state
    return ConnectionService(db, st.cipher, st.factory, AuditService(db))


Svc = Annotated[ConnectionService, Depends(get_service)]


@router.get("")
async def list_all(_: AdminUser, svc: Svc) -> list[ConnOut]:
    return await svc.all()


@router.post("/probar")
async def test(body: TestIn, _: AdminUser, svc: Svc) -> TestOut:
    return await svc.test(body)


@router.post("", status_code=201)
async def create(body: ConnIn, req: Request, user: AdminUser, svc: Svc) -> ConnOut:
    return await svc.create(body, user.id, client_ip(req))


@router.patch("/{cid}")
async def edit(cid: UUID, body: ConnIn, req: Request, user: AdminUser, svc: Svc) -> ConnOut:
    return await svc.update(cid, body, user.id, client_ip(req))


@router.delete("/{cid}", status_code=204)
async def remove(
    cid: UUID, req: Request, user: AdminUser, svc: Svc, confirm: str = Query(min_length=1)
) -> None:
    await svc.delete(cid, confirm, user.id, client_ip(req))


@router.get("/{cid}/boards")
async def boards(cid: UUID, _: AdminUser, svc: Svc) -> list[BoardOut]:
    return await svc.boards(cid)


@router.get("/{cid}/campos")
async def fields(cid: UUID, _: AdminUser, svc: Svc) -> list[FieldOut]:
    return await svc.fields(cid)
