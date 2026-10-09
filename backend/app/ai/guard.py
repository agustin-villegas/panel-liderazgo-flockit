"""Texto externo (Jira) = dato no confiable. Se marca antes de mandarlo al LLM."""

import re

SUSPECT = re.compile(
    r"ignor[aáe]\w*\s+(todas?\s+)?(las\s+)?(instrucciones|indicaciones|reglas)"
    r"|ignore\s+(all\s+)?(previous|prior|above)\s+instructions"
    r"|system\s*prompt"
    r"|(sos|eres|you are)\s+ahora|now\s+you\s+are"
    r"|<\s*/?\s*(system|assistant|instrucciones)\s*>",
    re.IGNORECASE,
)
MAX = 300


def suspicious(text: str | None) -> bool:
    """True si el texto intenta dar órdenes al modelo."""
    return bool(text and SUSPECT.search(text))


def wrap(text: str | None) -> str:
    """Recorta y envuelve el texto para que el modelo lo trate como dato."""
    clean = (text or "").replace("«", '"').replace("»", '"').strip()
    if len(clean) > MAX:
        clean = clean[:MAX] + "…"
    return f"«dato_externo: {clean}»"
