from fastapi import APIRouter, Depends, FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, RedirectResponse

from app.auth.deps import require_role
from app.auth.models import Role
from app.config import Settings

# Swagger UI carga JS/CSS de jsdelivr y usa un script inline
DOCS_CSP = (
    "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
    "connect-src 'self'; frame-ancestors 'none'"
)


def docs_router(app: FastAPI, cfg: Settings) -> APIRouter:
    """Swagger en /api/docs: libre en dev, solo admins logueados en el resto."""
    dev = cfg.env == "dev"
    deps = [] if dev else [Depends(require_role(Role.ADMIN))]
    router = APIRouter(dependencies=deps, include_in_schema=False)

    @router.get("/api/openapi.json")
    async def openapi() -> dict:
        return app.openapi()

    @router.get("/api/docs")
    async def docs() -> HTMLResponse:
        page = get_swagger_ui_html(openapi_url="/api/openapi.json", title=f"{cfg.app_name} - API")
        page.headers["Content-Security-Policy"] = DOCS_CSP
        return page

    if dev:

        @router.get("/docs")
        async def docs_alias() -> RedirectResponse:
            return RedirectResponse("/api/docs")

    return router
