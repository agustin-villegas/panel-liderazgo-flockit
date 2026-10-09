---
name: panel-fastapi
description: Backend FastAPI del panel — endpoints, servicios, repositorios, modelos Pydantic/SQLAlchemy, auth y permisos. Usar al crear o modificar routers, servicios, migraciones SQL o dependencias en backend/app.
---

# Backend — FastAPI

## Capas (por módulo, ej. `app/projects/`)
- `router.py`: HTTP. Valida con Pydantic, chequea permisos con `Depends`, llama al servicio.
- `service.py`: clase con la lógica. Recibe repos por constructor.
- `repo.py`: clase de acceso a datos (SQLAlchemy async). Solo queries.
- `schemas.py`: modelos Pydantic de entrada/salida.

## Reglas
- Toda ruta exige sesión salvo `/api/health` y `/api/auth/login*`.
- Permisos en el backend: `Depends(require_role(...))` y filtro por proyectos del usuario.
- SQL siempre parametrizado. Nunca concatenar strings.
- Migraciones: SQL plano en `db/migrations/NNNN_nombre.sql`, con RLS activo en cada tabla nueva.
- Secretos solo desde `app.config.Settings`. Nunca loguear tokens ni contraseñas.
- Errores: `HTTPException` con mensaje claro en español; nada de stack traces al cliente.
- Cambios sensibles (conexiones, usuarios, umbrales) → `AuditService.log(...)`.
- Tests: cada endpoint nuevo con un test feliz y uno de permiso (401/403).
- Nombres cortos, type hints siempre, comentarios solo si aportan.
