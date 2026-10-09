from collections.abc import Awaitable, Callable

from fastapi import Request, Response

HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


async def security_headers(
    req: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Agrega headers de seguridad a toda respuesta de la API."""
    res = await call_next(req)
    for key, val in HEADERS.items():
        res.headers.setdefault(key, val)
    return res
