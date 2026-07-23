# SPEC 19 — Juego Fusión (Deslizamiento-fusión 2048)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, ajuste `devicePixelRatio`), SPEC 09 (Serpentina — generalizó el 4to stat de `GamePlayerClient` con `FourthStat`)
> **Date:** 2026-07-23
> **Objective:** Crear desde cero el componente `components/games/FusionGame.tsx` — un puzzle de deslizamiento-fusión estilo 2048 sobre tablero 4×4 donde deslizar todas las fichas en una dirección fusiona las de igual valor doblando su potencia — como juego PUZZLE **nuevo** (`id: "fusion"`, no un placeholder existente) con leaderboard real en Supabase.

## Section 1 — Por qué existe esta spec

`fusion` es un `id` **nuevo**: a diferencia de los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`), no existe todavía una fila en `public.games`, así que esta spec sí requiere una migración `INSERT` (documentada como paso pendiente para quien implemente, no ejecutada por el planner) y una clase `.cover-fusion` en `app/globals.css`. Se elige PUZZLE porque es de las categorías más flacas del catálogo (solo Tetris es real; Prisma es borrador). El deslizamiento-fusión no se solapa con ninguna mecánica ya cubierta: Tetris es caída de tetrominós + line-clear; Prisma (SPEC 15) es intercambio de gemas adyacentes + cascadas por gravedad; Fusión es mover **todo** el tablero en una dirección y fusionar por duplicación, sin piezas que caen, sin líneas, sin intercambio y sin cascadas.

## Scope

**In:**

- Construir `components/games/FusionGame.tsx` desde cero: puzzle de deslizamiento-fusión sobre tablero 4×4 de fichas de energía, canvas de resolución interna fija 800×600 con el tablero de 4×4 celdas de 120px (480×480) centrado, con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`) para que el número de cada ficha se vea nítido.
- Fichas con valores potencia de 2 (`2, 4, 8, 16, ...`), dibujadas 100% vectorialmente (sin assets bitmap): rectángulo redondeado con el número centrado, y un color por "tier" derivado del valor usando la paleta CRT (`cyan`/`magenta`/`green`/`yellow`) con luminosidad creciente; celda vacía = `0`.
- Estado inicial: `START_TILES` (2) fichas colocadas en celdas aleatorias vacías, cada una de valor 2 o 4 según `SPAWN_4_CHANCE`.
- Movimiento: cada pulsación de `←`/`↑`/`↓`/`→` desliza **todas** las fichas hacia ese borde hasta toparse; dos fichas del mismo valor que colisionan en el sentido del deslizamiento se fusionan en una sola del doble de valor; cada ficha resultante de una fusión no vuelve a fusionarse en el mismo movimiento (regla clásica de 2048).
- Spawn tras movimiento: si el deslizamiento movió o fusionó al menos una ficha, aparece una ficha nueva (valor 2 o 4 según `SPAWN_4_CHANCE`) en una celda vacía aleatoria; si el input no cambió el tablero (nada se movió ni fusionó), el turno se ignora y **no** aparece ficha nueva.
- Puntaje: cada fusión suma el valor de la ficha resultante (fusionar dos `2` → `+4`; dos `64` → `+128`), acumulándose durante el movimiento — mismo criterio de puntaje que el 2048 clásico.
- Máximo: se rastrea la ficha de mayor valor actual en el tablero (`maxTile`), reportado por `onMaxTileChange` — es el 4to stat del HUD.
- Progresión de nivel: `level` es un **tier de progreso** ligado al máximo alcanzado — empieza en 1 y sube (`onLevelChange`) cada vez que se crea por primera vez una ficha de un valor mayor al máximo histórico de la partida (primer `4` → nivel 2, primer `8` → nivel 3, ...). No modula la dificultad (el juego es turn-based, sin velocidad ni temporizador); es un indicador de avance, documentado como decisión.
- Hito 2048: alcanzar una ficha de `WIN_TILE` (2048) **no** termina la partida; se sigue jugando en modo endless. No hay overlay ni pausa por "victoria".
- Fin de partida: la partida termina cuando el tablero está lleno (sin celdas `0`) **y** no existe ninguna fusión posible (ningún par de fichas adyacentes en horizontal o vertical con el mismo valor), es decir ningún movimiento cambia el tablero en ninguna de las 4 direcciones; el loop se congela (deja de actualizar, dibuja el último frame) e invoca `onGameOver(finalScore)` de inmediato — sin overlay interno, igual que los otros juegos reales. No hay concepto de vidas.
- `FusionGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange`, `onMaxTileChange` (nuevo callback, mismo naming `on<Cosa>Change`, dispara solo cuando cambia el máximo), `onGameOver`. No expone `onLivesChange` — el concepto no existe en este juego.
- Generalizar el 4to stat del HUD externo en `GamePlayerClient.tsx`: extender el tipo `FourthStat` (introducido en SPEC 09 con `hearts | lines | length`) con una nueva variante `{ kind: "max" }` que muestra "Máximo" como valor numérico (la ficha más alta, sin corazones), para `fusion`, sin cambiar el render de Asteroides, Tetris, Bloque Buster ni Serpentina.
- `lib/types.ts`: agregar `"fusion"` a `REAL_SCORE_GAME_IDS`. `app/games/[id]/page.tsx` y `SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08) — no requieren cambios de lógica, solo que el nuevo `id` exista en `public.games`.
- `GamePlayerClient.tsx`: cuando `game.id === "fusion"`, montar `FusionGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "fusion", name, score })` (Supabase), igual que los otros juegos reales.
- Migración SQL (`INSERT`, no `UPDATE` — la fila `fusion` **no** existe todavía) en `public.games` con `id: "fusion"`, `title: "FUSIÓN"`, `short`/`long` descriptivos, `cat: "PUZZLE"`, `cover: "cover-fusion"`, `color: "yellow"`, `best: 0`, `plays: "0"`. Documentada como paso pendiente para quien implemente — **no la ejecuta el planner**.
- Clase `.cover-fusion` en `app/globals.css` para la portada del catálogo (gradiente neón en el mismo estilo que las demás `.cover-*`), documentada como paso pendiente.

**Out of scope (para futuras specs):**

- Tableros de otro tamaño (5×5, 6×6) o modos con tamaño variable — solo 4×4 en esta versión.
- Deshacer movimiento (undo) — se descarta; cada movimiento es definitivo.
- Detener la partida al alcanzar 2048 con un modal de "victoria" — se descarta; el juego es endless y 2048 es solo un hito.
- Fichas especiales / comodines (bomba, cambio de valor, ficha aleatoria) — fuera de alcance.
- Persistir el mejor tablero o continuar una partida guardada — el leaderboard real de Supabase basta como registro de puntaje.
- Efectos de sonido (no se proveyeron assets de audio).
- Animaciones elaboradas de deslizamiento más allá de una interpolación simple de posiciones (o un snap directo con un breve destello en la fusión).
- Controles táctiles/gestos de swipe dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/FusionGame.tsx`** (nuevo, constantes internas):

```ts
const SIZE = 4; // tablero 4x4
const TILE = 120; // px — tablero 480x480 centrado en canvas interno 800x600
const START_TILES = 2; // fichas al iniciar
const SPAWN_4_CHANCE = 0.1; // 10% de que una ficha nueva sea 4; resto, 2
const WIN_TILE = 2048; // hito (no termina la partida)

// grid[row][col]; 0 = celda vacía; valores > 0 son potencias de 2.
// Origen top-left: grid[0] = fila superior, grid[r][0] = columna izquierda.
type Grid = number[][];
type Direction = "up" | "down" | "left" | "right";

type FusionState = {
  grid: Grid;
  score: number;
  maxTile: number; // ficha de mayor valor actual
  level: number; // tier de progreso: 1 + veces que subió el máximo histórico
  status: "playing" | "paused" | "over";
};

export type FusionGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type FusionGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onMaxTileChange: (maxTile: number) => void; // dispara solo si cambia
  onGameOver: (finalScore: number) => void;
};
```

Convenciones:

- Coordenadas: origen top-left; `grid[0]` es la fila superior, `grid[r][0]` la columna izquierda.
- El deslizamiento se implementa comprimiendo/fusionando cada fila o columna en el sentido del input (una función `slideLine(number[]) -> { line, gained }` reutilizada para las 4 direcciones vía transposición/reverso), evitando duplicar lógica por dirección.
- La detección de "hay movimiento posible" recorre celdas vacías y pares adyacentes iguales (horizontal y vertical); no requiere simular las 4 direcciones completas.
- Si se anima el deslizamiento, se usa un acumulador delta-time dentro del loop de `requestAnimationFrame` (mismo patrón que SPEC 09), independiente de la tasa de frames; el estado lógico del tablero se resuelve al instante y la animación solo interpola posiciones visuales.

**`components/GamePlayerClient.tsx`** — extiende el tipo `FourthStat` de SPEC 09 con una variante `max`:

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" } // Serpentina
  | { kind: "max" }; // Fusión — valor numérico (ficha más alta), sin corazones

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  // ...entradas existentes sin cambios...
  fusion: {
    fourthStat: { kind: "max" },
    suppressExternalPauseOverlay: false,
  },
};
```

El label ("Máximo") y su valor (`realMaxTile`, nuevo estado alimentado por `onMaxTileChange`, mismo patrón que `realLength`) se derivan de `fourthStat.kind`, sin tocar la lógica de los otros juegos. Si otra spec en curso ya agregó variantes adicionales a `FourthStat` (ej. `time` de Prisma), esta spec solo añade `max` sin removerlas.

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "fusion",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (el `id` `fusion` no existe):

- `id`: `fusion`
- `title`: `FUSIÓN`
- `short`: "Desliza y fusiona núcleos hasta el 2048."
- `long`: "Desliza todas las fichas de energía hacia un borde y fusiona las de igual valor para doblar su potencia. Cada movimiento aparece una ficha nueva; el objetivo es forjar el núcleo 2048 y seguir sumando. La partida acaba cuando el tablero se llena sin ninguna fusión posible."
- `cat`: `PUZZLE`
- `cover`: `cover-fusion`
- `color`: `yellow`
- `best`: `0`
- `plays`: `0`

**`app/globals.css`** — nueva clase `.cover-fusion` (gradiente neón amarillo/verde, mismo estilo que las demás `.cover-*`).

## Implementation plan

1. Documentar y dejar listo (para quien implemente) el `INSERT` en `public.games` de la fila `fusion` (vía `apply_migration`) y la clase `.cover-fusion` en `app/globals.css`. Tras esto, `/games/fusion` y la portada en `/games` cargan la ficha del nuevo juego con el copy y la portada correctos, todavía apuntando a la simulación falsa (aún no está en `REAL_SCORE_GAME_IDS`). Verificable sin tocar ningún componente de juego.

2. Crear `components/games/FusionGame.tsx` con el **estado y la lógica de tablero** puros: `FusionState`, colocación inicial de `START_TILES` fichas, `slideLine` (comprimir + fusionar una línea con la regla "no re-fusionar en el mismo movimiento" y devolver puntos ganados), el desplazamiento en las 4 direcciones vía esa función, el spawn de ficha tras un movimiento efectivo, el cálculo de `maxTile`/`level`, y el helper "¿hay algún movimiento posible?" para el fin de partida. Compila aislado; todavía no se importa desde ninguna página.

3. Agregar **render en canvas**: ajuste por `devicePixelRatio` (patrón `BloqueBusterGame`), dibujo del fondo/rejilla del tablero, fichas vectoriales (rectángulo redondeado + número centrado, color por tier del valor), y HUD interno mínimo (score/máximo/nivel). Interpolación simple opcional del deslizamiento (o snap directo con un destello breve en la fusión). Sigue sin montarse en ninguna página.

4. Agregar **controles y ciclo de pausa/fin**: listener de teclado (`←↑↓→`, ignorando el input que no cambia el tablero), props (`onScoreChange`, `onLevelChange`, `onMaxTileChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Cuando el tablero se llena sin movimientos posibles, el loop se congela (último frame visible) e invoca `onGameOver(finalScore)`. Sigue sin montarse.

5. Generalizar `components/GamePlayerClient.tsx`: extender `FourthStat` con `{ kind: "max" }` y agregar el estado `realMaxTile` (mismo patrón que `realLength`), **sin** agregar todavía `"fusion"` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para Asteroides/Tetris/Bloque Buster/Serpentina — verificable jugando cada uno antes de continuar.

6. En un solo paso atómico: agregar `"fusion"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "max" }`, `suppressExternalPauseOverlay: false`); montar `FusionGame` en el switch de `GamePlayerClient` cuando `game.id === "fusion"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "fusion", name, score })`. `/games/fusion/jugar` queda jugable de verdad con guardado real en Supabase; `/games/fusion` y la pestaña "FUSIÓN" de `/salon` pasan a usar el leaderboard real.

7. Pasada final: verificación manual en navegador del flujo completo (deslizar en las 4 direcciones, fusionar fichas confirmando la suma de puntaje, ver subir el "Máximo" y el "Nivel" al alcanzar nuevos valores, confirmar que un input sin efecto no genera ficha nueva, forjar fichas altas, llenar el tablero hasta el game over, pausar/reanudar, "FIN", guardar puntuación y verla en `/games/fusion` y `/salon`, y que Asteroides/Tetris/Bloque Buster/Serpentina y los 4 placeholders sigan intactos tras el refactor del paso 5), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` tiene una fila `id = 'fusion'` con `title` `FUSIÓN`, `cat` `PUZZLE`, `cover` `cover-fusion`, `color` `yellow`, y `short`/`long` descriptivos del deslizamiento-fusión.
- [ ] `/games/fusion` carga la ficha del juego con su portada `.cover-fusion` y el copy, sin errores en consola.
- [ ] `/games/fusion/jugar` renderiza el canvas real (tablero 4×4 de fichas vectoriales con número) dentro de `.crt-screen`, en vez de un placeholder `.game-arena`.
- [ ] La partida inicia con exactamente 2 fichas (valor 2 o 4) en celdas aleatorias; el resto del tablero está vacío.
- [ ] Pulsar una flecha desliza todas las fichas hacia ese borde; dos fichas del mismo valor que colisionan se fusionan en una del doble de valor, y una ficha recién fusionada no se vuelve a fusionar en el mismo movimiento.
- [ ] Cada fusión suma exactamente el valor de la ficha resultante al puntaje (dos `2` → `+4`; dos `64` → `+128`).
- [ ] Tras un movimiento que cambia el tablero aparece exactamente una ficha nueva; un input que no mueve ni fusiona nada no genera ficha nueva ni cambia el puntaje.
- [ ] El 4to stat del HUD externo muestra "Máximo" con el valor de la ficha más alta del tablero (no corazones, ni "Líneas", ni "Longitud") mientras se juega Fusión.
- [ ] El "Nivel" del HUD sube la primera vez que se crea una ficha de un valor mayor al máximo histórico de la partida.
- [ ] Alcanzar una ficha de 2048 no termina la partida; se puede seguir jugando.
- [ ] La partida termina (dispara `onGameOver` con el score final) solo cuando el tablero está lleno y no existe ninguna fusión posible en ninguna dirección.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto del tablero.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar a llenar el tablero.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "fusion"` (vía `insertScore`), y aparece en `/games/fusion` y en la pestaña "FUSIÓN" de `/salon`.
- [ ] "JUGAR DE NUEVO" reinicia a un estado limpio (score 0, nivel 1, máximo 0/2, tablero con 2 fichas iniciales); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor del 4to stat, Asteroides, Tetris, Bloque Buster y Serpentina siguen mostrando "Vidas"/"Líneas"/"Longitud" exactamente igual que antes.
- [ ] Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando su estado actual sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** deslizamiento-fusión de todo el tablero con merge por duplicación (familia 2048). **No:** intercambio de gemas + cascadas (eso es Prisma, SPEC 15) ni caída de piezas + line-clear (eso es Tetris) — el objetivo es novedad de mecánica dentro de PUZZLE sin solaparse con lo ya cubierto.
- **Yes:** tablero 4×4 clásico. **No:** tamaños mayores o configurables — 4×4 da partidas de duración competible y es la variante canónica; otros tamaños quedan para otra spec.
- **Yes:** puntaje = suma del valor de cada ficha fusionada (regla clásica de 2048). **No:** puntaje por número de movimientos o por ficha máxima únicamente — la suma de fusiones es el estándar reconocible y produce un ranking limpio.
- **Yes:** `level` como tier de progreso ligado al máximo histórico (sube al forjar un nuevo valor tope), reportado por `onLevelChange`. **No:** `level` que module velocidad/dificultad — el juego es turn-based sin temporizador; forzar un "nivel de dificultad" sería artificial. Se mantiene la convención de mostrar "Nivel" en el HUD de forma honesta como avance.
- **Yes:** 2048 es solo un hito; la partida sigue endless. **No:** terminar con modal de "victoria" al llegar a 2048 — resta puntaje competible; el leaderboard premia seguir fusionando.
- **Yes:** el fin de partida se detecta con "tablero lleno + sin par adyacente igual en H/V". **No:** simular las 4 direcciones completas cada frame — el chequeo de adyacencia es equivalente, más barato y no corre en el loop, solo tras cada movimiento efectivo.
- **Yes:** `SPAWN_4_CHANCE` 10% para la ficha nueva (2 o 4), como el 2048 original. **No:** siempre spawnear 2 — el 4 ocasional mantiene la variedad y fidelidad al clásico.
- **Yes:** generalizar el 4to stat de `GamePlayerClient` con `{ kind: "max" }` (extendiendo el `FourthStat` de SPEC 09). **No:** reutilizar `length`/`lines` con otra etiqueta o forzar un valor de vidas ficticio — menos honesto con la mecánica; SPEC 09 ya sentó el precedente de generalizar por `kind`.
- **Yes:** render 100% vectorial de las fichas (rectángulo redondeado + número, color por tier). **No:** buscar/crear sprites bitmap — no se proveyeron assets y las formas vectoriales con texto bastan; el ajuste `devicePixelRatio` mantiene el número nítido.
- **Yes:** leaderboard real en Supabase (`insertScore`), agregando `fusion` a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`) — es un juego real completo, consistente con los juegos reales existentes.
- **Yes:** `INSERT` de fila nueva + clase `.cover-fusion`, documentados como pasos pendientes para quien implemente. **No:** que el planner ejecute la migración — fuera de su rol.

## Risks

| Risk                                                                                                                                                      | Mitigation                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La regla "una ficha recién fusionada no se vuelve a fusionar en el mismo movimiento" es fácil de implementar mal (permitiría fusiones triples/cuádruples) | `slideLine` marca las posiciones ya fusionadas de la línea en curso y las excluye de una segunda fusión; se valida con el caso `[2,2,2,2]` → `[4,4]` (no `[8]`) en prueba manual.                             |
| Cerrar la partida con movimientos aún posibles (falso game over) o no cerrarla cuando ya no hay movimientos                                               | El fin exige tablero lleno **y** ausencia de todo par adyacente igual (H y V); mientras haya una celda vacía o un par igual adyacente, la partida continúa. Verificable llenando el tablero en prueba manual. |
| Un input que no cambia el tablero podría igual spawnear ficha (rompiendo el juego) o consumir el turno                                                    | El spawn solo ocurre si el deslizamiento reportó al menos un cambio (movimiento o fusión); si el tablero queda idéntico, el turno se ignora por completo.                                                     |
| El deslizamiento desacoplado del render (si se anima) podría desincronizar posiciones visuales y lógicas                                                  | El estado lógico del tablero se resuelve al instante en el input; la animación solo interpola posiciones visuales por acumulador delta-time (patrón SPEC 09) y no altera el estado.                           |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `"fusion"`                                                                         | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec.                                                                                             |

## What is **not** in this spec

- Tableros de otro tamaño o configurables.
- Deshacer movimiento (undo).
- Modal de "victoria" al alcanzar 2048.
- Fichas especiales / comodines.
- Persistencia de partida guardada.
- Efectos de sonido.
- Animaciones elaboradas más allá de interpolación simple.
- Controles táctiles/gestos de swipe dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
