"""Traduce JSON de Jira (Agile API) a los modelos del motor."""

from datetime import datetime
from typing import Any

from app.board.models import BoardIssue, lane_of
from app.compliance.models import Issue, Sprint, State

Raw = dict[str, Any]
FLAG_FIELD = "customfield_10021"  # "Flagged" en Jira Cloud


def parse_dt(value: str | None) -> datetime | None:
    """Fecha ISO de Jira (con zona) o None."""
    if not value:
        return None
    # Jira manda "+0000" sin dos puntos
    if len(value) > 5 and value[-5] in "+-" and value[-3] != ":":
        value = f"{value[:-2]}:{value[-2:]}"
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def to_sprint(raw: Raw) -> Sprint:
    """Sprint de /rest/agile/1.0/board/{id}/sprint."""
    start = parse_dt(raw.get("startDate")) or parse_dt(raw.get("createdDate"))
    end = parse_dt(raw.get("endDate")) or start
    if start is None or end is None:
        raise ValueError(f"Sprint {raw.get('id')} sin fechas")
    goal = (raw.get("goal") or "").strip() or None
    return Sprint(
        id=str(raw["id"]),
        name=raw.get("name", ""),
        start=start,
        end=end,
        closed_at=parse_dt(raw.get("completeDate")),
        state=State(raw.get("state", "closed")),
        goal=goal,
    )


def last_done_at(raw: Raw, done_ids: set[str]) -> datetime | None:
    """Última vez que la issue entró a un estado Done (changelog), o resolutiondate."""
    last: datetime | None = None
    for h in raw.get("changelog", {}).get("histories", []):
        moved = any(
            it.get("field") == "status" and str(it.get("to")) in done_ids
            for it in h.get("items", [])
        )
        when = parse_dt(h.get("created"))
        if moved and when and (last is None or when > last):
            last = when
    return last or parse_dt(raw["fields"].get("resolutiondate"))


def to_issue(raw: Raw, sp_field: str, done_ids: set[str]) -> Issue:
    """Issue de /rest/agile/1.0/sprint/{id}/issue con expand=changelog."""
    f = raw["fields"]
    status = f.get("status") or {}
    done = (status.get("statusCategory") or {}).get("key") == "done"
    sprints = [s["id"] for s in f.get("closedSprints") or []]
    if f.get("sprint"):
        sprints.append(f["sprint"]["id"])
    sp = f.get(sp_field)
    return Issue(
        key=raw["key"],
        sp=float(sp) if sp is not None else None,
        done=done,
        sprints=tuple(dict.fromkeys(str(s) for s in sprints)),
        done_at=last_done_at(raw, done_ids) if done else None,
        assignee=(f.get("assignee") or {}).get("displayName"),
        title=f.get("summary", ""),
        status=status.get("name", ""),
        subtask=bool((f.get("issuetype") or {}).get("subtask")),
        type=(f.get("issuetype") or {}).get("name") or "",
    )


def to_board_issue(raw: Raw, sp_field: str) -> BoardIssue:
    """Tarjeta del tablero (sin changelog)."""
    f = raw["fields"]
    status = f.get("status") or {}
    cat = (status.get("statusCategory") or {}).get("key")
    sp = f.get(sp_field)
    return BoardIssue(
        key=raw["key"],
        title=f.get("summary", ""),
        status=status.get("name", ""),
        lane=lane_of(cat, status.get("name", ""), bool(f.get(FLAG_FIELD))),
        type=(f.get("issuetype") or {}).get("name", ""),
        priority=(f.get("priority") or {}).get("name", "Sin prioridad"),
        assignee=(f.get("assignee") or {}).get("displayName"),
        sp=float(sp) if sp is not None else None,
        labels=tuple(f.get("labels") or ()),
        updated=parse_dt(f.get("updated")),
    )
