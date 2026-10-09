from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.audit.service import AuditService
from app.auth.deps import AdminUser, Db, client_ip, get_sessions
from app.auth.passwords import get_passwords
from app.auth.sessions import SessionService
from app.users.schemas import UserIn, UserOut, UserPatch
from app.users.service import UserService

router = APIRouter(tags=["usuarios"])


def get_users(db: Db, sessions: Annotated[SessionService, Depends(get_sessions)]) -> UserService:
    return UserService(db, get_passwords(), sessions, AuditService(db))


Users = Annotated[UserService, Depends(get_users)]


@router.get("/usuarios")
async def users(_: AdminUser, svc: Users) -> list[UserOut]:
    return await svc.all()


@router.post("/usuarios", status_code=201)
async def add(body: UserIn, req: Request, user: AdminUser, svc: Users) -> UserOut:
    return await svc.create(body, user.id, client_ip(req))


@router.patch("/usuarios/{uid}")
async def edit(uid: UUID, body: UserPatch, req: Request, user: AdminUser, svc: Users) -> UserOut:
    return await svc.update(uid, body, user, client_ip(req))


@router.post("/usuarios/{uid}/deshabilitar")
async def disable(uid: UUID, req: Request, user: AdminUser, svc: Users) -> UserOut:
    return await svc.disable(uid, user, client_ip(req))


@router.post("/usuarios/{uid}/habilitar")
async def enable(uid: UUID, req: Request, user: AdminUser, svc: Users) -> UserOut:
    return await svc.enable(uid, user, client_ip(req))
