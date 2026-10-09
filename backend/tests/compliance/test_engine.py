"""Casos obligatorios T1–T12 de docs/sdd/spec.md §7.4."""

from datetime import UTC, datetime

import pytest

from app.compliance.engine import Engine
from app.compliance.models import Issue, Reason, Sprint, SprintResult, State


def dt(day: str) -> datetime:
    return datetime.fromisoformat(day).replace(tzinfo=UTC)


def sprint(sid: str, start: str, end: str, state: State = State.CLOSED) -> Sprint:
    return Sprint(
        sid, f"Sprint {sid}", dt(start), dt(end), dt(end) if state == State.CLOSED else None, state
    )


def issue(key: str, sp: float | None, *sprints: str, done_at: str | None = None, **kw) -> Issue:
    done = kw.pop("done", done_at is not None)
    return Issue(key, sp, done, sprints, dt(done_at) if done_at else None, **kw)


S1 = sprint("1", "2026-09-01", "2026-09-12")
S2 = sprint("2", "2026-09-15", "2026-09-26")
ALL = [S1, S2]


def run(issues: list[Issue], sprints: list[Sprint] = ALL) -> dict[str, SprintResult]:
    return {r.sprint.id: r for r in Engine().project(sprints, issues)}


def test_t1_sprint_simple():
    res = run(
        [
            issue("A", 5, "1", done_at="2026-09-05"),
            issue("B", 3, "1", done_at="2026-09-10"),
            issue("C", 2, "1"),
        ]
    )["1"]
    assert (res.planned, res.burned) == (10, 8)
    assert res.pct == pytest.approx(0.8)


def test_t2_issue_en_dos_sprints_quema_solo_donde_se_termino():
    res = run([issue("A", 8, "1", "2", done_at="2026-09-20")])
    assert (res["1"].planned, res["1"].burned) == (8, 0)
    assert (res["2"].planned, res["2"].burned) == (8, 8)


def test_t3_reabierta_quema_en_la_ultima_finalizacion():
    # done_at ya es la última entrada a Done (ver changelog); se terminó de nuevo en S2
    res = run([issue("A", 5, "1", "2", done_at="2026-09-22")])
    assert res["1"].burned == 0
    assert res["2"].burned == 5


def test_t4_terminada_despues_del_ultimo_sprint_quema_en_el_ultimo():
    res = run([issue("A", 3, "1", done_at="2026-09-16")], [S1])
    line = res["1"].lines[0]
    assert res["1"].burned == 3
    assert line.reason == Reason.AFTER_LAST


def test_t5_terminada_entre_sprints_quema_en_el_siguiente():
    res = run([issue("A", 3, "1", "2", done_at="2026-09-13")])
    assert res["1"].burned == 0
    assert res["2"].burned == 3


def test_t6_sin_estimar_suma_cero_y_se_avisa():
    res = run([issue("A", None, "1", done_at="2026-09-05")])["1"]
    assert (res.planned, res.burned) == (0, 0)
    assert res.unestimated == ["A"]


def test_t7_subtareas_excluidas():
    res = run([issue("A", 5, "1", done_at="2026-09-05", subtask=True)])["1"]
    assert res.planned == 0
    assert res.lines == []


def test_t7b_subtareas_incluidas_si_se_configura():
    res = Engine(skip_subtasks=False).project(
        [S1], [issue("A", 5, "1", done_at="2026-09-05", subtask=True)]
    )
    assert res[0].planned == 5


@pytest.mark.parametrize("status", ["Cerrado", "Finalizada", "Done"])
def test_t8_cualquier_estado_done_cuenta(status: str):
    res = run([issue("A", 2, "1", done_at="2026-09-05", status=status)])["1"]
    assert res.burned == 2


def test_t9_estado_en_curso_no_cuenta():
    res = run([issue("A", 2, "1", status="QA Aprobado")])["1"]
    assert res.burned == 0
    assert res.lines[0].reason == Reason.NOT_DONE


def test_t10_sprint_sin_issues():
    res = run([])["1"]
    assert res.planned == 0
    assert res.pct is None


def test_t11_mensual_suma_puntos():
    a = SprintResult(sprint("a", "2025-10-01", "2025-10-03"), planned=54, burned=18)
    b = SprintResult(sprint("b", "2025-10-06", "2025-10-10"), planned=57, burned=41)
    month = Engine().monthly([a, b])[0]
    assert month.month == "2025-10"
    assert round(month.pct * 100, 1) == 53.2


def test_t12_regresion_planilla_historica():
    # Totales anonimizados de la planilla manual actual (planificados, quemados, fin del sprint)
    rows = [
        ("2025-10-03", 54, 18), ("2025-10-10", 57, 41), ("2025-10-17", 64, 54),
        ("2025-10-24", 91, 47), ("2025-10-31", 60, 22), ("2025-11-07", 37, 0),
        ("2025-11-14", 45, 21), ("2025-11-20", 66, 34), ("2025-11-28", 71, 41),
        ("2025-12-05", 53, 29), ("2025-12-12", 57, 26), ("2025-12-19", 131, 131),
        ("2026-02-06", 131, 120), ("2026-02-20", 112, 110),
    ]  # fmt: skip
    results = [
        SprintResult(sprint(str(i), end, end), planned=p, burned=b)
        for i, (end, p, b) in enumerate(rows)
    ]
    got = {m.month: round(m.pct * 100, 1) for m in Engine().monthly(results)}
    assert got == {"2025-10": 55.8, "2025-11": 43.8, "2025-12": 77.2, "2026-02": 94.7}


def test_sprint_activo_es_provisorio_y_no_entra_en_el_mes():
    active = sprint("3", "2026-09-29", "2026-10-10", State.ACTIVE)
    res = run([issue("A", 5, "3", done_at="2026-10-01")], [S1, S2, active])
    assert res["3"].provisional
    assert res["3"].burned == 5
    assert all("3" not in m.sprints for m in Engine().monthly(list(res.values())))


def test_por_persona():
    res = run(
        [
            issue("A", 5, "1", done_at="2026-09-05", assignee="Ana"),
            issue("B", 3, "1", assignee="Ana"),
            issue("C", 2, "1", done_at="2026-09-05"),
        ]
    )["1"]
    assert (res.people["Ana"].planned, res.people["Ana"].burned) == (8, 5)
    assert res.people["Sin asignar"].burned == 2


def test_auditoria_marca_quemada_en_otro_sprint():
    res = run([issue("A", 8, "1", "2", done_at="2026-09-20")])
    line = res["1"].lines[0]
    assert line.reason == Reason.OTHER_SPRINT
    assert line.burn_sprint == "2"
