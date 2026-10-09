from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.auth.deps import COOKIE, Cfg, CurrentUser, client_ip, get_auth
from app.auth.schemas import LoginIn, Me
from app.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
Auth = Annotated[AuthService, Depends(get_auth)]


@router.post("/login")
async def login(body: LoginIn, req: Request, res: Response, auth: Auth, cfg: Cfg) -> Me:
    user, token = await auth.login(
        body.email, body.password, client_ip(req), req.headers.get("user-agent")
    )
    res.set_cookie(
        COOKIE,
        token,
        max_age=cfg.session_hours * 3600,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return Me.model_validate(user)


@router.post("/logout", status_code=204)
async def logout(req: Request, res: Response, user: CurrentUser, auth: Auth) -> None:
    token = req.cookies.get(COOKIE, "")
    await auth.logout(token, user, client_ip(req))
    res.delete_cookie(COOKIE, path="/", secure=True, httponly=True, samesite="lax")


@router.get("/me")
async def me(user: CurrentUser) -> Me:
    return Me.model_validate(user)
