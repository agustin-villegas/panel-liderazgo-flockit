from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class State(StrEnum):
    FUTURE = "future"
    ACTIVE = "active"
    CLOSED = "closed"


class Reason(StrEnum):
    IN_SPRINT = "terminada en el sprint"
    AFTER_LAST = "terminada después del último sprint"
    OTHER_SPRINT = "quemada en otro sprint"
    NOT_DONE = "no terminada"
    NO_DATE = "terminada sin fecha (se asigna al último sprint)"


@dataclass(frozen=True)
class Sprint:
    id: str
    name: str
    start: datetime
    end: datetime  # fin planificado
    closed_at: datetime | None = None  # cierre real
    state: State = State.CLOSED
    goal: str | None = None  # objetivo del sprint en Jira

    @property
    def until(self) -> datetime:
        """Fin efectivo: cierre real o, si sigue abierto, el planificado."""
        return self.closed_at or self.end


@dataclass(frozen=True)
class Issue:
    key: str
    sp: float | None  # None = sin estimar
    done: bool  # estado en categoría Done
    sprints: tuple[str, ...]  # ids de sprint del campo Sprint de Jira
    done_at: datetime | None = None  # última entrada a Done
    assignee: str | None = None
    title: str = ""
    status: str = ""
    subtask: bool = False

    @property
    def pts(self) -> float:
        return self.sp or 0.0


@dataclass(frozen=True)
class Line:
    """Una issue dentro del cálculo de un sprint (auditoría)."""

    issue: Issue
    burned: bool
    burn_sprint: str | None
    reason: Reason


@dataclass
class Person:
    planned: float = 0.0
    burned: float = 0.0


@dataclass
class SprintResult:
    sprint: Sprint
    planned: float = 0.0
    burned: float = 0.0
    lines: list[Line] = field(default_factory=list)
    people: dict[str, Person] = field(default_factory=dict)
    unestimated: list[str] = field(default_factory=list)

    @property
    def pct(self) -> float | None:
        """Cumplimiento 0..1. None si no hay planificados."""
        return self.burned / self.planned if self.planned else None

    @property
    def provisional(self) -> bool:
        return self.sprint.state != State.CLOSED


@dataclass
class MonthResult:
    month: str  # YYYY-MM
    planned: float
    burned: float
    sprints: list[str]

    @property
    def pct(self) -> float | None:
        return self.burned / self.planned if self.planned else None
