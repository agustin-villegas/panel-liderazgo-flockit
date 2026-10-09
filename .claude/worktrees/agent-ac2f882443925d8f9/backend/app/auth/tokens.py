import hashlib
import secrets


def new_token() -> str:
    return secrets.token_urlsafe(32)


def digest(token: str) -> str:
    # en la base solo vive el hash; el token crudo queda en la cookie
    return hashlib.sha256(token.encode()).hexdigest()
