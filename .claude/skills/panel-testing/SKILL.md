---
name: panel-testing
description: Cómo escribir tests en el panel — pytest para el backend (motor, fórmulas, API) y Vitest/Playwright para el frontend. Usar al escribir o corregir tests, o al implementar lógica del motor de cumplimiento.
---

# Testing

## Backend (pytest)
- Motor y fórmulas: **test primero**. Los casos T1–T12 de `docs/sdd/spec.md` §7.4 son obligatorios.
- Un test = un comportamiento. Nombre: `test_<qué>_<resultado>` (`test_issue_dos_sprints_quema_una_vez`).
- Datos con builders chicos (`issue(sp=5, done="2026-10-03")`), no fixtures gigantes.
- API: `TestClient` + base de test; siempre un caso de permiso (401/403).
- Jira real: respuestas grabadas, nunca red en CI.

## Frontend
- Vitest para utilidades y hooks. Playwright para el recorrido login → panel → detalle.

## Regla
- Bug encontrado → primero el test que lo reproduce, después el fix.
