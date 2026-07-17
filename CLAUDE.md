# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

@AGENTS.md

## Proyecto

Arcade Vault — una plataforma para jugar online y competir por la mayor cantidad de puntos (ver README.md). El código es actualmente un scaffold recién creado con `create-next-app` (App Router, TypeScript, Tailwind CSS v4); todavía no se han implementado funcionalidades del juego/vault.

## Comandos

```bash
npm run dev      # iniciar servidor de desarrollo (Turbopack)
npm run build    # build de producción
npm run start    # ejecutar el build de producción
npm run lint     # eslint (flat config vía eslint.config.mjs)
```

Todavía no hay un test runner configurado.

## Arquitectura

- El App Router vive completamente bajo `app/`. `app/layout.tsx` es el layout raíz (fuentes Geist Sans/Mono vía `next/font/google`); `app/page.tsx` es la página de inicio de ejemplo actual.
- El estilo usa Tailwind CSS v4 con la configuración CSS-first en `app/globals.css` (`@import "tailwindcss"` + `@theme inline`), no un `tailwind.config.js`.
- El alias de rutas `@/*` apunta a la raíz del repositorio (`tsconfig.json`).

## Flujo de trabajo: Spec Driven Design

Según README.md, este proyecto sigue un desarrollo basado en specs, usando `/spec` y `/spec-impl`, con las prácticas/skills de https://github.com/Klerith/fernando-skills (instaladas con `npx skills@latest add Klerith/fernando-skills`). Preferir escribir/actualizar una spec antes de implementar funcionalidades no triviales cuando estos comandos/skills estén disponibles.
