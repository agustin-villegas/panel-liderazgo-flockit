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
