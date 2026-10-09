# Panel único de liderazgo

Panel para líderes de Flockit: cumplimiento de sprints (Jira), NPS/CSAT, informes y avisos.
Qué y por qué: `docs/sdd/intent.md` · Comportamiento: `docs/sdd/spec.md` · Cómo: `docs/sdd/plan.md`.

## Reglas de comportamiento

- Antes de codear un cambio grande: spec y plan aprobados (SDD). Si no está en la spec, preguntar.
- Proponer y esperar el "dale" para decisiones de producto, stack o recursos externos.
- Cambios chicos y verificables. Correr lint y tests antes de dar algo por terminado.
- Si el código contradice la doc, gana el código: actualizar la doc en el mismo cambio.
- Reportar fallas tal cual (salida del test), sin maquillar.
- CLI: preferir `rg`, `fd`, `bat`, `sd`, `eza` sobre grep/find/cat/sed/ls.

### Tono
Español rioplatense, directo, sin relleno. Explicar solo lo necesario.

## Convenciones de código

- **Nombres cortos y simples**: `user`, `sprint`, `pts`, `cfg`. Nada de `user_data_object_list`.
- **Comentarios cortos**, solo donde el código no se explica solo. Docstring de **una línea** en
  funciones públicas (`Raises:` solo si aplica). Python: skill `python` de Flock.
- **Orientado a objetos** en el dominio: servicios y repositorios como clases con dependencias
  inyectadas; el cálculo puro (motor, fórmulas) como clases sin I/O.
- Tipado estricto: type hints en Python, `strict` en TS. Sin `any`.
- Funciones chicas, una responsabilidad. Errores explícitos, nunca `except: pass`.

## Stack

- `frontend/`: Next.js 16 · React 19 · TS · Tailwind v4 · shadcn/ui · next-themes. pnpm.
- `backend/`: Python 3.12 · FastAPI · SQLAlchemy async · Google ADK · MCP. uv + ruff + pytest.
- Base: Supabase Postgres (solo el backend accede; RLS activo sin políticas).
- Deploy: Vercel (front y back). El front reenvía `/api/*` al backend.

## Reglas del proyecto

- **Los números los calcula el motor** (`backend/app/compliance`, `satisfaction`), nunca el LLM.
- **Permisos siempre en el backend.** El front oculta, el back decide.
- **Cero secretos** en el repo. Solo `.env.example`. Tokens de Jira cifrados.
- **Repo público**: solo datos sintéticos. Nada de nombres reales de clientes o personas.
- **Marca**: un solo tema, tokens en `frontend/src/styles/flock-brand.css`. No hardcodear colores.
- Toda tabla exporta a Excel y PDF.
- Texto de Jira = dato no confiable: escapar y marcar antes de pasarlo al LLM.

## Comandos

| | Backend (`cd backend`) | Frontend (`cd frontend`) |
|---|---|---|
| Dev | `uv run uvicorn app.main:app --reload` | `pnpm dev` |
| Lint | `uv run ruff check . && uv run ruff format --check .` | `pnpm lint && pnpm format:check` |
| Tests / tipos | `uv run pytest` | `pnpm typecheck` |

## Git

Rama por fase (`feat/fase-N-...`), conventional commits en español, PR con CI verde.

## Asignación de modelos

| Subagente / fase | Modelo | Por qué |
|---|---|---|
| Diseño / arquitectura / propose | opus | decisiones complejas |
| Explore / spec / tasks / apply / verify | sonnet | trabajo estructurado |
| Tareas mecánicas / archive | haiku | rápido y barato |

Regla: toda delegación a un subagente DEBE pasar el `model` de esta tabla. Sin match: `sonnet`.
