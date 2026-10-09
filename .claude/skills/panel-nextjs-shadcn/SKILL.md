---
name: panel-nextjs-shadcn
description: Pantallas y componentes del frontend con Next.js 16 App Router, shadcn/ui (base-ui) y los tokens de marca Flock. Usar al crear o modificar páginas, layouts, componentes, formularios, tablas o gráficos en frontend/.
---

# Frontend — Next.js + shadcn

## Antes de escribir
- Next 16 tiene cambios: leer la guía en `node_modules/next/dist/docs/` si dudás de una API.
- shadcn usa **base-ui**: composición con `render={<Comp />}`, no `asChild`.
- Componentes nuevos: `pnpm dlx shadcn@latest add <nombre>`. No editar `components/ui/` salvo para tokens.

## Estructura
- `src/app/(auth)` login · `src/app/(app)` pantallas con sidebar.
- `src/components/<dominio>/` componentes propios (`panel/`, `charts/`, `brand/`).
- `src/lib/api/` cliente tipado. Nunca `fetch` suelto en componentes.

## Reglas
- Server Components por defecto; `"use client"` solo si hay estado o eventos.
- Colores solo con tokens: `bg-primary`, `text-muted-foreground`, `bg-ok-bg text-ok-fg`.
  Nunca hex ni `text-violet-600`. Gradiente: `bg-brand`, `text-brand`, `.banner`.
- Semáforo y estados: color + texto + número, nunca color solo.
- Cada pantalla: esqueleto (`Skeleton`), vacío y error.
- Formularios: react-hook-form + zod, validación en vivo, errores bajo el campo.
- Tablas: `DataTable` con export Excel y PDF.
- Accesible: labels, `aria-*`, foco visible, navegable con teclado.
- Nombres cortos, componentes chicos, props tipadas con `type Props`.
