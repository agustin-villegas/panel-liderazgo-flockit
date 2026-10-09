import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.auth.deps import COOKIE, require_role
from app.auth.models import Role
from app.config import Settings
from tests.conftest import ADMIN, PWD

BAD = "Email o contraseña incorrectos"


def test_login_ok_devuelve_usuario_y_cookie_segura(login):
    res = login()
    assert res.status_code == 200
    assert res.json()["email"] == ADMIN
    assert res.json()["role"] == "admin"
    cookie = res.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "secure" in cookie
    assert "samesite=lax" in cookie


def test_me_con_sesion(client, login):
    login()
    assert client.get("/api/auth/me").json()["email"] == ADMIN


def test_me_sin_sesion_es_401(client: TestClient):
    assert client.get("/api/auth/me").status_code == 401


@pytest.mark.parametrize(("email", "pwd"), [(ADMIN, "mala"), ("nadie@panel.test", PWD)])
def test_credenciales_malas_mismo_mensaje(login, email, pwd):
    res = login(email, pwd)
    assert res.status_code == 401
    assert res.json()["message"] == BAD


def test_email_sin_distinguir_mayusculas(login):
    assert login(ADMIN.upper()).status_code == 200


def test_sexto_intento_bloqueado_aunque_la_clave_sea_buena(login):
    for _ in range(5):
        assert login(ADMIN, "mala").status_code == 401
    res = login()
    assert res.status_code == 429
    assert int(res.headers["retry-after"]) > 0


def test_login_ok_resetea_el_contador(login):
    for _ in range(4):
        login(ADMIN, "mala")
    assert login().status_code == 200
    assert login(ADMIN, "mala").status_code == 401  # no bloqueado


def test_logout_revoca_la_sesion_en_el_servidor(client, login):
    login()
    token = client.cookies.get(COOKIE)
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.set(COOKIE, token)  # reusar la cookie vieja
    assert client.get("/api/auth/me").status_code == 401


def test_headers_de_seguridad(client):
    res = client.get("/api/health")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'none'" in res.headers["content-security-policy"]


def test_require_role_403(client, login):
    only_client = Depends(require_role(Role.CLIENT))

    @client.app.get("/api/solo-clientes", dependencies=[only_client])
    async def solo() -> dict:
        return {}

    login()
    assert client.get("/api/solo-clientes").status_code == 403


def test_config_sin_hash_de_admin_no_arranca(monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD_HASH")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)  # type: ignore[call-arg]


def test_config_rechaza_password_en_texto_plano(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "mi-clave")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)  # type: ignore[call-arg]
