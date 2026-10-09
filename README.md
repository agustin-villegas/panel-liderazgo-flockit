# Panel único de liderazgo · Flockit

Un solo lugar para los líderes de equipo: **cumplimiento de sprints** calculado desde Jira con la
metodología de auditoría, **NPS/CSAT**, **informes** con narrativa de IA y **avisos** de sprint.

> Challenge "Panel único de liderazgo" — AI Day Flockit 2026.

## Por qué

Hoy el cumplimiento de sprint se carga a mano o desde un Excel y no se puede auditar contra Jira.
Este panel lo calcula solo, con las 5 reglas de auditoría y tests que las garantizan.
Detalle en [`docs/sdd/intent.md`](docs/sdd/intent.md).

## Cómo se construye

Spec-Driven Development: [intent](docs/sdd/intent.md) → [spec](docs/sdd/spec.md) →
[plan](docs/sdd/plan.md), con aprobación entre etapas.

| Capa | Dónde |
|---|---|
| Instrucciones para la IA | [`CLAUDE.md`](CLAUDE.md) + skills en [`.claude/skills`](.claude/skills) |
| Validación local | hooks en [`.claude/settings.json`](.claude/settings.json) (ruff, prettier, bloqueo de `.env`) |
| Validación remota | GitHub Actions en [`.github/workflows`](.github/workflows) |

## Stack

- **frontend/** — Next.js 16, React 19, Tailwind v4, shadcn/ui, modo claro/oscuro.
- **backend/** — Python 3.12, FastAPI, SQLAlchemy, Google ADK, MCP.
- **Base** — Supabase Postgres. **Deploy** — Vercel.

## Correr en local

```bash
# backend
cd backend
cp .env.example .env        # completar valores
uv sync
uv run uvicorn app.main:app --reload    # http://localhost:8000/api/health

# frontend
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev                    # http://localhost:3000
```

## Datos

El repo es público: todos los datos de ejemplo son **sintéticos**. Sin Jira configurado, la app
usa la conexión **Demo**.
