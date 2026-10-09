"""Motor de cumplimiento: metodología de auditoría (spec §7). Puro, sin I/O."""

from collections import defaultdict
from collections.abc import Iterable

from app.compliance.models import (
    Issue,
    Line,
    MonthResult,
    Person,
    Reason,
    Sprint,
    SprintResult,
    State,
)

NO_ONE = "Sin asignar"


class Engine:
    """Calcula planificados vs quemados por sprint, persona y mes."""

    def __init__(self, skip_subtasks: bool = True) -> None:
        self.skip_subtasks = skip_subtasks

    def burn_sprint(self, issue: Issue, sprints: dict[str, Sprint]) -> tuple[str | None, Reason]:
        """Sprint donde quema una issue (regla de no duplicación)."""
        if not issue.done:
            return None, Reason.NOT_DONE
        own = sorted((sprints[s] for s in issue.sprints if s in sprints), key=lambda s: s.start)
        if not own:
            return None, Reason.NOT_DONE
        if issue.done_at is None:
            return own[-1].id, Reason.NO_DATE
        # primer sprint propio cuyo fin efectivo es >= la fecha de finalización
        first = next((s for s in own if s.until >= issue.done_at), None)
        if first is None:
            return own[-1].id, Reason.AFTER_LAST
        return first.id, Reason.IN_SPRINT

    def sprint(
        self, sprint: Sprint, issues: Iterable[Issue], all_sprints: list[Sprint]
    ) -> SprintResult:
        """Resultado de un sprint: corte independiente, sin arrastre."""
        by_id = {s.id: s for s in all_sprints}
        res = SprintResult(sprint)
        people: dict[str, Person] = defaultdict(Person)

        for issue in self._scope(issues):
            if sprint.id not in issue.sprints:
                continue
            target, reason = self.burn_sprint(issue, by_id)
            burned = target == sprint.id
            if issue.done and not burned:
                reason = Reason.OTHER_SPRINT
            who = people[issue.assignee or NO_ONE]

            res.planned += issue.pts
            who.planned += issue.pts
            if burned:
                res.burned += issue.pts
                who.burned += issue.pts
            if issue.sp is None:
                res.unestimated.append(issue.key)
            res.lines.append(Line(issue, burned, target, reason))

        res.people = dict(people)
        return res

    def project(self, sprints: list[Sprint], issues: list[Issue]) -> list[SprintResult]:
        """Todos los sprints de un proyecto, ordenados por inicio."""
        ordered = sorted(sprints, key=lambda s: s.start)
        return [self.sprint(s, issues, ordered) for s in ordered]

    def monthly(self, results: Iterable[SprintResult]) -> list[MonthResult]:
        """Suma de puntos por mes de fin del sprint. Solo sprints cerrados."""
        months: dict[str, MonthResult] = {}
        for r in results:
            if r.sprint.state != State.CLOSED:
                continue
            key = r.sprint.until.strftime("%Y-%m")
            m = months.setdefault(key, MonthResult(key, 0.0, 0.0, []))
            m.planned += r.planned
            m.burned += r.burned
            m.sprints.append(r.sprint.id)
        return [months[k] for k in sorted(months)]

    def _scope(self, issues: Iterable[Issue]) -> Iterable[Issue]:
        return (i for i in issues if not (self.skip_subtasks and i.subtask))
