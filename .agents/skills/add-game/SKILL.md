---
name: add-game
description: Guía para agregar, portar o activar un juego jugable en Arcade Vault (catálogo `games` en Supabase, componente cliente en `components/games/`, integración en `GamePlayerClient`). Úsala cuando pidan implementar/portar/conectar un juego nuevo o uno de los placeholders actuales, con o sin código fuente en `references/started-games/`.
---

# Agregar un juego a Arcade Vault

Generaliza el trabajo hecho en `specs/05-juego-asteroides.md` (portar un juego de referencia) y `specs/06-leaderboard-y-catalogo-juegos.md` (catálogo y leaderboard reales en Supabase) para poder repetirlo con cualquier otro juego.

## Estado actual de la plataforma (verificar con `list_tables`/`execute_sql` antes de asumir que sigue igual)

El catálogo ya **no** vive en `data/games.json` (se eliminó en SPEC 06): vive en la tabla `public.games` de Supabase, leída server-side vía `lib/supabase/games.ts` (`getGames()`, `getGameById(id)`). Hoy tiene 8 filas:

| id              | title         | cat     | color   | cover          | estado                         | carpeta de referencia disponible                     |
| --------------- | ------------- | ------- | ------- | -------------- | ------------------------------ | ---------------------------------------------------- |
| `asteroides`    | ASTEROIDES    | SHOOTER | yellow  | cover-rocas    | **real** (juego + leaderboard) | `references/started-games/02-asteroids` (ya portado) |
| `bloque-buster` | BLOQUE BUSTER | ARCADE  | cyan    | cover-bricks   | placeholder (simulación falsa) | `references/started-games/04-arkanoid`               |
| `caida`         | CAÍDA         | PUZZLE  | magenta | cover-tetro    | placeholder (simulación falsa) | `references/started-games/03-tetris`                 |
| `serpentina`    | SERPENTINA    | ARCADE  | green   | cover-snake    | placeholder (simulación falsa) | ninguna hoy                                          |
| `gloton`        | GLOTÓN        | ARCADE  | yellow  | cover-glot     | placeholder (simulación falsa) | ninguna hoy                                          |
| `invasores`     | INVASORES     | SHOOTER | green   | cover-invaders | placeholder (simulación falsa) | ninguna hoy                                          |
| `ranaria`       | RANARIA       | ARCADE  | green   | cover-rana     | placeholder (simulación falsa) | ninguna hoy                                          |
| `duelo-pixel`   | DUELO PIXEL   | VERSUS  | cyan    | cover-duelo    | placeholder (simulación falsa) | ninguna hoy                                          |

Nota: el `cover` de `asteroides` quedó como `cover-rocas` (nombre heredado del slot original `rocas`, no se renombró la clase CSS, solo el `id`/`title`). No hay que "corregirlo" a menos que te lo pidan.

"Simulación falsa" = `GamePlayerClient` hace un `setInterval` que suma puntos al azar y muestra `.game-arena` (naves/enemigos CSS estáticos) en vez de un canvas real; el guardado usa `pushScore()`/`seededScores()` (localStorage, `lib/storage.ts` + `lib/scores.ts`).

## Dos orígenes posibles para el juego

- **Camino A — portar desde `references/started-games/<carpeta>/game.js`.** Hoy hay correspondencia directa para `caida` ↔ `03-tetris` y `bloque-buster` ↔ `04-arkanoid`. Cada carpeta trae `game.js`, `index.html`, a veces `style.css`/`assets/` y un `README.md` con controles — léelos antes de portar.
- **Camino B — construir desde cero.** Si el juego pedido no tiene carpeta de referencia (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`, o un id completamente nuevo), escribe la lógica directamente en TypeScript siguiendo el mismo patrón de componente. No es obligatorio que el juego venga de `references/started-games/`.

## Patrón del componente (calcado de `components/games/AsteroidsGame.tsx`)

1. Client component en `components/games/<Nombre>Game.tsx` (`"use client"`).
2. `<canvas>` con una resolución interna fija propia del juego portado (Asteroides usa 800×600), escalado por CSS simple (`width/height: 100%`) para llenar `.crt-screen` (`aspect-ratio: 4/3` en `app/globals.css`) — sin ajuste por `devicePixelRatio` (el juego original es vectorial; si el juego de referencia usa sprites/bitmaps, evalúa si hace falta DPI scaling).
3. `forwardRef` + `useImperativeHandle` exponiendo un handle imperativo con la misma forma que `AsteroidsGameHandle`: `{ pause(); resume(); reset(); }`.
4. Props de callbacks hacia afuera, mismo naming que `AsteroidsGameProps`: `onScoreChange` (siempre), `onGameOver` (siempre), y `onLivesChange`/`onLevelChange` **solo si el concepto existe en ese juego** (Tetris no tiene vidas pero sí líneas/nivel; Arkanoid sí tiene vidas). No fuerces un shape que no aplica — pero mantén el naming `on<Cosa>Change` para que quien integre el componente en `GamePlayerClient` reconozca el patrón.
5. Desactiva el overlay interno de "game over" y cualquier reinicio automático (ej. tecla Espacio) del juego original: al llegar a la condición de fin, el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único "fin de partida" visible lo maneja el modal ya existente en `GamePlayerClient`.
6. Loop propio con `requestAnimationFrame`; cancelarlo y remover listeners de teclado en el cleanup del `useEffect` de montaje.
7. Los callbacks solo deben disparar cuando el valor realmente cambia (no en cada frame), para no generar renders innecesarios del HUD externo de React.

## Integración en la plataforma

1. **Componente nuevo**: `components/games/<Nombre>Game.tsx` (patrón de arriba).
2. **`components/GamePlayerClient.tsx`**: hoy tiene una única bandera `isAsteroids = game.id === "asteroides"` que decide todo — qué componente montar dentro de `.crt-screen` (canvas real vs `.game-arena` falso), a qué handle apunta el `ref`, qué callbacks recibe el HUD externo, y si `handleSaveScore` llama `insertScore` (Supabase) o `pushScore` (localStorage). Para un juego nuevo con lógica real, añade tu propia condición (o generaliza a un `switch`/registry por `game.id` si vas a tener varios juegos reales en paralelo) y monta tu componente + handle igual que se hace con `AsteroidsGame`.
3. **Leaderboard real en Supabase (opcional)** — solo si el juego debe tener puntuaciones reales en vez de `seededScores`/`pushScore`:
   - La tabla `public.scores` ya soporta cualquier `game_id` (FK a `games.id`, sin whitelist) — **no** hace falta migración para esto.
   - `app/games/[id]/page.tsx`: extiende la condición hoy hardcodeada a `"asteroides"` para incluir el nuevo id y usar `getTopScores(id, 10)` (`lib/supabase/scores.ts`).
   - `components/SalonClient.tsx`: mismo tipo de extensión para usar `getTopScoresClient(id, 12)` (`lib/supabase/scoresClient.ts`) cuando la pestaña activa sea el nuevo id.
   - `components/GamePlayerClient.tsx`: `handleSaveScore` debe llamar `insertScore({ gameId, name, score })` en vez de `pushScore(...)` para ese id.
   - Si el juego se queda con la simulación de puntuación (no es prioridad tener leaderboard real todavía), **no toques** estos archivos ni `lib/scores.ts`/`lib/storage.ts` — ya funcionan igual para cualquier id no reconocido.
4. **Placeholder existente que se activa** (uno de los 7 ids ya listados arriba): la fila en `games` ya existe con `id`/`cover`/`color`/`cat` correctos — no hace falta migración SQL. Solo revisa que `short`/`long` describan el juego real (mismo criterio que SPEC 05: quitar menciones a mecánicas que no existan en la versión portada).
5. **Juego totalmente nuevo** (id que no existe en `games`): usa `mcp__supabase__apply_migration` para insertar la fila (`id, title, short, long, cat, cover, color, best, plays`). `cat` está restringido por `check` a `ARCADE|PUZZLE|SHOOTER|VERSUS` y `color` a `cyan|magenta|green|yellow` (mismo union type en `lib/types.ts`) — si necesitas un valor fuera de esos, hay que migrar el constraint y el tipo a la vez. Si no hay una clase `.cover-xxx` reutilizable en `app/globals.css`, agrega una nueva siguiendo el patrón de las existentes (`.cover-bg` base + reglas `::after`/`::before` decorativas).

## Qué no tocar

- `lib/supabase/client.ts`, `server.ts`, `games.ts`, `scores.ts`, `scoresClient.ts`, `scoreRows.ts` — ya son genéricos por `game.id`, no requieren cambios para soportar un juego más.
- Auth (`app/auth`, `lib/storage.ts` `getUser`/`setUser`/`clearUser`) — fuera de alcance de esta skill.
- Cualquier otro juego (real o placeholder) que no sea el que estás agregando — cada uno se toca en su propio cambio, no en bloque.

## Flujo recomendado

Portar/activar un juego casi nunca es trivial: sigue el desarrollo basado en specs de este proyecto.

1. **Paso previo obligatorio, antes de escribir cualquier archivo de spec**: lee/invoca la skill `spec` (`.claude/skills/spec/SKILL.md` + `.claude/skills/spec/template.md`) y sigue sus cuatro fases. Esa skill es la que define el proceso (aclarar antes de escribir, construir sección por sección) y `template.md` es la estructura oficial que debe usar cualquier spec nueva — no improvises un formato propio.
2. Con esa skill activa, redacta la spec numerada en `specs/` siguiendo el `template.md` al pie de la letra, usando `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-catalogo-juegos.md` como ejemplos reales del mismo tipo de trabajo (mismo nivel de detalle en Scope/Data model/Implementation plan/Acceptance criteria/Decisions/Risks).
3. Una vez aprobada la spec, usa `/spec-impl` para ejecutarla paso a paso.
4. Verificación final, igual que en SPEC 05/06: prueba manual en navegador del flujo completo (controles del juego portado, HUD interno del canvas en paralelo al HUD externo de React, pausa/reanudar, fin por 0 vidas o por botón, guardado de puntuación, catálogo `/games` y, si aplica, pestaña correspondiente en `/salon`), más `npm run build` y `npm run lint` sin errores nuevos. No hay test runner configurado en el proyecto.
