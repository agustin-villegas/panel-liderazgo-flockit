from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError


class Passwords:
    """Hash y verificación con argon2id."""

    def __init__(self) -> None:
        self._ph = PasswordHasher()
        # hash descartable: iguala tiempos cuando el usuario no existe
        self._dummy = self._ph.hash("no-user")

    def hash(self, pwd: str) -> str:
        """Devuelve el hash argon2id de la contraseña."""
        return self._ph.hash(pwd)

    def verify(self, hashed: str | None, pwd: str) -> bool:
        """True si la contraseña coincide. Sin hash, gasta el mismo tiempo y da False."""
        try:
            self._ph.verify(hashed or self._dummy, pwd)
        except (VerificationError, InvalidHashError):
            return False
        return hashed is not None


@lru_cache
def get_passwords() -> Passwords:
    return Passwords()
