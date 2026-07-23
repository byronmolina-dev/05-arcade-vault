# SPEC 15 — Juego Prisma (Match-3)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, ajuste `devicePixelRatio`), SPEC 09 (Serpentina — generalizó el 4to stat de `GamePlayerClient` con `FourthStat`, y patrón de acumulador delta-time para lógica desacoplada del render)
> **Date:** 2026-07-23
> **Objective:** Crear desde cero el componente `components/games/PrismaGame.tsx` — un Match-3 en tablero 8×8 donde intercambiar gemas adyacentes forma líneas de 3+ del mismo color, con cascadas por gravedad y un temporizador que drena más rápido por nivel — como juego PUZZLE **nuevo** (`id: "prisma"`, no un placeholder existente) con leaderboard real en Supabase.

## Section 1 — Por qué existe esta spec

`prisma` es un `id` **nuevo**: a diferencia de los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`), no existe todavía una fila en `public.games`, así que esta spec sí requiere una migración `INSERT` (documentada como paso pendiente para quien implemente, no ejecutada por el planner) y una clase `.cover-prisma` en `app/globals.css`. Se elige PUZZLE porque es de las categorías más flacas del catálogo (solo Tetris es real), y Match-3 no se solapa con ninguna mecánica ya cubierta: Tetris es caída de tetrominós + line-clear; Prisma es intercambio de gemas + cascadas por gravedad.

## Scope

**In:**

- Construir `components/games/PrismaGame.tsx` desde cero: Match-3 clásico sobre un tablero 8×8 de gemas, canvas de resolución interna fija 800×600 con el tablero de 8×8 celdas de 64px (512×512) centrado, con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`).
- 5 tipos de gema, dibujadas 100% vectorialmente (sin assets bitmap), cada tipo con un color y una forma distinguibles: 4 usan la paleta CRT (`cyan`, `magenta`, `green`, `yellow`) y el 5to es un neutro claro (blanco/gris claro). Formas distintas por tipo (ej. círculo, rombo, cuadrado, triángulo, hexágono) para accesibilidad además del color.
- Tablero inicial generado **sin** matches preexistentes: al llenar el tablero (y al reponer gemas tras una cascada) se rechaza cualquier gema que forme 3-en-línea inmediata en su fila o columna, y se re-sortea.
- Selección e intercambio: el jugador selecciona una gema y luego una gema **adyacente** (arriba/abajo/izquierda/derecha, no diagonal) para intentar el swap. Soporte de puntero (clic en gema A, clic en gema B adyacente) **y** teclado (`←↑↓→` mueven un cursor resaltado; `Espacio`/`Enter` selecciona/confirma el swap con la gema previamente marcada).
- Validación de swap: se intercambian las dos gemas; si el intercambio produce al menos un match de 3+ (en fila o columna) en cualquiera de las dos posiciones, el swap es válido y se resuelven los matches; si no produce ningún match, el swap se revierte (las gemas vuelven a su posición) y no cuenta.
- Resolución de matches y cascadas: se eliminan todas las gemas en líneas de 3+; las gemas por encima de un hueco caen por gravedad hasta el fondo de su columna; se reponen gemas nuevas por el tope de cada columna; si la caída forma nuevos matches, se resuelven en cadena (cascada), incrementando un multiplicador de combo por cada eslabón de la cadena.
- Puntaje: cada gema eliminada suma `BASE_GEM_POINTS` (10) multiplicado por el multiplicador de cascada actual (eslabón 1 = ×1, eslabón 2 = ×2, eslabón 3 = ×3, ...). Matches de 4+ gemas en una sola línea otorgan un bono fijo adicional (`LINE4_BONUS` / `LINE5_BONUS`). El multiplicador se reinicia al inicio de cada swap del jugador.
- Temporizador: una barra de tiempo que drena de forma continua (delta-time). Cada match válido reabastece una fracción de tiempo (`TIME_REFILL_PER_GEM` por gema eliminada, con tope al máximo de la barra). Cuando el tiempo llega a 0, la partida termina.
- Progresión de nivel: cada `POINTS_PER_LEVEL` puntos sube el nivel (`onLevelChange`) y aumenta la tasa de drenado del temporizador (`DRAIN_INCREASE_PER_LEVEL`), acelerando la dificultad — mismo patrón "nivel = dificultad" que Asteroides/Tetris/Bloque Buster/Serpentina.
- Deadlock: si tras resolver todas las cascadas el tablero no tiene ningún swap válido posible, se re-baraja automáticamente (reshuffle) hasta que exista al menos un movimiento válido, sin terminar la partida y sin sumar puntos por el reshuffle.
- Fin de partida: al agotarse el temporizador, el loop se congela (deja de actualizar, dibuja el último frame) e invoca `onGameOver(finalScore)` de inmediato — sin overlay interno, igual que los otros juegos reales. No hay concepto de vidas.
- `PrismaGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange`, `onTimeChange` (nuevo callback, mismo naming `on<Cosa>Change`, reporta el tiempo restante como porcentaje 0–100), `onGameOver`. No expone `onLivesChange` — el concepto no existe en este juego.
- Generalizar el 4to stat del HUD externo en `GamePlayerClient.tsx`: extender el tipo `FourthStat` (introducido en SPEC 09 con `hearts | lines | length`) con una nueva variante `{ kind: "time" }` que muestra "Tiempo" como valor numérico/porcentaje (sin corazones), para `prisma`, sin cambiar el render de Asteroides, Tetris, Bloque Buster ni Serpentina.
- `lib/types.ts`: agregar `"prisma"` a `REAL_SCORE_GAME_IDS`. `app/games/[id]/page.tsx` y `SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08) — no requieren cambios de lógica, solo que el nuevo `id` exista en `public.games`.
- `GamePlayerClient.tsx`: cuando `game.id === "prisma"`, montar `PrismaGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "prisma", name, score })` (Supabase), igual que los otros juegos reales.
- Migración SQL (`INSERT`, no `UPDATE` — la fila `prisma` **no** existe todavía) en `public.games` con `id: "prisma"`, `title: "PRISMA"`, `short`/`long` descriptivos, `cat: "PUZZLE"`, `cover: "cover-prisma"`, `color: "cyan"`, `best: 0`, `plays: "0"`. Documentada como paso pendiente para quien implemente — **no la ejecuta el planner**.
- Clase `.cover-prisma` en `app/globals.css` para la portada del catálogo (gradiente neón en el mismo estilo que las demás `.cover-*`), documentada como paso pendiente.

**Out of scope (para futuras specs):**

- Gemas especiales / power-ups (bomba, gema de rayo, cambio de color por match de 4/5) — se descartan explícitamente en esta primera versión; solo bono de puntos por línea larga.
- Modo por objetivos de nivel al estilo "rompe todos los bloques de hielo" — se descarta; la única condición de fin es el temporizador.
- Modo sin temporizador ("endless" hasta deadlock) — se descarta; el temporizador es la mecánica de fin y de dificultad.
- Arrastre (drag) para intercambiar; solo clic-clic y teclado en esta versión.
- Efectos de sonido (no se proveyeron assets de audio).
- Animaciones elaboradas de caída/estallido más allá de una interpolación simple de posiciones.
- Controles táctiles/on-screen dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/PrismaGame.tsx`** (nuevo, constantes internas):

```ts
const COLS = 8;
const ROWS = 8;
const CELL = 64; // px — tablero 512x512 centrado en canvas interno 800x600
const GEM_TYPES = 5; // 4 colores de paleta CRT + 1 neutro claro
const BASE_GEM_POINTS = 10; // puntos por gema eliminada (× multiplicador de cascada)
const LINE4_BONUS = 40; // bono fijo por match de 4 en una línea
const LINE5_BONUS = 100; // bono fijo por match de 5 en una línea
const POINTS_PER_LEVEL = 1000; // puntos para subir de nivel
const TIME_MAX = 100; // tope de la barra de tiempo (%)
const BASE_DRAIN_PER_SEC = 7; // % de barra que se drena por segundo (nivel 1)
const DRAIN_INCREASE_PER_LEVEL = 1.5; // % adicional por segundo por cada nivel
const TIME_REFILL_PER_GEM = 1.2; // % de barra recuperado por gema eliminada

// Tipo de gema (0..GEM_TYPES-1). Cada índice mapea a un color+forma:
// 0 cyan-círculo, 1 magenta-rombo, 2 green-cuadrado, 3 yellow-triángulo, 4 blanco-hexágono
type GemType = 0 | 1 | 2 | 3 | 4;
type Cell = { col: number; row: number };

type BoardState = {
  grid: GemType[][]; // grid[row][col]; origen top-left (fila 0 = tope)
  cursor: Cell; // celda resaltada (control por teclado)
  selected: Cell | null; // primera gema marcada para un swap, o null
  score: number;
  level: number;
  time: number; // 0..TIME_MAX, restante
  combo: number; // multiplicador de la cascada en curso (1 en reposo)
  phase: "input" | "resolving"; // resolving = animando swap/caída/cascada
  status: "playing" | "paused" | "over";
};

export type PrismaGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type PrismaGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onTimeChange: (percent: number) => void; // 0..100, dispara solo si cambia el entero
  onGameOver: (finalScore: number) => void;
};
```

Convenciones:

- Coordenadas: origen top-left; `grid[0]` es la fila superior, la gravedad tira las gemas hacia filas de índice mayor.
- El temporizador y las animaciones usan un acumulador delta-time dentro del loop de `requestAnimationFrame` (mismo patrón que SPEC 09), independiente de la tasa de frames.
- Adyacencia para swap = 4-vecindad (sin diagonales); distancia Manhattan exactamente 1.

**`components/GamePlayerClient.tsx`** — extiende el tipo `FourthStat` de SPEC 09 con una variante `time`:

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" } // Serpentina
  | { kind: "time" }; // Prisma — valor numérico (% de tiempo restante), sin corazones

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  // ...entradas existentes sin cambios...
  prisma: {
    fourthStat: { kind: "time" },
    suppressExternalPauseOverlay: false,
  },
};
```

El label ("Tiempo") y su valor (`realTime`, nuevo estado alimentado por `onTimeChange`, mismo patrón que `realLength`) se derivan de `fourthStat.kind`, sin tocar la lógica de los otros juegos.

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "prisma",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (el `id` `prisma` no existe):

- `id`: `prisma`
- `title`: `PRISMA`
- `short`: "Alinea gemas de neón y desata cascadas."
- `long`: "Intercambia gemas adyacentes para alinear tres o más del mismo color. Las que estallan hacen caer a las de arriba, encadenando cascadas que multiplican tu puntaje. Cada combo reabastece el reloj; deja que se agote y la partida termina."
- `cat`: `PUZZLE`
- `cover`: `cover-prisma`
- `color`: `cyan`
- `best`: `0`
- `plays`: `0`

**`app/globals.css`** — nueva clase `.cover-prisma` (gradiente neón, mismo estilo que las demás `.cover-*`).

## Implementation plan

1. Documentar y dejar listo (para quien implemente) el `INSERT` en `public.games` de la fila `prisma` (vía `apply_migration`) y la clase `.cover-prisma` en `app/globals.css`. Tras esto, `/games/prisma` y la portada en `/games` cargan la ficha del nuevo juego con el copy y la portada correctos, todavía apuntando a la simulación falsa (aún no está en `REAL_SCORE_GAME_IDS`). Verificable sin tocar ningún componente de juego.

2. Crear `components/games/PrismaGame.tsx` con el **estado y la lógica de tablero** puros: `BoardState`, generación del tablero inicial sin matches, detección de matches (barrido de filas y columnas buscando 3+ iguales), validación de swap (intercambia, comprueba match, revierte si no hay), y el helper de "¿existe algún swap válido?" para el deadlock. Compila aislado; todavía no se importa desde ninguna página.

3. Implementar en el mismo componente la **resolución de matches, gravedad, reposición y cascadas**: eliminar líneas, colapsar columnas (gravedad), reponer gemas nuevas por el tope evitando auto-matches, y repetir en cadena incrementando `combo`; sumar puntaje (`BASE_GEM_POINTS × combo` + bonos de línea larga) y reabastecer tiempo por gema. Detección de deadlock → reshuffle. Lógica pura, aún sin render.

4. Agregar **render en canvas**: ajuste por `devicePixelRatio` (patrón `BloqueBusterGame`), dibujo del fondo/tablero, gemas vectoriales por tipo (color + forma), resaltado del cursor y de la gema seleccionada, y HUD interno mínimo (score/nivel/tiempo). Interpolación simple de posiciones para swap/caída. Sigue sin montarse en ninguna página.

5. Agregar **controles, temporizador y ciclo de pausa/fin**: listeners de puntero (clic-clic sobre gemas adyacentes) y teclado (`←↑↓→` mueven el cursor, `Espacio`/`Enter` selecciona/confirma), el drenado del temporizador con acumulador delta-time acelerado por nivel, progresión de nivel (`POINTS_PER_LEVEL`), props (`onScoreChange`, `onLevelChange`, `onTimeChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al agotarse el tiempo, el loop se congela e invoca `onGameOver(finalScore)`. Sigue sin montarse.

6. Generalizar `components/GamePlayerClient.tsx`: extender `FourthStat` con `{ kind: "time" }` y agregar el estado `realTime` (mismo patrón que `realLength`), **sin** agregar todavía `"prisma"` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para Asteroides/Tetris/Bloque Buster/Serpentina — verificable jugando cada uno antes de continuar.

7. En un solo paso atómico: agregar `"prisma"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "time" }`, `suppressExternalPauseOverlay: false`); montar `PrismaGame` en el switch de `GamePlayerClient` cuando `game.id === "prisma"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "prisma", name, score })`. `/games/prisma/jugar` queda jugable de verdad con guardado real en Supabase; `/games/prisma` y la pestaña "PRISMA" de `/salon` pasan a usar el leaderboard real.

8. Pasada final: verificación manual en navegador del flujo completo (intercambiar gemas válidas e inválidas, ver cascadas y el multiplicador de combo, subir de nivel notando el drenado más rápido, agotar el tiempo, pausar/reanudar, "FIN", guardar puntuación y verla en `/games/prisma` y `/salon`, confirmar reshuffle en un tablero sin movimientos, y que Asteroides/Tetris/Bloque Buster/Serpentina y los 4 placeholders sigan intactos tras el refactor del paso 6), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` tiene una fila `id = 'prisma'` con `title` `PRISMA`, `cat` `PUZZLE`, `cover` `cover-prisma`, `color` `cyan`, y `short`/`long` descriptivos del Match-3.
- [ ] `/games/prisma` carga la ficha del juego con su portada `.cover-prisma` y el copy, sin errores en consola.
- [ ] `/games/prisma/jugar` renderiza el canvas real (tablero 8×8 de gemas vectoriales) dentro de `.crt-screen`, en vez de un placeholder `.game-arena`.
- [ ] El tablero inicial no contiene ningún match de 3+ preexistente al empezar la partida.
- [ ] Seleccionar una gema y una gema adyacente que forma un match ejecuta el swap y elimina las gemas alineadas; un swap que no forma ningún match se revierte y no cambia el puntaje.
- [ ] Eliminar una gema suma exactamente `BASE_GEM_POINTS` (10) × el multiplicador de cascada vigente; un match de 4 en línea otorga además `LINE4_BONUS`.
- [ ] Tras eliminar gemas, las de arriba caen por gravedad y se reponen nuevas por el tope; una caída que forma un nuevo match se resuelve en cadena con multiplicador incrementado.
- [ ] La barra de tiempo drena de forma continua; cada match válido la reabastece; cuando llega a 0 se dispara `onGameOver` con el score final.
- [ ] Cada `POINTS_PER_LEVEL` puntos sube el nivel y el drenado del temporizador se vuelve perceptiblemente más rápido.
- [ ] Si el tablero queda sin swaps válidos, se re-baraja automáticamente sin terminar la partida ni sumar puntos.
- [ ] El 4to stat del HUD externo muestra "Tiempo" con el porcentaje restante (no corazones, ni "Líneas", ni "Longitud") mientras se juega Prisma.
- [ ] "PAUSA" congela el juego (temporizador incluido) y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar a que se agote el tiempo.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "prisma"` (vía `insertScore`), y aparece en `/games/prisma` y en la pestaña "PRISMA" de `/salon`.
- [ ] "JUGAR DE NUEVO" reinicia a un estado limpio (score 0, nivel 1, tiempo lleno, tablero nuevo sin matches); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor del 4to stat, Asteroides, Tetris, Bloque Buster y Serpentina siguen mostrando "Vidas"/"Líneas"/"Longitud" exactamente igual que antes.
- [ ] Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando su estado actual sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** Match-3 por intercambio de gemas adyacentes + cascadas por gravedad. **No:** Match-3 por caída de columnas al estilo Columns/Puyo — se descarta por parecerse demasiado a Tetris (caída de piezas), y el objetivo es novedad de mecánica dentro de PUZZLE.
- **Yes:** temporizador que drena y se acelera por nivel como condición de fin y de dificultad. **No:** modo "endless hasta deadlock" — los deadlocks son raros con 5 colores en 8×8 y las partidas se harían larguísimas, restando competibilidad al leaderboard; el temporizador acota la partida y da un puntaje limpio.
- **Yes:** reshuffle automático al detectar deadlock, sin puntos. **No:** terminar la partida por deadlock — se descarta porque un tablero sin movimientos es un estado degenerado, no un logro/fracaso del jugador.
- **Yes:** 5 tipos de gema diferenciados por color **y** forma (4 colores de la paleta CRT + 1 neutro). **No:** 6–7 colores como Bejeweled — más colores reducen la tasa de matches y, con temporizador drenando, endurecen demasiado; 5 mantiene el ritmo y encaja con la paleta existente.
- **Yes:** soportar puntero (clic-clic) y teclado (cursor + Espacio/Enter). **No:** arrastre (drag-to-swap) — más complejo de implementar bien en canvas y no aporta a la primera versión.
- **Yes:** generalizar el 4to stat de `GamePlayerClient` con `{ kind: "time" }` (extendiendo el `FourthStat` de SPEC 09). **No:** reutilizar `length`/`lines` con otra etiqueta o forzar un valor de vidas ficticio — menos honesto con la mecánica; SPEC 09 ya sentó el precedente de generalizar por `kind`.
- **Yes:** render 100% vectorial de las gemas. **No:** buscar/crear sprites bitmap — no se proveyeron assets para este juego y las formas vectoriales bastan para 5 tipos distinguibles.
- **Yes:** leaderboard real en Supabase (`insertScore`), agregando `prisma` a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`) — es un juego real completo, consistente con los 4 juegos reales existentes.
- **Yes:** `INSERT` de fila nueva + clase `.cover-prisma`, documentados como pasos pendientes para quien implemente. **No:** que el planner ejecute la migración — fuera de su rol.

## Risks

| Risk                                                                                                | Mitigation                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generar el tablero o reponer gemas puede crear auto-matches no deseados (puntos "gratis" al inicio) | Al colocar cada gema (inicial o reposición) se rechaza y re-sortea cualquier tipo que forme 3-en-línea inmediata en su fila o columna; el barrido de matches solo corre tras un swap del jugador o tras una caída. |
| El temporizador desacoplado del render podría drenar de más en frames largos o pausas mal manejadas | Drenado por acumulador delta-time acotado por frame (mismo patrón que SPEC 09); en pausa el acumulador no avanza, y `resume()` continúa desde el valor exacto.                                                     |
| Detección de deadlock costosa si se recalcula cada frame                                            | El chequeo de "¿existe swap válido?" solo corre al finalizar todas las cascadas de un turno (fase `input`), no cada frame; sobre 8×8 es un barrido barato y acotado.                                               |
| La resolución de cascadas mientras corre el temporizador podría permitir input a medias             | Durante `phase: "resolving"` se ignora el input del jugador hasta volver a `phase: "input"`; el temporizador sigue drenando, manteniendo la presión.                                                               |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `"prisma"`                   | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec.                                                                                                  |

## What is **not** in this spec

- Gemas especiales / power-ups (bomba, rayo, cambio de color).
- Modos por objetivos de nivel.
- Modo endless sin temporizador.
- Arrastre (drag) para intercambiar.
- Efectos de sonido.
- Animaciones elaboradas más allá de interpolación simple.
- Controles táctiles/on-screen dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
