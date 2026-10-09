import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth.models import User
from tests.conftest import ADMIN, PWD
from tests.test_projects_api import TM, add_user, run

NEW = {
    "first_name": " Ana ",
    "last_name": "Pérez",
    "email": " Ana.Perez@Panel.Test ",
    "role": "team_manager",
    "password": "otra-clave-larga-1",
    "password_confirm": "otra-clave-larga-1",
}
EMAIL = "ana.perez@panel.test"


@pytest.fixture
def admin(client: TestClient, login) -> TestClient:
    login()
    return client


def test_sin_sesion_401(client):
    assert client.get("/api/usuarios").status_code == 401
    assert client.post("/api/usuarios", json=NEW).status_code == 401


def test_no_admin_403(client, login):
    add_user(client, TM)
    login(TM, PWD)
    assert client.get("/api/usuarios").status_code == 403
    assert client.post("/api/usuarios", json=NEW).status_code == 403


def test_alta_ok_y_puede_loguearse(admin, login):
    res = admin.post("/api/usuarios", json=NEW)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "Ana Pérez"
    assert body["email"] == EMAIL
    assert body["role"] == "team_manager"
    assert body["active"] is True
    assert "pwd_hash" not in body and "password" not in body
    admin.post("/api/auth/logout")
    assert login(EMAIL, NEW["password"]).status_code == 200


def test_alta_guarda_hash_argon2(admin):
    admin.post("/api/usuarios", json=NEW)

    async def go():
        async with admin.app.state.db.maker() as db:
            return await db.scalar(select(User.pwd_hash).where(User.email == EMAIL))

    h = run(go())
    assert h.startswith("$argon2id$") and NEW["password"] not in h


def test_contrasenas_distintas_422(admin):
    body = {**NEW, "password_confirm": "x" * 14}
    assert admin.post("/api/usuarios", json=body).status_code == 422


def test_contrasena_corta_422(admin):
    body = {**NEW, "password": "corta-123", "password_confirm": "corta-123"}
    assert admin.post("/api/usuarios", json=body).status_code == 422


def test_email_rol_o_nombre_invalidos_422(admin):
    assert admin.post("/api/usuarios", json={**NEW, "email": "no-es-email"}).status_code == 422
    assert admin.post("/api/usuarios", json={**NEW, "role": "root"}).status_code == 422
    assert admin.post("/api/usuarios", json={**NEW, "first_name": "  "}).status_code == 422


def test_email_duplicado_409_sin_importar_mayusculas(admin):
    assert admin.post("/api/usuarios", json=NEW).status_code == 201
    dup = admin.post("/api/usuarios", json={**NEW, "email": "ANA.PEREZ@panel.test"})
    assert dup.status_code == 409
    assert admin.post("/api/usuarios", json={**NEW, "email": ADMIN.upper()}).status_code == 409


def test_lista_solo_admin_y_sin_hash(admin):
    admin.post("/api/usuarios", json=NEW)
    rows = admin.get("/api/usuarios").json()
    assert {r["email"] for r in rows} >= {ADMIN, EMAIL}
    assert all("pwd_hash" not in r for r in rows)


# ── edición y habilitación ──
def make(admin: TestClient, **kw) -> dict:
    res = admin.post("/api/usuarios", json={**NEW, **kw})
    assert res.status_code == 201, res.text
    return res.json()


def me_id(c: TestClient) -> str:
    return c.get("/api/auth/me").json()["id"]


def test_editar_ok(admin):
    u = make(admin)
    body = {k: NEW[k] for k in ("first_name", "last_name", "email", "role")}
    body.update(first_name="Ana María", role="cliente", email="NUEVA@panel.test")
    res = admin.patch(f"/api/usuarios/{u['id']}", json=body)
    assert res.status_code == 200, res.text
    out = res.json()
    assert out["name"] == "Ana María Pérez"
    assert out["email"] == "nueva@panel.test" and out["role"] == "cliente"


def test_editar_email_duplicado_409(admin):
    u = make(admin)
    body = {k: NEW[k] for k in ("first_name", "last_name", "role")} | {"email": ADMIN}
    assert admin.patch(f"/api/usuarios/{u['id']}", json=body).status_code == 409


def test_editar_inexistente_404(admin):
    body = {k: NEW[k] for k in ("first_name", "last_name", "email", "role")}
    res = admin.patch("/api/usuarios/00000000-0000-0000-0000-000000000000", json=body)
    assert res.status_code == 404


def test_editar_password_corta_sesiones(admin, client, login):
    u = make(admin)
    admin.post("/api/auth/logout")
    assert login(EMAIL, NEW["password"]).status_code == 200  # sesión vieja del usuario
    old = client.cookies.get("panel_session")
    client.cookies.clear()
    login()
    body = {k: NEW[k] for k in ("first_name", "last_name", "email", "role")}
    new = "clave-nueva-larga-9"
    bad = admin.patch(f"/api/usuarios/{u['id']}", json={**body, "password": new})
    assert bad.status_code == 422  # sin confirmación
    ok = admin.patch(
        f"/api/usuarios/{u['id']}", json={**body, "password": new, "password_confirm": new}
    )
    assert ok.status_code == 200, ok.text
    client.cookies.clear()
    client.cookies.set("panel_session", old)
    assert client.get("/api/auth/me").status_code == 401
    assert login(EMAIL, new).status_code == 200


def test_deshabilitar_corta_acceso_y_tokens(admin, client, login):
    from sqlalchemy import select

    from app.ai.models import McpToken

    u = make(admin)
    client.cookies.clear()
    assert login(EMAIL, NEW["password"]).status_code == 200
    old = client.cookies.get("panel_session")
    tok = client.post("/api/perfil/tokens-mcp", json={"name": "t"})
    client.cookies.clear()
    login()
    assert admin.post(f"/api/usuarios/{u['id']}/deshabilitar").json()["active"] is False
    client.cookies.clear()
    client.cookies.set("panel_session", old)
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()
    assert login(EMAIL, NEW["password"]).status_code == 401

    async def go():
        async with client.app.state.db.maker() as db:
            return list(await db.scalars(select(McpToken.revoked_at)))

    assert tok.status_code == 201, tok.text
    assert all(r is not None for r in run(go()))
    assert login(ADMIN, PWD).status_code == 200
    assert client.post(f"/api/usuarios/{u['id']}/habilitar").json()["active"] is True
    client.cookies.clear()
    assert login(EMAIL, NEW["password"]).status_code == 200


def test_admin_no_se_deshabilita_ni_se_degrada(admin):
    mid = me_id(admin)
    assert admin.post(f"/api/usuarios/{mid}/deshabilitar").status_code == 409
    body = {"first_name": "A", "last_name": "B", "email": ADMIN, "role": "team_manager"}
    assert admin.patch(f"/api/usuarios/{mid}", json=body).status_code == 409


def test_no_admin_403_en_edicion(client, login):
    uid = add_user(client, TM)
    login(TM, PWD)
    body = {k: NEW[k] for k in ("first_name", "last_name", "email", "role")}
    assert client.patch(f"/api/usuarios/{uid}", json=body).status_code == 403
    assert client.post(f"/api/usuarios/{uid}/deshabilitar").status_code == 403
    assert client.post(f"/api/usuarios/{uid}/habilitar").status_code == 403
