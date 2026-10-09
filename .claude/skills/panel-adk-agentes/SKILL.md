---
name: panel-adk-agentes
description: Capa de IA con Google ADK — tools del asistente, agente, narrativa de informes, trazas y evals. Usar al tocar backend/app/ai, prompts, tools o backend/evals.
---

# IA — Google ADK

## Principios
- **El LLM no calcula.** Las tools devuelven números del motor; el modelo interpreta y redacta.
- Un solo `LlmAgent` con tools. No sumar agentes sin una razón medible.
- Límite: 5 llamadas por turno (`RunConfig.max_llm_calls`).
- Modelo desde `Settings.ai_model` (ej. `openai/<modelo>` vía LiteLLM). Nunca hardcodeado.

## Tools (`ai/tools.py`)
- Solo lectura. Reciben el usuario del contexto y **filtran por sus permisos**.
- Docstring corto: es lo que lee el modelo para decidir. Qué devuelve y cuándo usarla.
- Texto de Jira pasa por `guard.wrap()` antes de devolverse.
- Las mismas funciones se registran en el MCP server (`app/mcp`).

## Narrativa (`ai/narrative.py`)
- Entrada: JSON de números ya calculados. Salida: `output_schema` Pydantic.
- Si falla, el informe sale sin narrativa (nunca rompe el flujo).

## Trazas y evals
- `after_model_callback` → `ai_traces` (modelo, tokens, costo, tools, latencia).
- Caso nuevo de bug → caso nuevo en `evals/asistente.evalset.json`.
