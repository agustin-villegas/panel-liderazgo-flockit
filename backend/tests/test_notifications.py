from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.board.models import BoardIssue, Lane
from app.compliance.models import Sprint, SprintResult, State
from app.notifications.detector import Detector, elapsed
from tests.conftest import PWD
from tests.test_projects_api import TM, add_user, new_project

PID = uuid4()
CRON = {"X-Cron-Secret": "c" * 20}


def dt(y: int, m: int, d: int) -> datetime:
    return datetime(y, m, d, 9, tzinfo=UTC)


def closed(sid: str, end: datetime, planned=20.0, burned=18.0) -> SprintResult:
    s = Sprint(sid, f"S{sid}", end - timedelta(days=10), end, end, State.CLOSED)
    return SprintResult(s, planned=planned, burned=burned)


def active(sid="9", start: datetime | None = None) -> SprintResult:
    start = start or dt(2026, 10, 5)
    s = Sprint(sid, "S9", start, dt(2026, 10, 16), None, State.ACTIVE)
    return SprintResult(s, planned=30.0)


def card(key: str, sp: float | None = 3, upd: datetime | None = None, lane=Lane.DOING):
    return BoardIssue(key, "t", "En curso", lane, assignee="Ana", sp=sp, updated=upd)


def det(today: date) -> Detector:
    return Detector(PID, "Portal", today)


def kinds(evs) -> list[str]:
    return [e.kind for e in evs]


# ── días hábiles ──
def test_elapsed_excluye_fin_de_semana():
    assert elapsed(date(2026, 10, 9), date(2026, 10, 12)) == 1  # vie → lun
    assert elapsed(date(2026, 10, 7), date(2026, 10, 12)) == 3  # mié → lun
    assert elapsed(date(2026, 10, 10), date(2026, 10, 10)) == 0


# ── cierre ──
@pytest.mark.parametrize(
    ("burned", "label"), [(18.0, "En margen"), (15.0, "Atención"), (10.0, "En riesgo")]
)
def test_cierre_semaforo(burned, label):
    evs = det(date(2026, 10, 9)).detect([closed("8", dt(2026, 10, 7), 20, burned)], [])
    cierre = next(e for e in evs if e.kind == "cierre")
    assert label in cierre.body and f"{burned:g} SP" in cierre.body
    assert cierre.dedupe_key == f"cierre:{PID}:8"


def test_cierre_ventana_14_dias():
    old = closed("7", dt(2026, 9, 20))  # 19 días
    edge = closed("8", dt(2026, 9, 25))  # 14 días
    evs = det(date(2026, 10, 9)).detect([old, edge], [])
    assert [e.dedupe_key for e in evs if e.kind == "cierre"] == [f"cierre:{PID}:8"]


# ── inicio y sin SP ──
def test_inicio_cuenta_issues_sin_sp():
    cards = [card("A-1", None), card("A-2", None), card("A-3")]
    evs = det(date(2026, 10, 5)).detect([active()], cards)
    ini = next(e for e in evs if e.kind == "inicio")
    assert "2 issues sin SP" in ini.body and "30 SP" in ini.body
    sp = next(e for e in evs if e.kind == "sinsp")
    assert "A-1" in sp.body and "A-2" in sp.body and "A-3" not in sp.body
    assert sp.dedupe_key == f"sinsp:{PID}:9"


def test_sin_sp_se_repite_el_dia_habil_2_con_otra_clave():
    cards = [card("A-1", None)]
    d1 = det(date(2026, 10, 5)).detect([active()], cards)
    d2 = det(date(2026, 10, 6)).detect([active()], cards)
    assert [e.dedupe_key for e in d1 if e.kind == "sinsp"] == [f"sinsp:{PID}:9"]
    assert len([e for e in d2 if e.kind == "sinsp"]) == 2


def test_sin_sp_tope_de_10():
    cards = [card(f"A-{i}", None) for i in range(13)]
    sp = next(e for e in det(date(2026, 10, 5)).detect([active()], cards) if e.kind == "sinsp")
    assert "A-9" in sp.body and "A-10" not in sp.body and "3 más" in sp.body


def test_sin_sp_no_hay_si_todo_estimado():
    evs = det(date(2026, 10, 9)).detect([active()], [card("A-1")])
    assert "sinsp" not in kinds(evs)


# ── sprint sin iniciar ──
def test_sin_iniciar_a_los_2_dias_habiles():
    res = [closed("8", dt(2026, 10, 7))]  # miércoles
    assert "siniciar" not in kinds(det(date(2026, 10, 7)).detect(res, []))
    assert "siniciar" not in kinds(det(date(2026, 10, 8)).detect(res, []))
    evs = det(date(2026, 10, 9)).detect(res, [])
    assert [e.dedupe_key for e in evs if e.kind == "siniciar"] == [f"siniciar:{PID}:8"]


def test_sin_iniciar_cuenta_fin_de_semana_como_no_habil():
    res = [closed("8", dt(2026, 10, 9))]  # viernes
    assert "siniciar" not in kinds(det(date(2026, 10, 11)).detect(res, []))  # domingo
    assert "siniciar" not in kinds(det(date(2026, 10, 12)).detect(res, []))  # 1 hábil
    assert "siniciar" in kinds(det(date(2026, 10, 13)).detect(res, []))  # 2 hábiles


def test_sin_iniciar_no_si_hay_activo():
    res = [closed("8", dt(2026, 10, 2)), active()]
    assert "siniciar" not in kinds(det(date(2026, 10, 9)).detect(res, []))


# ── sin movimiento ──
def test_sin_movimiento_3_si_2_no():
    hoy = date(2026, 10, 9)  # viernes
    tres = card("A-1", upd=dt(2026, 10, 6))  # mar → mié, jue, vie = 3
    dos = card("A-2", upd=dt(2026, 10, 7))  # mié → jue, vie = 2
    evs = det(hoy).detect([active()], [tres, dos])
    mov = [e for e in evs if e.kind == "sinmov"]
    assert [e.dedupe_key for e in mov] == [f"sinmov:{PID}:9:A-1"]
    assert "3 días hábiles" in mov[0].body and "Ana" in mov[0].body


def test_sin_movimiento_ignora_terminadas_y_sin_fecha():
    viejo = dt(2026, 9, 1)
    cards = [card("A-1", upd=viejo, lane=Lane.DONE), card("A-2", upd=None)]
    assert "sinmov" not in kinds(det(date(2026, 10, 9)).detect([active()], cards))


def test_sin_movimiento_fin_de_semana_no_cuenta():
    # actualizada el jueves; el lunes lleva 2 hábiles (vie, lun): no avisa
    c = card("A-1", upd=dt(2026, 10, 8))
    assert "sinmov" not in kinds(det(date(2026, 10, 12)).detect([active()], [c]))
    assert "sinmov" in kinds(det(date(2026, 10, 13)).detect([active()], [c]))


# ── API ──
@pytest.fixture
def admin(client: TestClient, login) -> TestClient:
    login()
    return client


def test_requiere_sesion(client):
    assert client.get("/api/notificaciones").status_code == 401


def test_admin_recibe_y_no_duplica(admin):
    new_project(admin)
    first = admin.get("/api/notificaciones").json()
    got = {n["kind"] for n in first["items"]}
    assert {"inicio", "cierre"} <= got
    assert first["unread"] == len(first["items"]) > 0
    # el cron vuelve a correr todo: no crea nada nuevo
    job = admin.post("/internal/jobs/notificaciones", headers=CRON)
    assert job.status_code == 200
    assert job.json() == {"projects": 1, "created": 0}
    assert len(admin.get("/api/notificaciones").json()["items"]) == len(first["items"])


def test_cierre_con_cumplimiento_del_motor(admin):
    pid = new_project(admin)
    sprint = admin.get(f"/api/proyectos/{pid}/cumplimiento").json()["sprints"]
    last = next(s for s in reversed(sprint) if not s["provisional"])
    items = admin.get("/api/notificaciones").json()["items"]
    bodies = [n["body"] for n in items if n["kind"] == "cierre"]
    assert any(f"{last['pct'] * 100:.0f}%" in b for b in bodies)


def test_tm_solo_ve_sus_proyectos(admin, login):
    tm = add_user(admin, TM)
    new_project(admin, managers=[tm])
    admin.post("/api/auth/logout")
    login(TM, PWD)
    assert len(admin.get("/api/notificaciones").json()["items"]) > 0

    admin.post("/api/auth/logout")
    otro = add_user(admin, "otro@panel.test")
    assert otro
    login("otro@panel.test", PWD)
    res = admin.get("/api/notificaciones").json()
    assert res == {"items": [], "unread": 0}


def test_marcar_leida_y_todas(admin):
    new_project(admin)
    res = admin.get("/api/notificaciones").json()
    nid = res["items"][0]["id"]
    assert admin.post(f"/api/notificaciones/{nid}/leida").status_code == 204
    after = admin.get("/api/notificaciones").json()
    assert after["unread"] == res["unread"] - 1
    assert admin.post("/api/notificaciones/leer-todas").status_code == 204
    assert admin.get("/api/notificaciones").json()["unread"] == 0
    assert admin.post(f"/api/notificaciones/{uuid4()}/leida").status_code == 404


def test_no_marca_avisos_ajenos(admin, login):
    tm = add_user(admin, TM)
    new_project(admin, managers=[tm])
    nid = admin.get("/api/notificaciones").json()["items"][0]["id"]
    admin.post("/api/auth/logout")
    login(TM, PWD)
    assert admin.post(f"/api/notificaciones/{nid}/leida").status_code == 404


def test_cron_exige_secreto(client):
    assert client.post("/internal/jobs/notificaciones").status_code == 401
    bad = client.post("/internal/jobs/notificaciones", headers={"X-Cron-Secret": "x" * 20})
    assert bad.status_code == 401
    assert client.post("/internal/jobs/notificaciones", headers=CRON).status_code == 200
