from dataclasses import dataclass
from typing import Protocol

from app.compliance.models import Issue, Sprint


@dataclass(frozen=True)
class Board:
    id: int
    name: str
    key: str  # clave del proyecto Jira


@dataclass(frozen=True)
class Field:
    id: str
    name: str


class JiraError(Exception):
    """Error de Jira con mensaje apto para el usuario."""


class JiraSource(Protocol):
    """Lo que el panel necesita de Jira. Implementaciones: JiraCloud y JiraDemo."""

    async def me(self) -> str: ...

    async def sp_fields(self) -> list[Field]: ...

    async def boards(self) -> list[Board]: ...

    async def sprints(self, board: int) -> list[Sprint]: ...

    async def issues(self, sprint: str, sp_field: str) -> list[Issue]: ...


SP_NAMES = ("story points", "story point estimate", "puntos de historia")


def guess_sp_field(fields: list[Field]) -> str | None:
    """Campo de story points por nombre (spec §4.1)."""
    for f in fields:
        if f.name.strip().lower() in SP_NAMES:
            return f.id
    return None
