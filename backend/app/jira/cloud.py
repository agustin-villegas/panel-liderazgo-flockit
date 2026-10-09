"""Cliente de Jira Cloud, solo lectura. Basic auth con email + API token."""

import asyncio
import logging
from typing import Any

import httpx

from app.board.models import BoardIssue
from app.compliance.models import Issue, Sprint
from app.jira.mapper import FLAG_FIELD, to_board_issue, to_issue, to_sprint
from app.jira.source import Board, Field, JiraError

log = logging.getLogger(__name__)

PAGE = 50
RETRIES = 3
BOARD_FIELDS = "summary,status,issuetype,assignee,priority,labels,updated"
ISSUE_FIELDS = "summary,status,issuetype,assignee,resolutiondate,sprint,closedSprints"
ERRORS = {
    401: "Credenciales inválidas: revisá el email y el API token",
    403: "El usuario no tiene permisos para leer ese recurso",
    404: "No se encontró el sitio o el recurso en Jira",
}


class JiraCloud:
    def __init__(self, site: str, email: str, token: str, http: httpx.AsyncClient | None = None):
        self.site = site.rstrip("/")
        self.http = http or httpx.AsyncClient(timeout=20)
        self.auth = (email, token)
        self._done: set[str] | None = None

    async def _get(self, path: str, **params: Any) -> Any:
        for attempt in range(RETRIES + 1):
            try:
                res = await self.http.get(
                    f"{self.site}{path}",
                    params=params,
                    auth=self.auth,
                    headers={"Accept": "application/json"},
                )
            except httpx.TimeoutException as e:
                raise JiraError("Jira no respondió a tiempo") from e
            except httpx.HTTPError as e:
                raise JiraError("No se pudo conectar con Jira: revisá el site") from e
            if res.status_code == 429 and attempt < RETRIES:
                wait = float(res.headers.get("Retry-After", 2**attempt))
                log.warning("Jira 429, reintento en %ss", wait)
                await asyncio.sleep(wait)
                continue
            if res.status_code >= 400:
                msg = ERRORS.get(res.status_code, f"Jira devolvió {res.status_code}")
                raise JiraError(msg, res.status_code)
            return res.json()
        raise JiraError("Jira está limitando consultas, probá en un rato")

    async def _paged(self, path: str, key: str, **params: Any) -> list[dict]:
        items: list[dict] = []
        start = 0
        while True:
            data = await self._get(path, startAt=start, maxResults=PAGE, **params)
            batch = data.get(key, [])
            items.extend(batch)
            start += len(batch)
            total = data.get("total")
            if data.get("isLast") or not batch or (total is not None and start >= total):
                return items

    async def me(self) -> str:
        """Nombre del usuario conectado (sirve de prueba de conexión)."""
        data = await self._get("/rest/api/3/myself")
        return data.get("displayName") or data.get("emailAddress") or "usuario"

    async def sp_fields(self) -> list[Field]:
        data = await self._get("/rest/api/3/field")
        return [
            Field(f["id"], f["name"])
            for f in data
            if (f.get("schema") or {}).get("type") == "number"
        ]

    async def boards(self) -> list[Board]:
        """Boards que el usuario puede ver: scrum, kanban y team-managed (simple)."""
        rows = await self._paged("/rest/agile/1.0/board", "values")
        return [
            Board(b["id"], b["name"], (b.get("location") or {}).get("projectKey", "")) for b in rows
        ]

    async def sprints(self, board: int) -> list[Sprint]:
        """Sprints del board. Vacío si ese board no usa sprints."""
        try:
            rows = await self._paged(f"/rest/agile/1.0/board/{board}/sprint", "values")
        except JiraError as e:
            if e.status == 400:
                return []
            raise
        return [to_sprint(s) for s in rows if s.get("startDate")]

    async def issues(self, sprint: str, sp_field: str) -> list[Issue]:
        done = await self._done_ids()
        rows = await self._paged(
            f"/rest/agile/1.0/sprint/{sprint}/issue",
            "issues",
            fields=f"{ISSUE_FIELDS},{sp_field}",
            expand="changelog",
        )
        return [to_issue(r, sp_field, done) for r in rows]

    async def board_issues(self, sprint: str, sp_field: str) -> list[BoardIssue]:
        rows = await self._paged(
            f"/rest/agile/1.0/sprint/{sprint}/issue",
            "issues",
            fields=f"{BOARD_FIELDS},{FLAG_FIELD},{sp_field}",
        )
        return [
            to_board_issue(r, sp_field)
            for r in rows
            if not r["fields"].get("issuetype", {}).get("subtask")
        ]

    async def _done_ids(self) -> set[str]:
        if self._done is None:
            data = await self._get("/rest/api/3/status")
            self._done = {
                str(s["id"]) for s in data if (s.get("statusCategory") or {}).get("key") == "done"
            }
        return self._done
