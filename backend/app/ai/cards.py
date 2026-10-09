"""Tarjetas visuales del chat: se arman con la salida de las tools, nunca con texto del LLM."""

from collections.abc import Callable
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

from app.compliance.service import light

MAX_CARDS = 4
MAX_ROWS = 8
LIGHTS = {"verde": "ok", "amarillo": "warn", "rojo": "crit", "sin datos": "none"}
EXT = "«dato_externo: "


class Point(BaseModel):
    label: str
    pct: float | None
    light: str
    planned: float | None = None
    burned: float | None = None


class SprintCard(BaseModel):
    kind: Literal["sprint"] = "sprint"
    project: str
    sprint: str
    state: str
    pct: float | None
    light: str
    planned: float | None
    burned: float | None
    people: list[Point]


class RiskItem(BaseModel):
    project: str
    sprint: str
    pct: float | None
    light: str


class RiskCard(BaseModel):
    kind: Literal["riesgo"] = "riesgo"
    items: list[RiskItem]
    no_data: list[str]


class TrendCard(BaseModel):
    kind: Literal["tendencia"] = "tendencia"
    project: str
    title: str
    points: list[Point]


class BoardCard(BaseModel):
    kind: Literal["tablero"] = "tablero"
    project: str
    sprint: str | None
    todo: int
    doing: int
    blocked: int
    done: int
    done_pct: float | None
    time_pct: float | None


class IssueItem(BaseModel):
    key: str
    title: str
    status: str
    assignee: str
    sp: float | None


class IssuesCard(BaseModel):
    kind: Literal["issues"] = "issues"
    project: str
    sprint: str
    total: int
    items: list[IssueItem]


Card = Annotated[
    SprintCard | RiskCard | TrendCard | BoardCard | IssuesCard, Field(discriminator="kind")
]


def num(v: Any) -> float | None:
    """'30,4 %' -> 0.304 · '26' -> 26.0 · 'sin datos' -> None."""
    if not isinstance(v, str):
        return None
    raw = v.replace("%", "").replace(",", ".").strip()
    try:
        val = float(raw)
    except ValueError:
        return None
    return val / 100 if "%" in v else val


def pt(label: str, p: float | None, planned: float | None, burned: float | None) -> Point:
    """Punto de una serie con su semáforo (umbrales del motor)."""
    return Point(label=label, pct=p, light=light(p), planned=planned, burned=burned)


def unwrap(text: str) -> str:
    """Saca el envoltorio de dato externo para mostrarlo (React ya escapa el texto)."""
    return text[len(EXT) : -1] if text.startswith(EXT) and text.endswith("»") else text


def _sprint(o: dict[str, Any]) -> SprintCard:
    p = num(o.get("cumplimiento"))
    return SprintCard(
        project=o["proyecto"],
        sprint=o["sprint"],
        state=o.get("estado", ""),
        pct=p,
        light=light(p),
        planned=num(o.get("planificados_sp")),
        burned=num(o.get("quemados_sp")),
        people=[
            pt(
                x["persona"],
                num(x.get("cumplimiento")),
                num(x.get("planificados_sp")),
                num(x.get("quemados_sp")),
            )
            for x in o.get("por_persona", [])[:MAX_ROWS]
        ],
    )


def _risk(o: dict[str, Any]) -> RiskCard:
    return RiskCard(
        items=[
            RiskItem(
                project=x["proyecto"],
                sprint=x["sprint"],
                pct=num(x.get("cumplimiento")),
                light=LIGHTS.get(x.get("semaforo", ""), "none"),
            )
            for x in o.get("en_riesgo", [])
        ],
        no_data=o.get("sin_datos_de_jira", []),
    )


def _trend(o: dict[str, Any]) -> TrendCard:
    pts = [
        pt(
            x["sprint"],
            num(x.get("cumplimiento")),
            num(x.get("planificados_sp")),
            num(x.get("quemados_sp")),
        )
        for x in o.get("sprints", [])
    ]
    return TrendCard(project=o["proyecto"], title="Tendencia por sprint", points=pts)


def _monthly(o: dict[str, Any]) -> TrendCard:
    pts = [
        pt(
            x["mes"],
            num(x.get("cumplimiento")),
            num(x.get("planificados_sp")),
            num(x.get("quemados_sp")),
        )
        for x in o.get("meses", [])
    ]
    return TrendCard(project=o["proyecto"], title="Cumplimiento mensual", points=pts)


def _board(o: dict[str, Any]) -> BoardCard:
    return BoardCard(
        project=o["proyecto"],
        sprint=o.get("sprint"),
        todo=o.get("por_hacer", 0),
        doing=o.get("en_curso", 0),
        blocked=o.get("bloqueadas", 0),
        done=o.get("finalizadas", 0),
        done_pct=num(o.get("finalizadas_pct")),
        time_pct=num(o.get("tiempo_transcurrido_pct")),
    )


def _issues(o: dict[str, Any]) -> IssuesCard:
    return IssuesCard(
        project=o["proyecto"],
        sprint=o["sprint"],
        total=o.get("cantidad", 0),
        items=[
            IssueItem(
                key=x["issue"],
                title=unwrap(x.get("titulo", "")),
                status=x.get("estado", ""),
                assignee=x.get("responsable", ""),
                sp=num(x.get("sp")),
            )
            for x in o.get("issues", [])[:MAX_ROWS]
        ],
    )


BUILDERS: dict[str, Callable[[dict[str, Any]], Any]] = {
    "cumplimiento_sprint": _sprint,
    "proyectos_en_riesgo": _risk,
    "tendencia": _trend,
    "cumplimiento_mensual": _monthly,
    "tablero_sprint": _board,
    "issues_no_terminadas": _issues,
}


def build(outs: list[tuple[str, dict[str, Any]]]) -> list[Any]:
    """Una tarjeta por tool con datos (las que fallaron o no tienen vista se saltean)."""
    cards = []
    for name, out in outs:
        fn = BUILDERS.get(name)
        if fn is None or "error" in out:
            continue
        try:
            cards.append(fn(out))
        except (KeyError, TypeError, ValueError):
            continue  # salida inesperada: mejor sin tarjeta que con datos rotos
    return cards[-MAX_CARDS:]
