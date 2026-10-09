import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from uuid import UUID

from app.compliance.engine import Engine
from app.compliance.models import Issue, MonthResult, SprintResult, State
from app.compliance.schemas import (
    ActiveOut,
    CardOut,
    DetailOut,
    LineOut,
    MonthOut,
    PersonOut,
    SprintOut,
)
from app.connections.factory import SourceFactory
from app.connections.models import Connection
from app.core.clock import now
from app.core.errors import AppError, NotFoundError
from app.jira.source import JiraError
from app.projects.models import Project

log = logging.getLogger(__name__)

TTL = timedelta(minutes=5)
TREND = 6
OK, WARN = 0.85, 0.70  # umbrales del semáforo (spec §9.1)


def light(pct: float | None) -> str:
    """Semáforo de cumplimiento."""
    if pct is None:
        return "none"
    return "ok" if pct >= OK else "warn" if pct >= WARN else "crit"


class JiraReadError(AppError):
    status = 502
    code = "JIRA_ERROR"


@dataclass
class Snapshot:
    at: datetime
    results: list[SprintResult]
    months: list[MonthResult] = field(default_factory=list)


class Cache:
    """Caché en memoria por proyecto (stale-while-revalidate simple)."""

    def __init__(self) -> None:
        self._data: dict[UUID, Snapshot] = {}

    def get(self, pid: UUID) -> Snapshot | None:
        snap = self._data.get(pid)
        return snap if snap and now() - snap.at < TTL else None

    def put(self, pid: UUID, snap: Snapshot) -> None:
        self._data[pid] = snap

    def drop(self, pid: UUID) -> None:
        self._data.pop(pid, None)


class ComplianceService:
    """Lee Jira, corre el motor y arma las vistas. Los números salen solo de acá."""

    def __init__(self, factory: SourceFactory, cache: Cache) -> None:
        self.factory = factory
        self.cache = cache

    async def snapshot(
        self, proj: Project, conn: Connection | None, fresh: bool = False
    ) -> Snapshot:
        if not fresh and (hit := self.cache.get(proj.id)):
            return hit
        if conn is None or proj.board_id is None:
            raise JiraReadError("El proyecto no tiene conexión o board configurado")
        src = self.factory.make(conn)
        try:
            sprints = [s for s in await src.sprints(proj.board_id) if s.state != State.FUTURE]
            sprints.sort(key=lambda s: s.start)
            if proj.from_sprint:
                ids = [s.id for s in sprints]
                if proj.from_sprint in ids:
                    sprints = sprints[ids.index(proj.from_sprint) :]
            sp_field = conn.sp_field or ""
            batches = await asyncio.gather(*(src.issues(s.id, sp_field) for s in sprints))
        except JiraError as e:
            log.warning("Jira falló para %s: %s", proj.name, e)
            raise JiraReadError(str(e)) from e

        issues: dict[str, Issue] = {i.key: i for batch in batches for i in batch}
        engine = Engine(skip_subtasks=conn.skip_subtasks)
        results = engine.project(sprints, list(issues.values()))
        snap = Snapshot(now(), results, engine.monthly(results))
        self.cache.put(proj.id, snap)
        return snap

    # ── vistas ──
    def card(self, proj: Project, account: str, snap: Snapshot) -> CardOut:
        closed = [r for r in snap.results if not r.provisional]
        active = next((r for r in snap.results if r.provisional), None)
        last = closed[-1] if closed else None
        month = snap.months[-1] if snap.months else None
        return CardOut(
            id=proj.id,
            name=proj.name,
            account=account,
            light=light(last.pct) if last else "none",
            last=self.sprint_out(last) if last else None,
            active=self._active(active) if active else None,
            trend=[r.pct for r in closed[-TREND:]],
            month=self.month_out(month) if month else None,
        )

    def sprint_out(self, r: SprintResult) -> SprintOut:
        s = r.sprint
        return SprintOut(
            id=s.id,
            name=s.name,
            start=s.start,
            end=s.until,
            state=s.state,
            planned=r.planned,
            burned=r.burned,
            pct=r.pct,
            light=light(r.pct),
            unestimated=len(r.unestimated),
            provisional=r.provisional,
            goal=s.goal,
            people=[
                PersonOut(
                    name=n,
                    planned=p.planned,
                    burned=p.burned,
                    pct=p.burned / p.planned if p.planned else None,
                )
                for n, p in sorted(r.people.items(), key=lambda kv: -kv[1].planned)
            ],
        )

    def month_out(self, m: MonthResult) -> MonthOut:
        return MonthOut(
            month=m.month,
            planned=m.planned,
            burned=m.burned,
            pct=m.pct,
            light=light(m.pct),
            sprints=len(m.sprints),
        )

    def detail(self, snap: Snapshot, sid: str) -> DetailOut:
        r = next((r for r in snap.results if r.sprint.id == sid), None)
        if r is None:
            raise NotFoundError("Sprint no encontrado en el proyecto")
        names = {x.sprint.id: x.sprint.name for x in snap.results}
        lines = [
            LineOut(
                key=ln.issue.key,
                title=ln.issue.title,
                status=ln.issue.status,
                assignee=ln.issue.assignee,
                sp=ln.issue.sp,
                done=ln.issue.done,
                done_at=ln.issue.done_at,
                sprints=[names.get(s, s) for s in ln.issue.sprints],
                burned=ln.burned,
                burn_sprint=names.get(ln.burn_sprint or "", ln.burn_sprint),
                reason=ln.reason,
            )
            for ln in sorted(r.lines, key=lambda ln: (not ln.burned, ln.issue.key))
        ]
        return DetailOut(sprint=self.sprint_out(r), lines=lines)

    def _active(self, r: SprintResult) -> ActiveOut:
        s = r.sprint
        days = max((s.end.date() - s.start.date()).days, 1)
        day = min(max((now().date() - s.start.date()).days + 1, 1), days)
        return ActiveOut(
            name=s.name, day=day, days=days, planned=r.planned, burned=r.burned, pct=r.pct
        )
