"""Genera el hash argon2id para ADMIN_PASSWORD_HASH.

Uso: uv run python scripts/generar_hash.py
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth.passwords import Passwords

MIN_LEN = 12


def main() -> int:
    pwd = getpass.getpass("Contraseña del admin: ")
    if len(pwd) < MIN_LEN:
        sys.stderr.write(f"Mínimo {MIN_LEN} caracteres.\n")
        return 1
    if pwd != getpass.getpass("Repetila: "):
        sys.stderr.write("No coinciden.\n")
        return 1
    sys.stdout.write("\nPegá esta línea en backend/.env:\n\n")
    sys.stdout.write(f"ADMIN_PASSWORD_HASH='{Passwords().hash(pwd)}'\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
