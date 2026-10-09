"""Formato de números para el LLM y los informes: el modelo copia, nunca calcula."""


def pct(v: float | None) -> str:
    """0.208 -> '20,8 %'."""
    return "sin datos" if v is None else f"{v * 100:.1f} %".replace(".", ",")


def fmt(v: float) -> str:
    """Puntos de historia: entero si no tiene decimales."""
    return str(int(v)) if float(v).is_integer() else f"{v:.1f}".replace(".", ",")
