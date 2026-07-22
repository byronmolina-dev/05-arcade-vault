# SPEC 07 — Juego Tetris (renombre de slot + adaptación del juego de referencia)

> **Status:** Approved
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales)
> **Date:** 2026-07-22
> **Objective:** Renombrar el slot placeholder `caida` → `tetris` en el catálogo de Supabase (`public.games`) y adaptar el juego de referencia `references/started-games/03-tetris/game.js` a un componente cliente `components/games/TetrisGame.tsx`, con puntuación, líneas y nivel reales integrados al HUD, y leaderboard real en Supabase (`public.scores`, `game_id: "tetris"`) igual que Asteroides.

## Scope

**In:**

- Migración SQL (vía `mcp__supabase__apply_migration`) que renombra el registro existente en `public.games`: `id: "caida"` → `"tetris"`, `title: "CAÍDA"` → `"TETRIS"`. `short`, `long`, `cat` (`PUZZLE`), `cover` (`cover-tetro`), `color` (`magenta`), `best` y `plays` no cambian (el copy actual ya describe el juego real sin menciones que corregir).
- Puerto a TypeScript del juego de referencia como componente cliente `components/games/TetrisGame.tsx`: mismo modelo de tablero (`board` 10×20), las 8 piezas (`PIECES`/`COLORS`, incluida la pieza "N"/tuerca), rotación con wall kicks (`rotateCW`, `tryRotate`), colisiones (`collide`), soft drop / hard drop, pieza fantasma (`ghostY`), limpieza de líneas (`clearLines`), puntuación (`LINE_SCORES` × nivel), y nivel/velocidad (`level = floor(lines/10)+1`, `dropInterval = max(100, 1000-(level-1)*90)`).
- El componente renderiza en un único `<canvas>` de resolución interna fija 800×600 (mismo tamaño que `AsteroidsGame`), escalado con CSS (`width/height: 100%`) para llenar `.crt-screen` (`aspect-ratio: 4/3`). El tablero (300×600 en el original) se dibuja a la izquierda; a la derecha, un panel interno propio (fondo + texto) replica el sidebar original: `SCORE`/`LINES`/`LEVEL` y la vista previa de la siguiente pieza (`next`). No se usa un segundo elemento `<canvas>` como en el original — todo se dibuja en el mismo canvas.
- El componente expone hacia `app/games/[id]/jugar/page.tsx` (vía `GamePlayerClient`) el estado real de partida (`score`, `lines`, `level`, `gameOver`) por callbacks, y acciones imperativas (`pause`/`resume`, `reset`) controladas desde los botones ya existentes (PAUSA/REANUDAR, FIN) — mismo patrón que `AsteroidsGameHandle`.
- Se desactiva el atajo de teclado interno `P` (pausa) y el overlay interno "GAME OVER"/reinicio del juego original: la pausa se controla solo desde el handle (`pause()`/`resume()`); al perder (pieza nueva colisiona al aparecer) o al presionar "FIN", el juego se congela (deja de actualizar, sigue dibujando el último frame) y dispara `onGameOver`. El modal ya existente en `GamePlayerClient` (puntaje final, iniciales, "GUARDAR PUNTUACIÓN") es el único que maneja el fin de partida.
- `components/GamePlayerClient.tsx`: generaliza la bandera única `isAsteroids` para reconocer también `game.id === "tetris"` (constante compartida `REAL_SCORE_GAME_IDS = ["asteroides", "tetris"]` en `lib/types.ts`, usada aquí y en los dos puntos siguientes). Monta `TetrisGame` dentro de `.crt-screen` cuando corresponde, sincroniza el HUD externo, y cablea PAUSA/REANUDAR/FIN al handle.
- HUD externo (`GamePlayerClient`): el cuarto stat (hoy fijo en "Vidas") pasa a mostrar "Líneas" con el valor real de `TetrisGame` cuando `game.id === "tetris"` (nuevo callback `onLinesChange`); para Asteroides y los 6 placeholders restantes sigue mostrando "Vidas" exactamente igual que hoy.
- "GUARDAR PUNTUACIÓN" para `tetris` llama a `insertScore({ gameId: "tetris", name, score })` (Supabase), igual que Asteroides.
- `app/games/[id]/page.tsx`: extiende la condición de leaderboard real (hoy solo `"asteroides"`) para incluir `"tetris"` — usa `getTopScores("tetris", 10)`, con el mismo fallback de "Mejor global" (`MAX(score)` si hay filas, si no `game.best` estático) y los mismos estados vacío/error.
- `components/SalonClient.tsx`: misma extensión — cuando la pestaña activa es `"tetris"`, usa `getTopScoresClient("tetris", 12)` con los mismos estados de carga/vacío/error que ya existen para `"asteroides"`.

**Out of scope (para futuras specs):**

- Controles táctiles/on-screen para móvil.
- Escalado del canvas por `devicePixelRatio`.
- Implementar los 6 placeholders restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`); siguen con la simulación falsa actual.
- Cualquier cambio a `lib/supabase/client.ts`, `server.ts`, `games.ts`, `scores.ts`, `scoresClient.ts`, `scoreRows.ts` — ya son genéricos por `game.id`, no requieren cambios.
- Auth real, o vincular `scores.user_id` — el guardado sigue siendo anónimo (campo `name` de texto libre), igual que Asteroides.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**Migración SQL** (`public.games`, vía `mcp__supabase__apply_migration`):

```sql
update public.games
set id = 'tetris', title = 'TETRIS'
where id = 'caida';
```

No hace falta migración en `public.scores`: la tabla ya acepta cualquier `game_id` (FK a `games.id`, sin whitelist) y no tiene filas con `game_id = 'caida'` hoy.

**`lib/types.ts`** — nueva constante compartida (reemplaza el `isAsteroids`/`isAsteroides` hardcodeado en los tres archivos que lo usan):

```ts
export const REAL_SCORE_GAME_IDS = ["asteroides", "tetris"] as const;
```

**`components/games/TetrisGame.tsx`** (nuevo, mismo patrón que `AsteroidsGame.tsx`):

```ts
export type TetrisGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type TetrisGameProps = {
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export default function TetrisGame(
  props: TetrisGameProps,
  ref: Ref<TetrisGameHandle>,
): JSX.Element;
```

El tablero (`board: number[][]`, 10×20), la pieza actual/siguiente (`current`, `next`), y el estado del loop (`score`, `lines`, `level`, `paused`, `gameOver`) viven como variables/refs locales dentro del componente — no se exportan; el componente los traduce a los cuatro callbacks en cada frame que cambian, y a `onGameOver` al perder o al invocar `reset()`/`pause()` desde afuera.

## Implementation plan

1. Migración SQL: `update public.games set id = 'tetris', title = 'TETRIS' where id = 'caida'`. El sitio sigue funcional: `/games` y `/salon` ahora muestran "TETRIS" en vez de "CAÍDA" (sigue siendo la simulación falsa, sin juego real todavía); `/games/tetris` reemplaza a `/games/caida` automáticamente porque el catálogo se lee genéricamente desde Supabase (no hay ningún `"caida"` hardcodeado en el código).

2. Agregar `REAL_SCORE_GAME_IDS = ["asteroides"] as const` a `lib/types.ts` y refactorizar los tres sitios que hoy comparan contra `"asteroides"` a mano (`GamePlayerClient.tsx`, `app/games/[id]/page.tsx`, `SalonClient.tsx`) para usar esta constante. Sin cambio de comportamiento — la constante todavía no incluye `"tetris"`.

3. Portar `game.js` a `components/games/TetrisGame.tsx`: tablero (`board` 10×20), las 8 piezas, `rotateCW`/`tryRotate` con wall kicks, `collide`, soft/hard drop, `ghostY`, `clearLines`, puntuación y nivel/velocidad. Compila de forma aislada; todavía no se importa desde ninguna página.

4. Agregar a `TetrisGame` las props (`onScoreChange`, `onLinesChange`, `onLevelChange`, `onGameOver`) y el handle imperativo (`pause`, `resume`, `reset`) vía `forwardRef`/`useImperativeHandle`; desactivar el atajo interno `P` y el overlay "GAME OVER" del original — al perder (pieza nueva colisiona al aparecer), el loop se congela e invoca `onGameOver`. Sigue sin montarse en ninguna página.

5. Implementar el render en canvas único 800×600: tablero a la izquierda, panel interno propio (SCORE/LINES/LEVEL + vista previa de la siguiente pieza) a la derecha, reemplazando el sidebar DOM y el segundo `<canvas id="next-canvas">` del original.

6. Agregar `"tetris"` a `REAL_SCORE_GAME_IDS`. Actualizar `GamePlayerClient.tsx`: montar `TetrisGame` en `.crt-screen` cuando `game.id === "tetris"`, mostrar "Líneas" en el cuarto stat del HUD externo solo para este id, cablear PAUSA/REANUDAR/FIN al handle, y hacer que "GUARDAR PUNTUACIÓN" llame `insertScore({ gameId: "tetris", name, score })`. `/games/tetris/jugar` queda jugable de verdad con guardado real en Supabase.

7. Actualizar `app/games/[id]/page.tsx` y `components/SalonClient.tsx` para que, usando `REAL_SCORE_GAME_IDS` (ya incluye `"tetris"`), consulten `getTopScores("tetris", 10)` / `getTopScoresClient("tetris", 12)` en vez de `seededScores(...)`, con el mismo fallback de "Mejor global" y los mismos estados vacío/error que ya existen para Asteroides.

8. Pasada final: verificación manual en navegador (mover/rotar/soft drop/hard drop con teclado, pieza fantasma, limpiar líneas y subir de nivel, perder por pieza bloqueada arriba, pausar/reanudar con los botones externos, "FIN", guardar puntuación y verla reflejada en `/games/tetris` y en la pestaña "TETRIS" de `/salon`, HUD interno del canvas en paralelo al externo), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] En `public.games` ya no existe ningún registro con `id: "caida"`; existe un registro `id: "tetris"`, `title: "TETRIS"`, con el resto de campos (`short`, `long`, `cat`, `cover`, `color`, `best`, `plays`) sin cambios.
- [ ] `/games` y `/salon` muestran "TETRIS" en el catálogo/pestañas, sin ninguna referencia residual a "CAÍDA".
- [ ] `/games/tetris/jugar` renderiza el canvas real del juego (tablero, pieza actual, panel interno SCORE/LINES/LEVEL + siguiente pieza) dentro de `.crt-screen`, en vez del placeholder `.game-arena` anterior.
- [ ] `←`/`→` mueven la pieza, `↑`/`X` rotan (con wall kicks), `↓` hace soft drop, `Espacio` hace hard drop — igual que el juego de referencia.
- [ ] La pieza fantasma se muestra en la posición de aterrizaje proyectada.
- [ ] Completar una fila la limpia y baja las de arriba; la puntuación sube según `LINE_SCORES` × nivel; el hard drop y el soft drop suman puntos por celda/fila igual que el original.
- [ ] El nivel sube cada 10 líneas y la velocidad de caída aumenta según la fórmula original (`max(100, 1000-(level-1)*90)`).
- [ ] El panel HUD externo (Puntuación, Líneas, Nivel) refleja en tiempo real el `score`, `lines` y `level` reales del juego — no la simulación aleatoria anterior.
- [ ] El panel interno del canvas (SCORE/LINES/LEVEL + siguiente pieza) sigue visible y funcional en paralelo al HUD externo.
- [ ] La tecla `P` ya no pausa el juego; "PAUSA" (botón externo) congela el juego (nada se mueve) y muestra el overlay "EN PAUSA" existente; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar a que una pieza se bloquee arriba del tablero.
- [ ] Que una pieza nueva colisione al aparecer (o presionar "FIN") congela el canvas y abre el modal existente de fin de partida — el overlay interno "GAME OVER" del juego original ya **no** aparece.
- [ ] "GUARDAR PUNTUACIÓN" en el modal inserta una fila real en `public.scores` con `game_id: "tetris"` (vía `insertScore`), igual que Asteroides.
- [ ] `/games/tetris` muestra el leaderboard real (top 10 por score descendente) tras guardar una puntuación, y "Mejor global" refleja el `MAX(score)` real; antes de la primera puntuación guardada muestra el estado vacío existente.
- [ ] La pestaña "TETRIS" en `/salon` muestra las mismas puntuaciones reales guardadas en `public.scores` (podio + tabla), con los mismos estados de carga/vacío/error que ya existen para Asteroides.
- [ ] "JUGAR DE NUEVO" reinicia el componente a un estado limpio (score 0, líneas 0, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los otros 6 placeholders (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) y Asteroides siguen funcionando exactamente igual que antes (HUD con "Vidas", simulación falsa o leaderboard real según corresponda).
- [ ] `npm run build` completa sin errores nuevos relacionados a los archivos agregados/modificados.
- [ ] `npm run lint` no reporta errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** renombrar el slot existente `caida` → `tetris` (mismo registro, mismo `cover`/`color`/`cat`/copy). Decisión explícita del usuario, mismo criterio que `rocas` → `asteroides` en SPEC 05.
- **No:** crear un slot nuevo `tetris` dejando `caida` sin usar. Duplicaría la entrada para el mismo juego.
- **Yes:** nombrar el componente `TetrisGame.tsx` (por el juego real portado), consistente con que ahora `id`/`title` también son "tetris" — sin la disonancia que tenía Asteroides con `cover-rocas`.
- **Yes:** canvas único 800×600 con panel interno (tablero + sidebar SCORE/LINES/LEVEL/next dibujados juntos) en vez de pillarboxing con barras vacías. Decisión explícita del usuario — aprovecha el espacio 4:3 de `.crt-screen` sin tocar esa clase compartida ni el layout de otros juegos.
- **No:** cambiar el `aspect-ratio` de `.crt-screen` para este juego. Es una clase compartida por todos los juegos; cambiarla afectaría a Asteroides y a los placeholders.
- **Yes:** reemplazar el stat "Vidas" del HUD externo por "Líneas" cuando el juego activo sea `tetris`. Decisión explícita del usuario — Tetris no tiene vidas; mismo patrón condicional (`on<Cosa>Change`) que ya anticipa la skill `add-game`.
- **No:** dejar "Vidas" fijo sin significado, o quitar el cuarto stat por completo. Se descartaron por mostrar información falsa o dejar el HUD asimétrico frente a los demás juegos.
- **Yes:** leaderboard real en Supabase para `tetris` (`insertScore`/`getTopScores`/`getTopScoresClient`), igual que Asteroides. Decisión explícita del usuario — la tabla `scores` ya soporta cualquier `game_id` sin migración.
- **No:** simulación local (`pushScore`/`seededScores`) para `tetris`. Se descartó a favor del leaderboard real.
- **Yes:** introducir `REAL_SCORE_GAME_IDS` en `lib/types.ts` para reemplazar los tres `=== "asteroides"` hardcodeados dispersos en `GamePlayerClient.tsx`, `app/games/[id]/page.tsx` y `SalonClient.tsx`. Con dos juegos reales en paralelo, una constante compartida evita repetir la misma condición `=== "asteroides" || === "tetris"` tres veces.
- **No:** generalizar a un registry/switch más grande (ej. mapeo `id → componente/config`) para soportar N juegos reales futuros. Se descarta por ahora — con solo 2 juegos reales, una constante simple es suficiente; se revisará si un tercer juego real lo justifica.
- **Yes:** deshabilitar el atajo de teclado interno `P` del original; la pausa se controla solo desde el botón externo vía el handle. Decisión explícita del usuario — mismo patrón que Asteroides (que no tiene atajo interno de pausa), evita mantener sincronizados dos caminos de pausa.
- **No:** mantener `P` como atajo adicional. Se descartó por el riesgo de desincronizar el estado de pausa de React con el estado interno del canvas.
- **Yes:** portar las 8 piezas tal cual (incluida la "N"/tuerca no estándar), fiel a lo que hace `game.js` realmente. Decisión explícita del usuario, ignorando la descripción desactualizada del README ("7 piezas estándar").
- **No:** recortar a 7 piezas estándar. Se descartó para no alterar la lógica ya funcional del juego de referencia.
- **Yes:** desactivar el overlay interno "GAME OVER" y el reinicio automático, dejando que el modal ya existente de `GamePlayerClient` maneje el fin de partida — mismo criterio que Asteroides (SPEC 05).
- **No:** mantener el overlay interno además del modal del sitio. Generaría dos pantallas de "fin de juego" superpuestas.
- **Yes:** sin controles táctiles ni ajuste por `devicePixelRatio` — mismo criterio que Asteroides (el juego es vectorial, sin bitmaps).
- **Yes:** sin tests automatizados, verificación manual + `npm run build`/`npm run lint`. No hay test runner configurado en el proyecto.

## Risks

| Risk                                                                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renombrar `id` de `"caida"` a `"tetris"` podría dejar un enlace o cache roto si algo referenciara `/games/caida` (ej. bookmark, enlace compartido)                                                                                         | Se verificó que no hay ningún `"caida"` hardcodeado en el código (búsqueda previa sin resultados); el catálogo genera todos los enlaces dinámicamente desde `getGames()`/`getGameById()`, así que no hay referencias internas que romper. Enlaces externos antiguos a `/games/caida` quedarían en 404, riesgo aceptado (mismo caso que `rocas` en SPEC 05). |
| Dibujar tablero + panel interno (SCORE/LINES/LEVEL + siguiente pieza) en un único canvas 800×600 es más código de layout que el original (dos elementos DOM separados) y podría desalinearse o recortarse en la escala CSS a `.crt-screen` | Se define un layout fijo en coordenadas del canvas interno (ej. tablero en `x: 0-300`, panel en `x: 320-800`) antes de portar la lógica de dibujo, verificado visualmente en el paso 5 del plan antes de cablear props/handle.                                                                                                                              |
| El loop `requestAnimationFrame` de `TetrisGame` compite por recursos con el ciclo de renderizado de React (re-renders del HUD externo en cada cambio de `score`/`lines`/`level`)                                                           | Los callbacks (`onScoreChange`, etc.) solo disparan `setState` cuando el valor realmente cambia, no en cada frame — mismo patrón ya usado en `AsteroidsGame`.                                                                                                                                                                                               |
| `INSERT` público sin auth en `scores` permite que cualquiera con la publishable key inserte puntuaciones falsas o en volumen para `"tetris"`                                                                                               | Riesgo ya aceptado y documentado en SPEC 06 para el esquema de `scores` en general (mismo nivel de confianza que Asteroides); no se mitiga en esta spec.                                                                                                                                                                                                    |
| Reemplazar "Vidas" por "Líneas" en el HUD externo toca una condición ya compartida por 7 juegos (`GamePlayerClient`) — un error ahí podría afectar el HUD de Asteroides o los placeholders                                                 | Se usa la constante `REAL_SCORE_GAME_IDS` con una condición explícita por `game.id === "tetris"` solo para el label del cuarto stat, verificado manualmente para los 8 juegos en el paso 8 del plan antes de dar la spec por completa.                                                                                                                      |

## What is **not** in this spec

- Controles táctiles/on-screen para móvil.
- Escalado del canvas por `devicePixelRatio`.
- Implementar los 6 placeholders restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Auth real o `scores.user_id`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
