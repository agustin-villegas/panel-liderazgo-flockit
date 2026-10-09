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

## Fase 1 · Base y auth

- [ ] Settings completos con validación al arrancar
- [ ] Migración `0001`: users, sessions, login_attempts, audit_events (RLS on)
- [ ] `PasswordService` (argon2id) + `scripts/generar_hash.py`
- [ ] Bootstrap del admin desde `.env`
- [ ] `SessionService`: crear / validar / revocar, cookie segura
- [ ] Rate limit de login (5 / 15 min por email+IP)
- [ ] Endpoints: login, logout, me
- [ ] Headers de seguridad
- [ ] Tests: login ok, credenciales malas (mensaje genérico), bloqueo, 401 sin sesión
