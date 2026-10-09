# Plan — Panel único de liderazgo

> Etapa 3 de SDD. Define **con qué y en qué orden** se construye lo que pide `spec.md`.
>
> Estado: **borrador para revisión** · Fecha: 2026-10-09

---

## 1. Stack

| Capa | Elección | Por qué |
|---|---|---|
| **Frontend** | **Next.js 16** (App Router) + React 19 + TypeScript estricto | Es el stack de Flock Platform: mismo modelo mental y mismas convenciones |
| UI | **shadcn/ui** + **Tailwind CSS v4** + `next-themes` (claro / oscuro) | Decisión del usuario. shadcn usa los mismos tokens que Flock (`--primary`, `--sidebar`…), así que `flock-brand.css` se integra directo |
| Gráficos | **Recharts**, vía los charts de shadcn | Es lo que usa shadcn y toma los colores de `--chart-*` |
| **Backend** | **Python 3.12 + FastAPI** + Pydantic v2 | API tipada con OpenAPI automática (el front genera sus tipos de ahí). El motor de cumplimiento queda en funciones puras fáciles de testear con pytest |
| Agentes IA | **Google ADK** (Python) | Trae loop agéntico con tools, límite de llamadas, callbacks para trazas y `adk eval` para evals. Es lo que querías probar |
| Modelo | **A definir.** Hay key de **OpenAI** cargada; ADK lo usa vía LiteLLM (`AI_MODEL=openai/<modelo>`). Gemini queda como alternativa | El proveedor y el modelo se cambian con variables de entorno, sin tocar código |
| MCP | SDK oficial `mcp` (Python), transporte HTTP montado en el mismo backend | Las mismas tools que el asistente, una sola implementación |
| **Base de datos** | **Supabase Postgres** (`panel-liderazgo`, São Paulo) | Ya creada. Se usa como Postgres puro detrás del backend, con RLS activado y sin políticas públicas |
| Acceso a datos | SQLAlchemy 2 (async) + asyncpg | Estándar. Las migraciones son **SQL plano versionado** en `backend/db/migrations/` |
| Auth | Propia: **argon2id** para contraseñas, **sesiones opacas en base** (cookie con token aleatorio y hash guardado) y **passkeys** con `webauthn` (py_webauthn) | Sesión revocable desde el servidor (un JWT no lo es). Sin depender de terceros |
| **Deploy** | **Vercel** para los dos: un proyecto para `frontend/` y otro para `backend/` (FastAPI corre nativo en Vercel) | Plataforma conocida. El backend pesa ~160 MB, dentro del límite de 250 MB |
| Tareas periódicas | **`pg_cron` + `pg_net` en Supabase** llaman cada 15 minutos a `POST /internal/jobs/notificaciones` con un secreto | El plan Hobby de Vercel solo permite un cron por día |
| Tooling | `pnpm` (front) · `uv` + `ruff` + `pytest` (back) | Rápidos y con lockfile |

> **Decidido (2026-10-09): backend en Python.** Se descartó todo en TypeScript (Next.js + Vercel AI SDK, como Flock): era un solo lenguaje, pero sin ADK ni sus evals, y repetía lo ya hecho en Flock.

---

## 2. Arquitectura

```
Navegador ──► frontend (Next.js, Vercel)
                 │  /api/*  ──rewrite──►  backend (FastAPI, Vercel)
                 │                          ├── /api/...         REST (cookie de sesión)
                 │                          ├── /mcp             MCP server (token personal)
                 │                          └── /internal/jobs/* cron (secreto)
                 │                                   │
                 │                    ┌──────────────┼───────────────┐
                 │                    ▼              ▼               ▼
                 │             Supabase Postgres   Jira Cloud      Gemini
                 │             (sa-east-1)         (solo lectura)  (vía ADK)
Claude Code / Cursor ──► /mcp
Supabase pg_cron ──► /internal/jobs/notificaciones (cada 15 minutos)
```

Decisiones clave:
- **El front llama a `/api/*` en su mismo dominio** y Next lo reescribe al backend. La cookie de sesión queda *first-party* (`SameSite=Lax`): sin problemas de cookies de terceros ni CORS abierto.
- **El front no tiene secretos.** Su única variable es `BACKEND_URL`, del lado del servidor.
- **Toda la autorización vive en el backend.** El middleware de Next solo redirige a `/login` como comodidad.
- **Los números salen de `compliance/` y `satisfaction/`**: funciones puras sin acceso a red ni a base. Las usan la API, el asistente, el MCP, los informes y las notificaciones. Hay un solo cálculo.

---

## 3. Estructura del repo

```
panel-liderazgo-flockit/
├── CLAUDE.md                     reglas del proyecto (corto)
├── .claude/
│   ├── settings.json             hooks
│   └── skills/                   expertise por tecnología (ver §9)
├── .github/workflows/            ci-backend.yml · ci-frontend.yml
├── docs/sdd/                     intent.md · spec.md · plan.md · tasks.md
├── frontend/
│   ├── src/app/
│   │   ├── (auth)/login/
│   │   ├── (app)/                layout con sidebar + header + notificaciones
│   │   │   ├── page.tsx          panel de cartera
│   │   │   ├── proyectos/[id]/
│   │   │   ├── informes/
│   │   │   ├── configuracion/    conexiones · proyectos · usuarios · umbrales · auditoria
│   │   │   └── perfil/           passkeys · tokens MCP
│   │   └── globals.css           Tailwind + shadcn + @import de flock-brand.css
│   ├── src/components/ui/        shadcn (generados)
│   ├── src/components/           brand/ · charts/ · panel/ · ...
│   ├── src/lib/api/              cliente tipado (tipos generados desde OpenAPI)
│   └── src/styles/flock-brand.css
└── backend/
    ├── app/
    │   ├── main.py               app, routers, headers de seguridad
    │   ├── config.py             settings; falla al arrancar si falta algo
    │   ├── db/                   engine, modelos, migrations/*.sql
    │   ├── auth/                 contraseñas, sesiones, passkeys, rate limit, permisos
    │   ├── jira/                 client.py (real) · demo.py (sintético) · cache.py
    │   ├── compliance/           motor de cumplimiento (puro) ← corazón
    │   ├── satisfaction/         fórmulas NPS/CSAT (puro)
    │   ├── connections/ projects/ users/ reports/ notifications/ audit/
    │   ├── ai/                   tools.py · agent.py (ADK) · narrative.py · tracing.py · guard.py
    │   └── mcp/                  server.py (mismas tools que ai/tools.py)
    ├── tests/                    unit (motor, fórmulas) + API
    ├── evals/                    golden set del asistente (ADK)
    ├── scripts/generar_hash.py
    └── pyproject.toml
```

> El prototipo de esta mañana (`panel/` en la raíz) **se elimina**. Rescatamos `sanitize.py` (defensa contra prompt injection) y la idea del dataset sintético para la conexión Demo.

---

## 4. Backend

### 4.1 Modelo de datos (Postgres)

| Tabla | Columnas principales |
|---|---|
| `users` | id, email (único), nombre, rol (`admin`/`team_manager`/`cliente`), password_hash, must_change_password, account_id (solo cliente), disabled_at, last_login_at |
| `sessions` | id, user_id, **token_hash**, expires_at, last_seen_at, ip, user_agent, revoked_at |
| `passkeys` | id, user_id, credential_id (único), public_key, sign_count, transports, nombre, last_used_at |
| `webauthn_challenges` | id, user_id, challenge, tipo, expires_at |
| `login_attempts` | email, ip, success, created_at (para el rate limit) |
| `jira_connections` | id, nombre (único), tipo (`jira`/`demo`), site, email, **token_cifrado**, token_last4, story_points_field, exclude_subtasks, status, last_checked_at, last_error |
| `accounts` | id, nombre, logo_url |
| `projects` | id, account_id, nombre, connection_id, board_id, board_name, measure_from_sprint_id, archived_at |
| `project_managers` | project_id, user_id |
| `sprints` | id, project_id, jira_sprint_id, nombre, estado, start/end/complete_date, objetivo · único (project_id, jira_sprint_id) |
| `sprint_snapshots` | sprint_id, computed_at, planificados, quemados, **detalle jsonb** (issues y motivos), is_final |
| `satisfaction_responses` | project_id, tipo (`nps`/`csat`), período (sprint o mes), nps, csat_mes, csat_progreso, csat_gestion, comentario · `CHECK` de rangos 1–10 |
| `reports` | id, tipo, audiencia, project_id/account_id, sprint_id/mes, **data jsonb**, narrativa, created_by · **inmutable** (un trigger bloquea UPDATE) |
| `notifications` | user_id, tipo, project_id, sprint_id, issue_key, **dedupe_key**, título, cuerpo, link, read_at · único (user_id, dedupe_key) |
| `settings` | clave, valor jsonb (umbrales del semáforo, alertas) |
| `audit_events` | actor_id, acción, entidad, entidad_id, diff jsonb (sin secretos), ip, created_at |
| `ai_traces` | user_id, conversación, modelo, tools jsonb, tokens in/out, costo_usd, latencia_ms |
| `mcp_tokens` | user_id, nombre, **token_hash**, last4, last_used_at, revoked_at |

Todas las tablas tienen **RLS activado sin políticas**. Solo el backend, con su rol de servidor, lee y escribe.

### 4.2 API

| Grupo | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/cambiar-password` · `POST /api/auth/passkeys/registro/{opciones,verificar}` · `POST /api/auth/passkeys/login/{opciones,verificar}` · `GET/DELETE /api/auth/passkeys` |
| Conexiones | `GET/POST /api/conexiones` · `PATCH/DELETE /api/conexiones/{id}` · `POST /api/conexiones/probar` · `GET /api/conexiones/{id}/boards` · `GET /api/conexiones/{id}/campos` |
| Cuentas y proyectos | CRUD `/api/cuentas` · CRUD `/api/proyectos` · `GET /api/proyectos/{id}/sprints` |
| Cumplimiento | `GET /api/cartera` · `GET /api/proyectos/{id}/cumplimiento?desde&hasta` · `GET /api/sprints/{id}/detalle` · `POST /api/sprints/{id}/recalcular` · `GET /api/proyectos/{id}/mensual` |
| Satisfacción | CRUD `/api/proyectos/{id}/satisfaccion` · `GET /api/proyectos/{id}/satisfaccion/resumen` |
| Informes | `POST /api/informes/preview` · `POST /api/informes` (guarda la foto) · `GET /api/informes` · `GET /api/informes/{id}` |
| Notificaciones | `GET /api/notificaciones` · `POST /api/notificaciones/{id}/leida` · `POST /api/notificaciones/leer-todas` |
| Usuarios | CRUD `/api/usuarios` (solo admin) |
| Asistente | `POST /api/asistente/mensaje` (streaming SSE) |
| Otros | `GET/PUT /api/settings/umbrales` · `GET /api/auditoria` · `GET/POST/DELETE /api/perfil/tokens-mcp` |
| Interno | `POST /internal/jobs/notificaciones` (header `X-Cron-Secret`) |

### 4.3 Motor de cumplimiento (`compliance/`)
- `calcular_sprint(sprint, issues, sprints_del_proyecto, config) -> ResultadoSprint`: implementa la spec §7.1 tal cual. Cada issue sale con su motivo.
- `agregar_mensual(resultados) -> list[ResultadoMes]`.
- `fecha_finalizacion(changelog, resolutiondate)`: la última entrada a un estado de categoría Done.
- **Sin I/O.** Recibe datos ya leídos de Jira y devuelve resultados. Los 12 casos de la spec §7.4 son tests (se escriben **primero**).
- Un sprint cerrado ya calculado se guarda en `sprint_snapshots` (`is_final = true`) y no se vuelve a leer de Jira.

### 4.4 Jira (`jira/`)
- Interfaz `FuenteJira` con dos implementaciones: `JiraCloud` (httpx, Basic con email + token, paginado, reintentos en 429) y `JiraDemo` (datos sintéticos que cubren todos los casos borde del motor, incluida una issue con prompt injection).
- Endpoints de Jira: `/rest/api/3/myself`, `/rest/api/3/field`, `/rest/agile/1.0/board`, `/board/{id}/sprint`, `/sprint/{id}/issue?expand=changelog` (con `fields` explícitos).
- Caché stale-while-revalidate en memoria y en `sprint_snapshots` (spec §6).

### 4.5 Seguridad
- **Contraseñas**: argon2id.
- **Token de sesión**: 32 bytes aleatorios; en base solo se guarda su SHA-256.
- **Tokens de Jira**: AES-256-GCM con `ENCRYPTION_KEY`, con un nonce por registro.
- **Rate limit** de login: 5 intentos por email+IP en 15 minutos, contado en `login_attempts`.
- **Headers**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy y frame-ancestors none.
- **Inputs**: validación Pydantic en todo; SQL solo parametrizado (nada de concatenar strings).
- **Logs**: nunca contienen tokens ni contraseñas; el filtro de logging los enmascara.

### 4.6 IA (`ai/`)
> **Estado (2026-10-09):** el chat (`agent.py`) corre sobre **ADK**: `LlmAgent` + `Runner`, modelo vía `LiteLlm` (`openai/<AI_MODEL>`), tope de 5 tools con `before_model_callback` y `RunConfig.max_llm_calls`. Las trazas se guardan desde el router en `ai_traces`, sin costo. `narrative.py` todavía usa el SDK de OpenAI directo. No hay vista "Uso de IA" (se descartó).

- **`tools.py`**: las 7 tools de la spec §10.1. Reciben el usuario del contexto y **filtran por sus permisos**. Devuelven datos del motor, con el texto de Jira envuelto por `guard.py`.
- **`agent.py`**: un `LlmAgent` de ADK con esas tools, instrucción en español y límite de **5 llamadas** por turno (`RunConfig.max_llm_calls`). Un solo agente: no hace falta multi-agente para consultas de solo lectura, y sumarlo agregaría costo y latencia sin beneficio.
- **`narrative.py`**: un agente redactor con `output_schema` (resumen y puntos clave). Recibe solo el JSON de números ya calculados. Si falla, el informe sale sin narrativa.
- **`tracing.py`**: un callback de ADK (`after_model_callback`) guarda tokens, costo, tools y latencia en `ai_traces`.
- **Evals**: `backend/evals/asistente.evalset.json` con al menos 15 casos sobre la conexión Demo. Se corre con `adk eval` en CI (job aparte, solo si existe el secreto `GOOGLE_API_KEY`).

### 4.7 MCP (`mcp/`)
- `MCPServer` del SDK `mcp`, transporte streamable HTTP, montado en `/mcp`.
- Registra las mismas funciones de `ai/tools.py`, todas con `readOnlyHint`.
- Autenticación: `Authorization: Bearer <token personal>`, validado contra `mcp_tokens` (hash).
- El repo incluye un `.mcp.json` de ejemplo para Claude Code.

---

## 5. Frontend

- **Marca**: `flock-brand.css` pasa a ser la fuente de tokens de shadcn. Las variables van en `:root` y `.dark`, y se mapean a Tailwind con `@theme inline`. Las clases de componentes propias (`.btn`, `.modal`, etc.) se reemplazan por los componentes de shadcn configurados con esos tokens. Quedan como utilidades de marca: `.gradient-brand`, `.module-banner` y el layout del login `flock_modern`.
- **Modo claro / oscuro**: `next-themes` con un toggle en el header (claro · oscuro · sistema), guardado por usuario en el navegador.
- **Componentes shadcn**: button, card, input, label, form, select, dialog, alert-dialog, sheet, dropdown-menu, table, tabs, badge, tooltip, skeleton, sonner (toasts), chart, sidebar, avatar y command.
- **Tablas**: un componente `DataTable` con exportación **Excel** (`.xlsx`) y **PDF** (impresión con CSS `print`), regla de Flock.
- **Datos**: Server Components para la carga inicial y TanStack Query para refrescos y mutaciones. Los tipos se generan con `openapi-typescript` desde el OpenAPI del backend.
- **Formularios**: react-hook-form + zod, validación en vivo.
- **Estados**: cada pantalla tiene esqueleto de carga, vacío y error.

---

## 6. Variables de entorno

**backend** (`backend/.env.example`):
```
DATABASE_URL=            # Supabase → Connect → Transaction pooler
SESSION_SECRET=          # 32+ bytes aleatorios
ENCRYPTION_KEY=          # 32 bytes en base64 (tokens de Jira)
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=     # uv run scripts/generar_hash.py
OPENAI_API_KEY=
GOOGLE_API_KEY=          # opcional
AI_MODEL=                # a definir, ej. openai/<modelo>
CRON_SECRET=
FRONTEND_ORIGIN=         # https://<front>.vercel.app
WEBAUTHN_RP_ID=          # dominio del front, ej. <front>.vercel.app
```

**frontend** (`frontend/.env.example`):
```
BACKEND_URL=             # solo servidor, para el rewrite de /api
```

---

## 7. Calidad — las 4 capas de Flock Tech Guides

| Capa | Qué |
|---|---|
| **1. Instrucciones** | `CLAUDE.md` corto (comportamiento, tono, tabla de modelos por subagente, mapa del repo y reglas del proyecto) + skills por tecnología en `.claude/skills/` |
| **2. Validación local (hooks)** | `PostToolUse` en Edit/Write: `ruff format` + `ruff check --fix` para `.py`, `prettier` + `eslint --fix` para `.ts`/`.tsx`. `PreToolUse`: bloquea escribir en `.env` (no en `.env.example`) |
| **3. Validación remota (CI)** | `ci-backend`: uv sync → ruff → pytest. `ci-frontend`: pnpm install → lint → typecheck → build. `evals` (opcional, con secreto) |
| **4. Planificación (SDD)** | `docs/sdd/` con intent → spec → plan → tasks y gate de aprobación entre etapas |

**Git**: ramas por fase (`feat/fase-1-auth`…), commits chicos en conventional commits en español, PR por fase con CI verde.

---

## 8. Fases de hoy

Son las ~10:30. La subida se habilita a las 12:00 y el día termina a las ~18:00. Hay unas 7 horas útiles, así que **primero todo lo P0, de punta a punta y desplegado**, y después P1 en orden de valor.

| Fase | Qué | Tiempo | Resultado verificable |
|---|---|---|---|
| **0. Setup** | Esqueleto front/back, CLAUDE.md, skills, hooks, CI, tooling (`uv`, `ruff`) | 30 min | CI verde con un endpoint `/health` y una página vacía |
| **1. Base y auth** | Migraciones, admin desde `.env`, login, sesión, rate limit, auditoría | 60 min | Tests de auth verdes y login funcionando contra Supabase |
| **2. Motor + Jira** | **Los 12 tests del motor primero**, después el motor, la fuente Demo, el cliente Jira real, el ABM de conexiones y los proyectos | 75 min | `pytest` verde con T1–T12 y la API devolviendo el cumplimiento de la Demo |
| **3. Front P0** | shadcn + marca + claro/oscuro, login flock_modern, layout, panel de cartera, detalle de proyecto, config de conexiones y proyectos | 90 min | Recorrido completo en local: login → panel → detalle → drill-down |
| **4. Informe de sprint** | Preview, narrativa IA, guardar foto, exportar PDF | 45 min | Informe guardado e inmutable |
| **5. Deploy** | 2 proyectos en Vercel, variables, smoke test | 30 min | **Link público funcionando** ← entregable mínimo |
| 6. P1 | En orden: notificaciones → NPS/CSAT → asistente + MCP + evals → usuarios → passkeys | resto | Cada uno con sus criterios de aceptación |

El detalle de tareas de cada fase va en `tasks.md` (se escribe al arrancar cada fase).

---

## 9. CLAUDE.md y skills

**`CLAUDE.md`** (menos de 80 líneas):
- reglas de comportamiento de los templates de Flock;
- tono rioplatense, directo;
- tabla de modelos por subagente: opus para diseño, sonnet para implementación, haiku para lo mecánico;
- stack en 5 líneas y mapa `frontend/` / `backend/`;
- reglas del proyecto: los números los calcula el motor y nunca el LLM, cero secretos, solo datos sintéticos, permisos en el backend, SDD obligatorio para cambios grandes.

**Skills** en `.claude/skills/`. Los nombres no chocan con tus skills globales.

| Skill | Cuándo se carga |
|---|---|
| `panel-nextjs-shadcn` | Crear pantallas o componentes del front con shadcn y los tokens de marca |
| `panel-fastapi` | Crear endpoints, dependencias de auth y modelos Pydantic |
| `panel-adk-agentes` | Tools, agente, narrativa y evals con ADK |
| `panel-mcp` | Agregar o modificar tools del MCP server |
| `panel-testing` | Escribir tests: pytest en el back, Vitest y Playwright en el front |

**Herramientas de CLI**: `bat`, `rg`, `fd`, `sd` y `eza` instaladas (2026-10-09) para cumplir la regla de los templates, además de `uv` y `ruff`.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| No tenemos un Jira real para probar | La conexión Demo cubre los casos y el cliente real se testea con respuestas grabadas. Si conseguís un sitio de prueba, se valida en vivo |
| El backend en Vercel tarda o pesa demasiado (ADK) | Plan B: el mismo backend en Render con un Dockerfile, sin cambios de código |
| Las passkeys requieren HTTPS y un dominio fijo | Funcionan en `localhost` y en el dominio de Vercel. Son P1 |
| No llegamos con todo | El orden de las fases garantiza un entregable P0 desplegado antes de tocar P1 |
| Los datos del changelog son grandes en sprints con muchas issues | Paginado, `fields` explícitos y fotos de sprints cerrados |

---

## 11. Pendiente de tu lado

- [ ] **Connection string de Supabase** (`DATABASE_URL`): Dashboard → `panel-liderazgo` → Connect → Transaction pooler. La pegás vos en `backend/.env`, no en el chat.
- [ ] **Elegir tu contraseña de admin**: el script genera el hash y vos lo pegás en `.env`.
- [ ] **Key de OpenAI** en `backend/.env` (`OPENAI_API_KEY`). El modelo se define después.
- [ ] Opcional: un sitio de Jira de prueba con un API token.
- [ ] Aprobar este plan → arranco la fase 0.
