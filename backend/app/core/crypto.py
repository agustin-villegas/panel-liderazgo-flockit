import base64
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PREFIX = "v1:"


class Cipher:
    """AES-256-GCM para secretos guardados en base (tokens de Jira)."""

    def __init__(self, key_b64: str) -> None:
        key = base64.b64decode(key_b64)
        if len(key) != 32:
            raise ValueError("ENCRYPTION_KEY debe ser 32 bytes en base64")
        self._aes = AESGCM(key)

    def seal(self, plain: str) -> str:
        """Cifra con nonce aleatorio. Formato: v1:<base64(nonce+ct)>."""
        nonce = secrets.token_bytes(12)
        ct = self._aes.encrypt(nonce, plain.encode(), None)
        return PREFIX + base64.b64encode(nonce + ct).decode()

    def open(self, sealed: str) -> str:
        """Descifra.

        Raises:
            ValueError: Si el dato está corrupto o la clave no corresponde.
        """
        if not sealed.startswith(PREFIX):
            raise ValueError("Formato de secreto desconocido")
        raw = base64.b64decode(sealed[len(PREFIX) :])
        try:
            return self._aes.decrypt(raw[:12], raw[12:], None).decode()
        except InvalidTag as e:
            raise ValueError("No se pudo descifrar el secreto") from e
