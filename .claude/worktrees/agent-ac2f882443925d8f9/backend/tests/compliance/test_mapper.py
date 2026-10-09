from datetime import UTC, datetime

from app.compliance.models import State
from app.jira.mapper import last_done_at, parse_dt, to_issue, to_sprint

DONE = {"10002"}


def raw_issue(**fields) -> dict:
    base = {
        "summary": "Login",
        "status": {"name": "Finalizada", "statusCategory": {"key": "done"}},
        "issuetype": {"subtask": False},
        "assignee": {"displayName": "Ana"},
        "customfield_10016": 5,
        "sprint": {"id": 2},
        "closedSprints": [{"id": 1}],
        "resolutiondate": "2026-09-01T10:00:00.000+0000",
    }
    return {"key": "PCL-1", "fields": base | fields, "changelog": {"histories": []}}


def history(day: str, to: str) -> dict:
    return {"created": f"{day}T12:00:00.000-0300", "items": [{"field": "status", "to": to}]}


def test_parse_dt_formato_jira():
    assert parse_dt("2026-09-20T12:00:00.000-0300") == datetime(2026, 9, 20, 15, tzinfo=UTC)


def test_issue_basica():
    i = to_issue(raw_issue(), "customfield_10016", DONE)
    assert (i.key, i.sp, i.done, i.assignee) == ("PCL-1", 5.0, True, "Ana")
    assert i.sprints == ("1", "2")


def test_reabierta_toma_la_ultima_finalizacion():
    raw = raw_issue()
    raw["changelog"]["histories"] = [
        history("2026-09-05", "10002"),  # done
        history("2026-09-08", "3"),  # reabierta
        history("2026-09-22", "10002"),  # done otra vez
    ]
    assert last_done_at(raw, DONE) == parse_dt("2026-09-22T12:00:00.000-0300")


def test_sin_changelog_usa_resolutiondate():
    assert last_done_at(raw_issue(), DONE) == parse_dt("2026-09-01T10:00:00.000+0000")


def test_no_terminada_no_tiene_fecha():
    i = to_issue(
        raw_issue(status={"name": "En curso", "statusCategory": {"key": "indeterminate"}}),
        "customfield_10016",
        DONE,
    )
    assert not i.done
    assert i.done_at is None


def test_sin_story_points():
    assert to_issue(raw_issue(customfield_10016=None), "customfield_10016", DONE).sp is None


def test_sprint_cerrado():
    s = to_sprint(
        {
            "id": 7,
            "name": "S7",
            "state": "closed",
            "startDate": "2026-09-01T09:00:00.000Z",
            "endDate": "2026-09-12T18:00:00.000Z",
            "completeDate": "2026-09-12T19:00:00.000Z",
        }
    )
    assert (s.id, s.state, s.goal) == ("7", State.CLOSED, None)
    assert s.until == datetime(2026, 9, 12, 19, tzinfo=UTC)


def test_sprint_guarda_el_objetivo():
    s = to_sprint(
        {
            "id": 8,
            "name": "S8",
            "state": "closed",
            "startDate": "2026-09-01T09:00:00.000Z",
            "endDate": "2026-09-12T18:00:00.000Z",
            "goal": "  Cerrar el alta de clientes  ",
        }
    )
    assert s.goal == "Cerrar el alta de clientes"
