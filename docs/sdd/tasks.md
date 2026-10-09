# Tasks

> Etapa 4 de SDD. Checklist por fase; se completa al arrancar cada una.

## Fase 0 · Setup ✅

- [x] Limpiar prototipo de la mañana
- [x] Backend: uv, FastAPI, `/api/health` + test, ruff
- [x] Frontend: Next.js 16, shadcn (base-ui), tokens de marca Flock, DM Sans, claro/oscuro, rewrite `/api`
- [x] `CLAUDE.md` con convenciones (nombres cortos, comentarios breves, OOP)
- [x] Skills: `panel-nextjs-shadcn`, `panel-fastapi`, `panel-adk-agentes`, `panel-mcp`, `panel-testing`
- [x] Hooks: formateo (ruff / prettier + eslint) y bloqueo de `.env`
- [x] CI: `ci-backend`, `ci-frontend`
- [x] Herramientas CLI: bat, fd, sd, eza, uv, ruff

**Nota:** el backend con dependencias pesa ~288 MB (litellm). Supera los 250 MB de Vercel →
evaluar en fase 5 (plan B: Render).

## Fase 1 · Base y auth ✅

- [x] Settings con validación al arrancar (hash argon2id obligatorio, secretos con largo mínimo)
- [x] Migración `0001_auth`: users, sessions, login_attempts, audit_events (RLS on) — aplicada en Supabase
- [x] `Passwords` (argon2id, tiempo constante si el usuario no existe) + `scripts/generar_hash.py`
- [x] Bootstrap del admin desde `.env`
- [x] `SessionService`: sesiones opacas, hash en base, deslizantes, revocables
- [x] `LoginLimiter`: 5 fallos / 15 min por email+IP; un login OK resetea
- [x] Endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [x] Errores tipados (`AppError` → JSON) y headers de seguridad
- [x] Auditoría: login, login fallido, bloqueo, logout (sin secretos)
- [x] 14 tests verdes
- [x] Smoke test contra Supabase: login, me, logout y auditoría OK

## Fase 2 · Motor + Jira ✅

- [x] Motor de cumplimiento (puro): sprint, persona, mes; regla de no duplicación
- [x] Tests T1–T12 de la spec (incluida la regresión con la planilla histórica) — escritos antes del motor
- [x] Mapeo de Jira: última finalización desde el changelog, sprints desde `closedSprints` + `sprint`
- [x] Fuentes: `JiraCloud` (paginado, reintentos en 429, errores claros) y `JiraDemo` (4 boards sintéticos)
- [x] Tokens cifrados con AES-256-GCM; la API nunca devuelve el token
- [x] ABM de conexiones (prueba obligatoria antes de guardar, detección del campo de SP)
- [x] Cuentas y proyectos con Team Managers asignados (cada uno ve solo lo suyo)
- [x] API: `/api/cartera`, `/api/proyectos/{id}/cumplimiento`, detalle auditable por sprint, recalcular
- [x] Migración `0002` aplicada en Supabase + smoke test contra la base real
- [x] 48 tests verdes
- [ ] Pendiente: fotos persistentes de sprints cerrados (`sprint_snapshots`); hoy la caché es en memoria (5 min)
- [ ] Pendiente: validar `JiraCloud` contra un sitio real (hoy probado con fakes)

## Fase 3 · Frontend P0 ✅

- [x] Login `flock_modern` (panel de marca animado + formulario con validación en vivo)
- [x] `proxy.ts` (Next 16): sin sesión → `/login`
- [x] Layout con sidebar shadcn, modo claro/oscuro, menú de usuario y logout
- [x] Panel de cartera: KPIs, cards con semáforo, tendencia de 6 sprints, sprint activo
- [x] Detalle de proyecto: gráfico plan vs quemado + % · tablas por sprint, persona y mes
- [x] Auditoría por sprint (sheet): cada issue con motivo y sprints por los que pasó
- [x] Configuración: ABM de conexiones (prueba obligatoria) y proyectos (desplegables, sin ids)
- [x] Export Excel (CSV con BOM) y PDF (impresión por sección) en todas las tablas
- [x] Tipos de la API generados desde OpenAPI (`pnpm gen:api`)
- [x] Probado de punta a punta con navegador real (Playwright): login, cartera, detalle, auditoría, dark, mobile
- [ ] Pendiente: asignar Team Managers desde la UI (falta ABM de usuarios, P1)
