import asyncio
import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.passwords import get_passwords

ADMIN = "admin@panel.test"
PWD = "Clave-de-prueba-123"

# env mínimo antes de importar la app (Settings se valida al importar)
os.environ.update(
    {
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "SESSION_SECRET": "s" * 40,
        "ENCRYPTION_KEY": "A" * 43 + "=",  # 32 bytes en base64
        "CRON_SECRET": "c" * 20,
        "ADMIN_EMAIL": ADMIN,
        "ADMIN_PASSWORD_HASH": get_passwords().hash(PWD),
    }
)
# los tests nunca usan la key real del .env local: sin red ni costo
os.environ["OPENAI_API_KEY"] = ""

from app.config import Settings  # noqa: E402
from app.db.database import Database  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture
def cfg(tmp_path: Path) -> Settings:
    return Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")  # type: ignore[call-arg]


@pytest.fixture
def client(cfg: Settings) -> Iterator[TestClient]:
    db = Database(cfg.db_url)
    asyncio.run(db.create_all())
    with TestClient(create_app(cfg, db), base_url="https://testserver") as c:
        yield c


@pytest.fixture
def login(client: TestClient):
    def do(email: str = ADMIN, pwd: str = PWD):
        return client.post("/api/auth/login", json={"email": email, "password": pwd})

    return do
