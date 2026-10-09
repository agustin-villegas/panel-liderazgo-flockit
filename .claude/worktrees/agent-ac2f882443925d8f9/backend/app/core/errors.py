from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Error de negocio con código HTTP y mensaje para el usuario."""

    status = 500
    code = "ERROR"

    def __init__(self, msg: str) -> None:
        super().__init__(msg)
        self.msg = msg


class AuthError(AppError):
    status = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status = 404
    code = "NOT_FOUND"


class RateLimitError(AppError):
    status = 429
    code = "TOO_MANY_ATTEMPTS"

    def __init__(self, retry_after: int) -> None:
        mins = max(retry_after // 60, 1)
        super().__init__(f"Demasiados intentos. Probá de nuevo en {mins} min.")
        self.retry_after = retry_after


async def app_error_handler(_: Request, err: Exception) -> JSONResponse:
    """Convierte AppError en JSON; nunca expone detalles internos."""
    assert isinstance(err, AppError)  # noqa: S101
    headers = {"Retry-After": str(err.retry_after)} if isinstance(err, RateLimitError) else None
    return JSONResponse(
        {"error": err.code, "message": err.msg}, status_code=err.status, headers=headers
    )
