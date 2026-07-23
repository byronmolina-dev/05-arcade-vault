# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

@AGENTS.md

## Proyecto

Arcade Vault — una plataforma para jugar online y competir por la mayor cantidad de puntos (ver README.md). Ya no es un scaffold: hay landing, catálogo de juegos y salón de puntuaciones conectados a Supabase, auth básica, envío de contacto por email, y varios juegos jugables de verdad (canvas + `requestAnimationFrame`).

Todavía no hay un test runner configurado. Verificación = `npm run build` + `npm run lint` sin errores nuevos, más prueba manual en navegador (ver skill `add-game` para el checklist al tocar un juego).

## Skills

- Usa siempre `/frontend-design` para diseñar o rediseñar interfaz de usuario.
- Usa `/add-game` para implementar, portar o activar un juego del catálogo (placeholder → jugable real). Documenta el estado actual de cada juego, el patrón de componente (`forwardRef` + handle `pause/resume/reset`, callbacks `onScoreChange`/`onGameOver`/...) y cómo integrarlo en `GamePlayerClient`.
- `/spec` y `/spec-impl` para el flujo de specs (ver abajo).

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`): decide qué juego encaja en el catálogo (activar un placeholder existente vs. crear uno nuevo), ponderando balance de categorías, factibilidad técnica, prioridad a placeholders y novedad competible. Mantiene memoria de lo ya sugerido en `references/sugerencias-games-todo.md` (append-only, no repite propuestas) y redacta un borrador de spec en `specs/` (`Status: Draft`) listo para refinar con `/spec`. No implementa código ni toca Supabase — es el paso previo al flujo `/spec` → `/spec-impl` → `add-game`.

## Arquitectura

- El App Router vive completamente bajo `app/`. `app/layout.tsx` es el layout raíz (fuentes Geist Sans/Mono vía `next/font/google`).
- El estilo usa Tailwind CSS v4 con la configuración CSS-first en `app/globals.css` (`@import "tailwindcss"` + `@theme inline`), no un `tailwind.config.js`. La estética es "CRT/arcade" (`.crt-screen`, clases `.cover-*` por juego para las portadas del catálogo).
- El alias de rutas `@/*` apunta a la raíz del repositorio (`tsconfig.json`).
- **Datos**: el catálogo de juegos (`public.games`) y las puntuaciones (`public.scores`) viven en Supabase (`lib/supabase/`: `client.ts`/`server.ts` clientes, `games.ts`, `scores.ts`/`scoresClient.ts`, `scoreRows.ts` helpers de formato/ranking). `lib/types.ts` define `Game`, `ScoreRow`, `User` y `REAL_SCORE_GAME_IDS` (juegos con leaderboard real en Supabase vs. simulación en `localStorage` vía `lib/storage.ts`/`lib/scores.ts`).
- **Juegos** (`components/games/*Game.tsx`): componentes cliente con canvas propio, montados condicionalmente en `components/GamePlayerClient.tsx` según `game.id`. Reales/jugables hoy: `asteroides`, `tetris`, `bloque-buster`, `serpentina` (todos con leaderboard real en Supabase). Placeholders sin jugabilidad (simulación de puntaje): `gloton`, `invasores`, `ranaria`, `duelo-pixel`. Ver `references/implemented.games.md` para la tabla completa y `.claude/skills/add-game/SKILL.md` para el proceso de activarlos.

## Rutas

| Ruta                | Archivo                | Descripción                                                                                                |
| ------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/`                 | `app/page.tsx`         | Home                                                                                                       |
| `/about`            | `app/about`            | Acerca de                                                                                                  |
| `/auth`             | `app/auth`             | Login simulado (ver `lib/storage.ts`)                                                                      |
| `/games`            | `app/games`            | Catálogo de juegos se debe revisar en 'references/implemented-games.md los juegos que estan implementados' |
| `/games/[id]`       | `app/games/[id]`       | Detalle de un juego                                                                                        |
| `/games/[id]/jugar` | `app/games/[id]/jugar` | Reproductor del juego                                                                                      |
| `/salon`            | `app/salon`            | Salón de puntuaciones (leaderboards)                                                                       |
| `/api/contact`      | `app/api/contact`      | Envío de email de contacto vía Resend                                                                      |

## Flujo de trabajo: Spec Driven Design

Este proyecto sigue un desarrollo basado en specs, usando `/spec` y `/spec-impl`, con las prácticas/skills de https://github.com/Klerith/fernando-skills (instaladas con `npx skills@latest add Klerith/fernando-skills`). Las specs numeradas viven en `specs/` (01 a 09 ya implementadas: pantallas MVP, home/about, contacto, conexión Supabase, y los cuatro juegos reales listados arriba). Escribir/actualizar una spec antes de implementar funcionalidades no triviales, especialmente para juegos nuevos (ver skill `add-game`, que exige pasar primero por `/spec`).
