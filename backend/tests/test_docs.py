import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.models import Role, User
from app.auth.passwords import get_passwords
from app.config import Settings
from app.db.database import Database
from app.main import create_app
from tests.conftest import PWD


def make_client(tmp_path: Path, env: str) -> TestClient:
    cfg = Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 'd.db'}", env=env)  # type: ignore[call-arg]
    db = Database(cfg.db_url)
    asyncio.run(db.create_all())
    return TestClient(create_app(cfg, db), base_url="https://testserver")


@pytest.fixture
def prod(tmp_path: Path):
    with make_client(tmp_path, "prod") as c:
        yield c


def add_manager(c: TestClient) -> None:
    async def go() -> None:
        async with c.app.state.db.maker() as db:  # type: ignore[attr-defined]
            db.add(
                User(
                    email="tm@panel.test",
                    name="TM",
                    role=Role.MANAGER,
                    pwd_hash=get_passwords().hash(PWD),
                )
            )
            await db.commit()

    asyncio.run(go())


PATHS = ["/api/docs", "/api/openapi.json"]


@pytest.mark.parametrize("path", PATHS)
def test_prod_sin_sesion(prod: TestClient, path: str) -> None:
    assert prod.get(path).status_code == 401


def test_prod_rutas_por_defecto_apagadas(prod: TestClient) -> None:
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert prod.get(path).status_code == 404


@pytest.mark.parametrize("path", PATHS)
def test_prod_admin(prod: TestClient, path: str) -> None:
    prod.post("/api/auth/login", json={"email": "admin@panel.test", "password": PWD})
    res = prod.get(path)
    assert res.status_code == 200


def test_prod_admin_openapi_sin_rutas_de_docs(prod: TestClient) -> None:
    prod.post("/api/auth/login", json={"email": "admin@panel.test", "password": PWD})
    paths = prod.get("/api/openapi.json").json()["paths"]
    assert "/api/docs" not in paths and "/api/openapi.json" not in paths


def test_prod_admin_csp_permite_swagger(prod: TestClient) -> None:
    prod.post("/api/auth/login", json={"email": "admin@panel.test", "password": PWD})
    csp = prod.get("/api/docs").headers["content-security-policy"]
    assert "cdn.jsdelivr.net" in csp


@pytest.mark.parametrize("path", PATHS)
def test_prod_no_admin(prod: TestClient, path: str) -> None:
    add_manager(prod)
    prod.post("/api/auth/login", json={"email": "tm@panel.test", "password": PWD})
    assert prod.get(path).status_code == 403


@pytest.mark.parametrize("path", PATHS)
def test_dev_libre(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 200


def test_dev_alias_docs(client: TestClient) -> None:
    res = client.get("/docs", follow_redirects=False)
    assert res.status_code in (302, 307)
    assert res.headers["location"] == "/api/docs"
