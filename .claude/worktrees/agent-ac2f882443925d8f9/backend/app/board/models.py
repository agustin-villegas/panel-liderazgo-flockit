import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from enum import StrEnum


class Lane(StrEnum):
    TODO = "todo"
    DOING = "doing"
    BLOCKED = "blocked"
    DONE = "done"


BLOCKED_RE = re.compile(r"bloque|blocked|imped|espera|on hold", re.IGNORECASE)


def lane_of(category: str | None, status: str, flagged: bool = False) -> Lane:
    """Carril del tablero según categoría de Jira; bloqueo por nombre o flag (spec §9.5.b)."""
    if category == "done":
        return Lane.DONE
    if flagged or BLOCKED_RE.search(status or ""):
        return Lane.BLOCKED
    return Lane.DOING if category == "indeterminate" else Lane.TODO


def workdays(start: date, end: date) -> int:
    """Días hábiles (lun-vie) entre dos fechas, inclusive."""
    if end < start:
        return 0
    total = (end - start).days + 1
    return sum(1 for d in range(total) if (start + timedelta(days=d)).weekday() < 5)


@dataclass(frozen=True)
class BoardIssue:
    key: str
    title: str
    status: str
    lane: Lane
    type: str = "Historia"
    priority: str = "Media"
    assignee: str | None = None
    sp: float | None = None
    labels: tuple[str, ...] = field(default_factory=tuple)
    updated: datetime | None = None
