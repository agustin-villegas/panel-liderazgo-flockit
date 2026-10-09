from dataclasses import dataclass
from datetime import date, timedelta
from uuid import UUID

from app.board.models import BoardIssue, Lane, workdays
from app.compliance.models import SprintResult, State
from app.compliance.service import light

CLOSED_WINDOW = 14  # días: solo avisar cierres recientes
UNSTARTED_DAYS = 2  # días hábiles sin sprint nuevo
STALE_DAYS = 3  # días hábiles sin movimiento
MAX_LIST = 10
LABEL = {"ok": "En margen", "warn": "Atención", "crit": "En riesgo", "none": "Sin datos"}

INICIO, CIERRE, SINSP, SININICIAR, SINMOV = "inicio", "cierre", "sinsp", "siniciar", "sinmov"


@dataclass(frozen=True)
class Event:
    kind: str
    dedupe_key: str
    title: str
    body: str
    link: str


def elapsed(since: date, today: date) -> int:
    """Días hábiles transcurridos después de `since` hasta `today` (inclusive)."""
    return workdays(since + timedelta(days=1), today)


def fmt(x: float) -> str:
    return f"{x:g}"


class Detector:
    """Dado el estado de un proyecto, devuelve los avisos que corresponden. Sin I/O."""

    def __init__(self, pid: UUID, name: str, today: date) -> None:
        self.pid, self.name, self.today = pid, name, today

    def detect(self, results: list[SprintResult], cards: list[BoardIssue]) -> list[Event]:
        """Todos los eventos vigentes (el servicio descarta los ya notificados)."""
        active = next((r for r in results if r.sprint.state == State.ACTIVE), None)
        closed = [r for r in results if r.sprint.state == State.CLOSED]
        out = [e for r in closed if (e := self._cierre(r))]
        if active:
            out += self._inicio(active, cards)
            out += self._sin_mov(active, cards)
        elif closed:
            last = max(closed, key=lambda r: r.sprint.until)
            if e := self._sin_iniciar(last):
                out.append(e)
        return out

    def _key(self, kind: str, sid: str, extra: str = "") -> str:
        return ":".join(p for p in (kind, str(self.pid), sid, extra) if p)

    def _cierre(self, r: SprintResult) -> Event | None:
        s = r.sprint
        if (self.today - s.until.date()).days > CLOSED_WINDOW:
            return None
        pct = r.pct
        txt = f"{pct * 100:.0f}%" if pct is not None else "s/d"
        return Event(
            CIERRE,
            self._key(CIERRE, s.id),
            f"{self.name}: cerró {s.name}",
            f"Planificados {fmt(r.planned)} SP, quemados {fmt(r.burned)} SP. "
            f"Cumplimiento {txt} ({LABEL[light(pct)]}).",
            f"/proyectos/{self.pid}",
        )

    def _inicio(self, r: SprintResult, cards: list[BoardIssue]) -> list[Event]:
        s = r.sprint
        nosp = [c for c in cards if c.sp is None]
        link = f"/tableros/{self.pid}"
        body = (
            f"{s.start:%d/%m} al {s.end:%d/%m}. Planificados {fmt(r.planned)} SP. "
            f"{len(nosp)} issues sin SP."
        )
        out = [Event(INICIO, self._key(INICIO, s.id), f"{self.name}: arrancó {s.name}", body, link)]
        if nosp:
            out.append(self._sin_sp(s.id, nosp, "", link))
            if workdays(s.start.date(), self.today) >= 2:  # sigue sin estimar al día hábil 2
                out.append(self._sin_sp(s.id, nosp, "d2", link))
        return out

    def _sin_sp(self, sid: str, nosp: list[BoardIssue], tag: str, link: str) -> Event:
        rows = [f"{c.key} ({c.assignee or 'sin responsable'})" for c in nosp[:MAX_LIST]]
        more = f" y {len(nosp) - MAX_LIST} más" if len(nosp) > MAX_LIST else ""
        return Event(
            SINSP,
            self._key(SINSP, sid, tag),
            f"{self.name}: {len(nosp)} issues sin story points",
            "; ".join(rows) + more,
            link,
        )

    def _sin_iniciar(self, last: SprintResult) -> Event | None:
        s = last.sprint
        if elapsed(s.until.date(), self.today) < UNSTARTED_DAYS:
            return None
        return Event(
            SININICIAR,
            self._key(SININICIAR, s.id),
            f"{self.name}: sprint sin iniciar",
            f"El último sprint ({s.name}) cerró el {s.until:%d/%m} y no hay uno activo.",
            f"/proyectos/{self.pid}",
        )

    def _sin_mov(self, r: SprintResult, cards: list[BoardIssue]) -> list[Event]:
        out: list[Event] = []
        for c in cards:
            if c.lane == Lane.DONE or c.updated is None:
                continue
            days = elapsed(c.updated.date(), self.today)
            if days < STALE_DAYS:
                continue
            out.append(
                Event(
                    SINMOV,
                    self._key(SINMOV, r.sprint.id, c.key),
                    f"{self.name}: {c.key} sin movimiento",
                    f"{c.key} ({c.assignee or 'sin responsable'}) lleva {days} días hábiles "
                    f"sin actualizarse.",
                    f"/tableros/{self.pid}",
                )
            )
        return out
