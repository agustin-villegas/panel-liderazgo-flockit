from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PersonOut(BaseModel):
    name: str
    planned: float
    burned: float
    pct: float | None


class SprintOut(BaseModel):
    id: str
    name: str
    start: datetime
    end: datetime
    state: str
    planned: float
    burned: float
    pct: float | None
    light: str  # ok | warn | crit | none
    unestimated: int
    provisional: bool
    people: list[PersonOut]


class MonthOut(BaseModel):
    month: str
    planned: float
    burned: float
    pct: float | None
    light: str
    sprints: int


class LineOut(BaseModel):
    key: str
    title: str
    status: str
    assignee: str | None
    sp: float | None
    done: bool
    done_at: datetime | None
    sprints: list[str]
    burned: bool
    burn_sprint: str | None
    reason: str


class DetailOut(BaseModel):
    sprint: SprintOut
    lines: list[LineOut]


class ComplianceOut(BaseModel):
    project_id: UUID
    sprints: list[SprintOut]
    months: list[MonthOut]


class ActiveOut(BaseModel):
    name: str
    day: int
    days: int
    planned: float
    burned: float
    pct: float | None


class CardOut(BaseModel):
    """Una card del panel de cartera."""

    id: UUID
    name: str
    account: str
    light: str
    last: SprintOut | None
    active: ActiveOut | None
    trend: list[float | None]
    month: MonthOut | None
    error: str | None = None
