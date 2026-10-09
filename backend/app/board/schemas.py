from datetime import datetime

from pydantic import BaseModel


class TicketOut(BaseModel):
    key: str
    title: str
    status: str
    lane: str
    type: str
    priority: str
    assignee: str | None
    sp: float | None
    labels: list[str]
    updated: datetime | None


class SprintInfo(BaseModel):
    id: str
    name: str
    state: str
    start: datetime
    end: datetime
    day: int  # día hábil actual (1..days)
    days: int  # días hábiles del sprint
    time_pct: float  # % de tiempo hábil transcurrido (0..1)


class Counts(BaseModel):
    total: int
    todo: int
    doing: int
    blocked: int
    done: int


class SprintBoardOut(BaseModel):
    sprint: SprintInfo | None
    counts: Counts
    done_pct: float | None  # tarjetas finalizadas / total
    cards: list[TicketOut]
    notice: str | None = None
