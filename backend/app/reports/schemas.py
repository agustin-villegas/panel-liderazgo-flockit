from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.compliance.schemas import MonthOut, SprintOut

Audience = Literal["equipo", "cliente", "gerencia"]


class ReportIn(BaseModel):
    project_id: UUID
    sprint_id: str = Field(min_length=1, max_length=40)
    audience: Audience = "equipo"


class StoryIn(BaseModel):
    resumen: str = Field(max_length=2000)
    puntos: list[str] = Field(default_factory=list, max_length=6)


class SaveIn(ReportIn):
    story: StoryIn | None = None  # narrativa editada por el usuario


class TrendPoint(BaseModel):
    name: str
    planned: float
    burned: float
    pct: float | None


class Pending(BaseModel):
    key: str
    title: str
    status: str
    assignee: str | None
    sp: float | None


class TypeSlice(BaseModel):
    name: str
    count: int
    planned: float
    burned: float


class WorkItem(BaseModel):
    key: str
    title: str
    sp: float | None
    status: str


class PersonWork(BaseModel):
    name: str
    planned: float
    burned: float
    pct: float | None
    closed: list[WorkItem]
    open: list[WorkItem]


class ReportData(BaseModel):
    """Los números del informe: salen del motor, no de la IA."""

    project: str
    account: str
    sprint: SprintOut
    trend: list[TrendPoint]
    pending: list[Pending]
    month: MonthOut | None
    types: list[TypeSlice] = []  # fotos viejas no lo traen
    work: list[PersonWork] = []


class PreviewOut(BaseModel):
    data: ReportData
    story: StoryIn | None
    model: str
    ai_error: str | None = None


class ReportOut(BaseModel):
    id: UUID
    title: str
    audience: str
    project_id: UUID
    created_at: datetime
    author: str
    data: ReportData
    story: StoryIn | None
    model: str | None


class ReportRow(BaseModel):
    id: UUID
    title: str
    audience: str
    project: str
    pct: float | None
    created_at: datetime
    author: str
