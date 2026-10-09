import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth.models import Role, User
from app.auth.passwords import get_passwords
from app.connections.models import Connection
from app.jira.source import Field
from tests.conftest import PWD

TM = "tm@panel.test"


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def admin(client: TestClient, login) -> TestClient:
    login()
    return client


def add_user(client: TestClient, email: str, role: Role = Role.MANAGER) -> str:
    async def go():
        async with client.app.state.db.maker() as db:
            u = User(email=email, name="TM", role=role, pwd_hash=get_passwords().hash(PWD))
            db.add(u)
            await db.commit()
            return str(u.id)

    return run(go())


def demo_id(c: TestClient) -> str:
    return next(x["id"] for x in c.get("/api/conexiones").json() if x["kind"] == "demo")


def new_project(c: TestClient, managers: list[str] | None = None) -> str:
    acc = c.post("/api/cuentas", json={"name": "Banco Austral"}).json()["id"]
    conn = demo_id(c)
    board = c.get(f"/api/conexiones/{conn}/boards").json()[0]
    body = {
        "name": "Portal Clientes",
        "account_id": acc,
        "conn_id": conn,
        "board_id": board["id"],
        "board_name": board["name"],
        "managers": managers or [],
    }
    res = c.post("/api/proyectos", json=body)
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_demo_existe_y_lista_boards(admin):
    conn = demo_id(admin)
    assert len(admin.get(f"/api/conexiones/{conn}/boards").json()) == 4


def test_cartera_y_cumplimiento_con_demo(admin):
    pid = new_project(admin)
    cards = admin.get("/api/cartera").json()
    assert cards[0]["id"] == pid
    assert cards[0]["light"] in {"ok", "warn", "crit"}
    assert len(cards[0]["trend"]) == 6

    data = admin.get(f"/api/proyectos/{pid}/cumplimiento").json()
    closed = [s for s in data["sprints"] if not s["provisional"]]
    assert len(closed) == 8
    assert data["months"]


def test_detalle_auditable_suma_igual_al_sprint(admin):
    pid = new_project(admin)
    sprint = admin.get(f"/api/proyectos/{pid}/cumplimiento").json()["sprints"][-2]
    det = admin.get(f"/api/proyectos/{pid}/sprints/{sprint['id']}").json()
    assert sum(ln["sp"] or 0 for ln in det["lines"]) == sprint["planned"]
    assert sum(ln["sp"] or 0 for ln in det["lines"] if ln["burned"]) == sprint["burned"]


def test_team_manager_solo_ve_lo_suyo(admin: TestClient, login):
    uid = add_user(admin, TM)
    mine = new_project(admin, managers=[uid])
    other = admin.post(
        "/api/proyectos",
        json={**_body_from(admin, mine), "name": "Ajeno", "managers": []},
    ).json()["id"]

    admin.post("/api/auth/logout")
    login(TM, PWD)
    assert [p["id"] for p in admin.get("/api/proyectos").json()] == [mine]
    assert admin.get(f"/api/proyectos/{other}/cumplimiento").status_code == 403
    assert admin.get("/api/conexiones").status_code == 403


def _body_from(c: TestClient, pid: str) -> dict:
    p = next(x for x in c.get("/api/proyectos").json() if x["id"] == pid)
    return {k: p[k] for k in ("account_id", "conn_id", "board_id", "board_name")}


def test_conexion_rechaza_site_que_no_es_atlassian(admin):
    res = admin.post(
        "/api/conexiones",
        json={"name": "X", "site": "https://evil.com", "email": "a@b.c", "token": "t"},
    )
    assert res.status_code == 422


class FakeJira:
    async def me(self) -> str:
        return "Ana Jira"

    async def sp_fields(self) -> list[Field]:
        return [Field("customfield_10016", "Story Points")]


def test_conexion_guarda_token_cifrado_y_nunca_lo_devuelve(admin, monkeypatch):
    monkeypatch.setattr(admin.app.state.factory, "raw", lambda *a: FakeJira())
    token = "ATATT-secreto-1234"
    body = {
        "name": "Jira test",
        "site": "https://acme.atlassian.net",
        "email": "a@b.c",
        "token": token,
    }
    res = admin.post("/api/conexiones", json=body)
    assert res.status_code == 201, res.text
    assert token not in res.text
    assert res.json()["token_last4"] == "1234"
    assert res.json()["sp_field"] == "customfield_10016"
    assert token not in admin.get("/api/conexiones").text

    async def stored():
        async with admin.app.state.db.maker() as db:
            return await db.scalar(
                select(Connection.token_enc).where(Connection.name == "Jira test")
            )

    enc = run(stored())
    assert enc and token not in enc
    assert admin.app.state.cipher.open(enc) == token


def test_conexion_que_falla_la_prueba_no_se_guarda(admin, monkeypatch):
    class Broken(FakeJira):
        async def me(self) -> str:
            from app.jira.source import JiraError

            raise JiraError("Credenciales inválidas: revisá el email y el API token")

    monkeypatch.setattr(admin.app.state.factory, "raw", lambda *a: Broken())
    body = {"name": "Mala", "site": "https://acme.atlassian.net", "email": "a@b.c", "token": "x"}
    res = admin.post("/api/conexiones", json=body)
    assert res.status_code == 422
    assert "Credenciales inválidas" in res.json()["message"]
    assert all(c["name"] != "Mala" for c in admin.get("/api/conexiones").json())


def test_sin_sesion_401(client):
    assert client.get("/api/cartera").status_code == 401


def test_tablero_demo_cuadra_y_respeta_permisos(admin: TestClient, login):
    pid = new_project(admin)
    b = admin.get(f"/api/proyectos/{pid}/tablero").json()
    c = b["counts"]
    assert b["sprint"]["state"] == "active"
    assert 1 <= b["sprint"]["day"] <= b["sprint"]["days"] <= 10
    assert c["total"] == len(b["cards"]) == c["todo"] + c["doing"] + c["blocked"] + c["done"]
    assert c["blocked"] > 0
    assert all(x["lane"] == "blocked" for x in b["cards"] if x["status"] == "Bloqueado")

    add_user(admin, TM)
    admin.post("/api/auth/logout")
    login(TM, PWD)
    assert admin.get(f"/api/proyectos/{pid}/tablero").status_code == 403
