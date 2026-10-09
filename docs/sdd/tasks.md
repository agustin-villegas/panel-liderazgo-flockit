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

**Nota:** el backend pesa ~282 MB en producción. El límite actual de Vercel para funciones Python es 500 MB → entra.

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
- Fuera de alcance: fotos persistentes de sprints cerrados (`sprint_snapshots`); la caché es en memoria (5 min)
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
- [x] Usuarios (Configuración → Usuarios: alta, edición, habilitar/deshabilitar): hecho. Guardas: contraseña 12+ con confirmación, no auto-deshabilitarse ni quitarse admin, siempre un admin activo. Fuera de alcance: asignar proyectos desde la UI, passkeys, umbrales y alertas editables, pestaña de auditoría, portal del cliente y filtro por cuenta (el rol `cliente` existe sin filtro por cuenta).

## Fase 5 · Deploy (en curso)

- [x] Proyectos Vercel: `panel-liderazgo-api` (backend/) y `panel-liderazgo` (frontend/)
- [x] Variables de entorno de producción cargadas (sin exponer valores)
- [ ] `vercel deploy --prod` backend y frontend (lo corre el usuario: requiere su aprobación)
- [ ] Smoke test en producción

## Tablero de Jira (spec §8.5.b) ✅

- [x] Carriles por categoría de Jira + bloqueado por nombre de estado o flag
- [x] Día X de Y hábiles; % de tiempo vs % de tarjetas finalizadas
- [x] Tarjetas de resumen, torta con selector (estado / prioridad / tipo)
- [x] Kanban de 4 columnas y tabla con filtros (responsable, tipo, texto) + export
- [x] Ficha de issue; refresco automático cada 60 s (caché de 60 s en el backend)
- [x] Fuente Demo con prioridades, tipos, etiquetas y bloqueos
- [x] Tests: carriles, días hábiles, totales y permisos (57 verdes)

## Fase 4 · Informe de sprint con IA ✅

- [x] `POST /api/informes/preview`: números del motor + narrativa (OpenAI `gpt-5.4-mini`, configurable con `AI_MODEL`)
- [x] La IA recibe valores ya calculados y formateados; títulos de Jira marcados como dato externo
- [x] Probado contra OpenAI real: ignora el intento de prompt injection y no recalcula números
- [x] Sin key o si la IA falla, el informe sale igual (aviso + lectura manual)
- [x] Narrativa editable antes de guardar; audiencia equipo / cliente / gerencia
- [x] Guardado = foto inmutable (trigger en Postgres bloquea UPDATE); historial y PDF
- [x] Migración `0003_informes` aplicada; 67 tests verdes
