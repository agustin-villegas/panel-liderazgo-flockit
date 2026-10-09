from collections import Counter
from datetime import datetime, timedelta
from uuid import UUID

from app.board.models import BoardIssue, Lane, workdays
from app.board.schemas import Counts, SprintBoardOut, SprintInfo, TicketOut
from app.compliance.models import Sprint, State
from app.compliance.service import JiraReadError
from app.connections.factory import SourceFactory
from app.connections.models import Connection
from app.core.clock import now
from app.jira.source import JiraError
from app.projects.models import Project

TTL = timedelta(seconds=60)


class BoardService:
    """Tablero del sprint activo (spec §9.5.b). Solo lectura."""

    def __init__(
        self, factory: SourceFactory, cache: dict[UUID, tuple[datetime, SprintBoardOut]]
    ) -> None:
        self.factory = factory
        self.cache = cache

    async def board(self, proj: Project, conn: Connection | None) -> SprintBoardOut:
        hit = self.cache.get(proj.id)
        if hit and now() - hit[0] < TTL:
            return hit[1]
        if conn is None or proj.board_id is None:
            raise JiraReadError("El proyecto no tiene conexión o board configurado")
        src = self.factory.make(conn)
        try:
            sprints = await src.sprints(proj.board_id)
            sprint, notice = self._pick(sprints)
            cards = await src.board_issues(sprint.id, conn.sp_field or "") if sprint else []
        except JiraError as e:
            raise JiraReadError(str(e)) from e
        out = self.build(sprint, cards, notice)
        self.cache[proj.id] = (now(), out)
        return out

    def build(
        self, sprint: Sprint | None, cards: list[BoardIssue], notice: str | None
    ) -> SprintBoardOut:
        """Arma la vista: conteos por carril, % tiempo vs % finalizadas."""
        by_lane = Counter(c.lane for c in cards)
        total = len(cards)
        return SprintBoardOut(
            sprint=self._info(sprint) if sprint else None,
            counts=Counts(
                total=total,
                todo=by_lane[Lane.TODO],
                doing=by_lane[Lane.DOING],
                blocked=by_lane[Lane.BLOCKED],
                done=by_lane[Lane.DONE],
            ),
            done_pct=by_lane[Lane.DONE] / total if total else None,
            cards=[
                TicketOut(
                    key=c.key,
                    title=c.title,
                    status=c.status,
                    lane=c.lane,
                    type=c.type,
                    priority=c.priority,
                    assignee=c.assignee,
                    sp=c.sp,
                    labels=list(c.labels),
                    updated=c.updated,
                )
                for c in cards
            ],
            notice=notice,
        )

    @staticmethod
    def _pick(sprints: list[Sprint]) -> tuple[Sprint | None, str | None]:
        active = [s for s in sprints if s.state == State.ACTIVE]
        if active:
            return max(active, key=lambda s: s.start), None
        closed = sorted((s for s in sprints if s.state == State.CLOSED), key=lambda s: s.start)
        if closed:
            return closed[-1], "No hay sprint activo: se muestra el último cerrado."
        return None, "El board no tiene sprints iniciados."

    @staticmethod
    def _info(s: Sprint) -> SprintInfo:
        start, end, today = s.start.date(), s.end.date(), now().date()
        days = max(workdays(start, end), 1)
        day = min(max(workdays(start, min(today, end)), 1), days)
        done = days if s.state == State.CLOSED else day
        return SprintInfo(
            id=s.id,
            name=s.name,
            state=s.state,
            start=s.start,
            end=s.until,
            day=day,
            days=days,
            time_pct=done / days,
        )
