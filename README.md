# Panel único de liderazgo · Flockit

Un solo lugar para los líderes de equipo: **cumplimiento de sprints** calculado desde Jira con la
metodología de auditoría, **informes** con narrativa de IA, **avisos** de sprint y un **asistente**
que responde sobre los datos.

> Challenge "Panel único de liderazgo" — AI Day Flockit 2026.

## Por qué

El cumplimiento de sprint se cargaba a mano o desde un Excel y no se podía auditar contra Jira.
Este panel lo calcula solo, con reglas explícitas y tests que las garantizan. Detalle en
[`docs/sdd/intent.md`](docs/sdd/intent.md).

## Funcionalidades

- **Cartera**: todos los proyectos juntos, ordenados por riesgo, con semáforo y tendencia.
- **Proyectos y sprints**: planificados vs quemados, detalle por persona y por mes, y auditoría de
  cada issue con su motivo. Tablero del sprint activo (solo lectura).
- **Informes de sprint** con números del motor y lectura redactada por IA; se guardan inmutables.
- **Avisos**: cierre e inicio de sprint, issues sin story points, sprint sin iniciar y issues sin
  movimiento. Corren con `pg_cron` cada 15 minutos.
- **Asistente IA** (Google ADK) y **servidor MCP** con tokens personales, ambos de solo lectura.
- **Configuración**: conexiones a Jira (token cifrado), cuentas, proyectos y roles.
- Toda tabla se exporta a Excel y PDF.

> Los números los calcula el motor (`backend/app/compliance`), nunca el LLM.

## Stack

- **frontend/**: Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, next-themes. pnpm.
- **backend/**: Python 3.12, FastAPI, SQLAlchemy async, Google ADK, MCP. uv, ruff, pytest.
- **Base**: Supabase Postgres (solo el backend accede; RLS activo sin políticas).
- **Deploy**: Vercel.
- **docs-site/**: sitio de documentación con Fumadocs.

## Arquitectura

```text
Navegador ──► frontend (Next.js) ──/api/*──► backend (FastAPI) ──► Supabase Postgres
                                               ├── /mcp  (token personal)  ◄── Claude Code / Cursor
                                               ├── Jira Cloud (solo lectura)
                                               └── modelo de IA (ADK)
Supabase pg_cron ──► POST /internal/jobs/notificaciones (cada 15 min)
```

El front reenvía `/api/*` al backend (cookie de sesión first-party) y no tiene secretos. Los permisos
los decide siempre el backend.

## Correr en local

Requisitos: Python 3.12 con [uv](https://docs.astral.sh/uv/) y Node 24 con pnpm.

**Terminal 1: backend** (http://localhost:8000)

```bash
cd backend
cp .env.example .env          # completar DB_PASSWORD, OPENAI_API_KEY y los secretos
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2: frontend** (http://localhost:3000)

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

Entrá a http://localhost:3000 con el admin del `.env`. Para ver datos al instante:
**Configuración → Proyectos → Nuevo proyecto** con la conexión **Demo**.

**Docs** (http://localhost:3000 por defecto; usá otro puerto si el front está corriendo)

```bash
cd docs-site
pnpm install
pnpm dev -p 3001
```

## Tests y lint

| | Backend (`cd backend`) | Frontend (`cd frontend`) | Docs (`cd docs-site`) |
|---|---|---|---|
| Lint | `uv run ruff check . && uv run ruff format --check .` | `pnpm lint && pnpm format:check` | `pnpm lint && pnpm format:check` |
| Tests / tipos | `uv run pytest` | `pnpm typecheck` | `pnpm typecheck` |
| Build | | `pnpm build` | `pnpm build` |

Útiles:

```bash
cd backend && uv run python scripts/generar_hash.py   # hash de la contraseña del admin
cd backend && uv run python scripts/openapi.py        # exporta el contrato de la API
cd frontend && pnpm gen:api                           # regenera los tipos TS desde ese contrato
```

## Deploy

Tres proyectos de Vercel:

| Proyecto | Root directory | Framework |
|---|---|---|
| Frontend | `frontend` | Next.js |
| Backend | `backend` | FastAPI |
| Docs | `docs-site` | Next.js |

El front necesita `BACKEND_URL` apuntando al backend. Las variables del backend están en
[`backend/.env.example`](backend/.env.example). El cron de avisos se configura en Supabase
(ver la página "Avisos" de la documentación).

## Documentación

- **Sitio de docs**: [`docs-site/`](docs-site) (arquitectura, motor, funcionalidades, API, desarrollo).
- **SDD**: [`intent`](docs/sdd/intent.md) → [`spec`](docs/sdd/spec.md) →
  [`plan`](docs/sdd/plan.md) → [`tasks`](docs/sdd/tasks.md), con aprobación entre etapas.
- **Reglas para la IA**: [`CLAUDE.md`](CLAUDE.md) y skills en [`.claude/skills`](.claude/skills).

## Estructura del repo

```text
panel-liderazgo-flockit/
├── CLAUDE.md             reglas del proyecto
├── .claude/              hooks (ruff, prettier, bloqueo de .env) y skills
├── .github/workflows/    ci-backend · ci-frontend · ci-docs
├── docs/sdd/             intent · spec · plan · tasks
├── docs-site/            sitio de documentación (Fumadocs)
├── frontend/             Next.js (src/app, src/components, src/lib/api)
└── backend/
    ├── app/              compliance · jira · auth · projects · reports · notifications · ai · mcp
    ├── db/migrations/    SQL plano versionado
    ├── scripts/          generar_hash.py · openapi.py
    └── tests/
```

## Datos

El repo es público: todos los datos de ejemplo son **sintéticos**. Sin Jira configurado, la app usa
la conexión **Demo**. No se versionan secretos: solo `.env.example`.
