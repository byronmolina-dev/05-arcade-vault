# SPEC 22 — Juego Circuito (Enrutamiento de flujo)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, ajuste `devicePixelRatio`), SPEC 09 (Serpentina — generalizó el 4to stat de `GamePlayerClient` con `FourthStat`, y patrón de acumulador delta-time), SPEC 15 (Prisma — precedente de juego PUZZLE nuevo con callback propio y variante `FourthStat`)
> **Date:** 2026-07-23
> **Objective:** Crear desde cero el componente `components/games/CircuitoGame.tsx` — un enrutamiento de flujo estilo Pipe Mania sobre una grilla 12×9 donde colocas y rotas conductos de una cola para tender el camino más largo antes de que el flujo de energía lo alcance y se derrame — como juego PUZZLE **nuevo** (`id: "circuito"`, no un placeholder existente) con leaderboard real en Supabase.

## Section 1 — Por qué existe esta spec

`circuito` es un `id` **nuevo**: a diferencia de los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`, todos ya tomados por specs 10-13), no existe todavía una fila en `public.games`, así que esta spec requiere una migración `INSERT` (documentada como paso pendiente para quien implemente, **no** ejecutada por el planner) y una clase `.cover-circuito` en `app/globals.css`. Se elige PUZZLE porque es de las categorías más flacas del catálogo (solo Tetris es real) y el enrutamiento de flujo es una mecánica de tercer tipo que no se solapa con los otros PUZZLE: Tetris es caída de tetrominós + line-clear; `prisma` (spec 15) es intercambio de gemas + cascadas; `fusion` (spec 19) es deslizamiento-fusión 2048 turn-based; Circuito es planificar un trazado de conductos bajo la presión de un flujo que avanza en tiempo real. La estética de tubos de neón que se encienden al pasar la energía calza de lleno con el look CRT/circuito.

## Scope

**In:**

- Construir `components/games/CircuitoGame.tsx` desde cero: enrutamiento de flujo sobre una grilla 12×9 de celdas de 48px (576×432) centrada en un canvas de resolución interna fija 800×600, con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`).
- Render 100% vectorial (sin assets bitmap): conductos como segmentos redondeados de neón, el flujo como un relleno claro que avanza dentro del tubo, cursor de colocación resaltado, la fuente de energía como celda especial, y una cola visible de las próximas piezas.
- Tipos de pieza de conducto (aperturas por lado, N/E/S/O): recta (2 aperturas opuestas), curva (2 aperturas adyacentes), T (3 aperturas) y cruce (4 aperturas, atravesable dos veces por segmentos independientes). Cada tipo se dibuja con su forma distinguible además del color.
- Celda fuente: al iniciar cada partida se coloca una celda fuente fija en un borde de la grilla con una única apertura hacia el interior; de ahí parte el flujo.
- Cola de piezas: una secuencia de las próximas `QUEUE_LEN` (5) piezas generadas al azar por tipo; el jugador siempre coloca la primera de la cola y la cola se recorre.
- Colocación: el jugador mueve un cursor por la grilla (`←↑↓→`) y coloca la pieza en mano sobre una celda **vacía** (`Espacio`/`Enter`), o hace clic/tap sobre una celda vacía para colocar ahí. La pieza en mano se puede **rotar** en su sitio antes de colocar (`R` o rueda), rotando su tabla de aperturas 90°.
- No se pueden sobrescribir celdas ya ocupadas por conducto ni la celda fuente; intentar colocar sobre una celda ocupada no hace nada (colocación inválida ignorada).
- Cuenta atrás inicial: tras cargar, hay `START_DELAY` segundos (con indicador visible) antes de que el flujo empiece a avanzar, para tender las primeras piezas.
- Avance del flujo: una vez iniciado, el flujo llena un conducto cada `flowIntervalMs` (acelerado por nivel). Al llenar por completo una celda, intenta pasar a la celda vecina en la dirección de salida del conducto; la transición es válida solo si la celda vecina existe, está ocupada y tiene una apertura hacia el lado por donde entra el flujo.
- Puntaje: cada conducto atravesado por el flujo suma `BASE_PIPE_POINTS` (10). Atravesar un cruce por su segundo segmento otorga un bono `CROSS_BONUS`. Una racha continua de conductos sin cortes multiplica ligeramente vía `STREAK_BONUS_EVERY` (bono cada N conductos seguidos).
- Progresión de nivel: cada `PIPES_PER_LEVEL` conductos atravesados sube el nivel (`onLevelChange`) y reduce `flowIntervalMs` (el flujo avanza más rápido), y acorta `START_DELAY` en partidas siguientes — mismo patrón "nivel = dificultad" que Asteroides/Tetris/Bloque Buster/Serpentina.
- Fin de partida: el flujo se **derrama** (game over) cuando, al terminar de llenar una celda, no existe una celda vecina válida por su salida (borde de la grilla, celda vacía, o vecina sin apertura de entrada). En ese instante el loop se congela (dibuja el último frame) e invoca `onGameOver(finalScore)`. No hay concepto de vidas.
- `CircuitoGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange`, `onPipesChange` (nuevo callback, mismo naming `on<Cosa>Change`, reporta el conteo de conductos atravesados), `onGameOver`. No expone `onLivesChange` — el concepto no existe en este juego.
- Generalizar el 4to stat del HUD externo en `GamePlayerClient.tsx`: extender el tipo `FourthStat` (introducido en SPEC 09, extendido en SPEC 15 con `time`) con una nueva variante `{ kind: "pipes" }` que muestra "Tubos" como valor numérico (sin corazones), para `circuito`, sin cambiar el render de Asteroides, Tetris, Bloque Buster ni Serpentina.
- `lib/types.ts`: agregar `"circuito"` a `REAL_SCORE_GAME_IDS`. `app/games/[id]/page.tsx` y `SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08) — no requieren cambios de lógica, solo que el nuevo `id` exista en `public.games`.
- `GamePlayerClient.tsx`: cuando `game.id === "circuito"`, montar `CircuitoGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "circuito", name, score })` (Supabase), igual que los otros juegos reales.
- Migración SQL (`INSERT`, no `UPDATE` — la fila `circuito` **no** existe todavía) en `public.games` con `id: "circuito"`, `title: "CIRCUITO"`, `short`/`long` descriptivos, `cat: "PUZZLE"`, `cover: "cover-circuito"`, `color: "green"`, `best: 0`, `plays: "0"`. Documentada como paso pendiente para quien implemente — **no la ejecuta el planner**.
- Clase `.cover-circuito` en `app/globals.css` para la portada del catálogo (gradiente neón en el mismo estilo que las demás `.cover-*`), documentada como paso pendiente.

**Out of scope (para futuras specs):**

- Piezas especiales / power-ups (bomba que limpia una zona, tubo comodín que conecta cualquier lado, acelerador/ralentizador de flujo) — se descartan en esta primera versión.
- Sobrescribir celdas ya ocupadas (mecánica de "reemplazo con penalización" de algunas variantes de Pipe Mania) — se descarta; solo se colocan piezas en celdas vacías.
- Objetivos de nivel al estilo "conecta la fuente A con la salida B" — se descarta; la única condición de fin es el derrame del flujo.
- Múltiples fuentes o múltiples flujos simultáneos.
- Arrastre (drag) para colocar; solo cursor+teclado y clic/tap simple en esta versión.
- Efectos de sonido (no se proveyeron assets de audio).
- Animaciones elaboradas más allá de la interpolación del relleno del flujo dentro de cada tubo.
- Controles táctiles/on-screen dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/CircuitoGame.tsx`** (nuevo, constantes internas):

```ts
const COLS = 12;
const ROWS = 9;
const CELL = 48; // px — grilla 576x432 centrada en canvas interno 800x600
const QUEUE_LEN = 5; // piezas visibles en la cola
const BASE_PIPE_POINTS = 10; // puntos por conducto atravesado
const CROSS_BONUS = 15; // bono al atravesar un cruce por su segundo segmento
const STREAK_BONUS_EVERY = 8; // bono cada N conductos seguidos sin derrame
const STREAK_BONUS = 50; // puntos del bono de racha
const PIPES_PER_LEVEL = 12; // conductos para subir de nivel
const START_DELAY_MS = 6000; // cuenta atrás inicial (nivel 1) antes del flujo
const BASE_FLOW_INTERVAL_MS = 1100; // ms para llenar un conducto (nivel 1)
const FLOW_SPEEDUP_PER_LEVEL = 90; // ms menos por nivel
const MIN_FLOW_INTERVAL_MS = 350; // piso de intervalo (no imposible)

// Lado de una celda; el flujo entra por uno y sale por otro.
type Side = "N" | "E" | "S" | "O";

// Tipo de pieza por su conjunto base de aperturas (antes de rotar).
type PieceType = "recta" | "curva" | "te" | "cruce";

type Piece = {
  type: PieceType;
  rot: 0 | 1 | 2 | 3; // rotaciones de 90° horario
  openings: Side[]; // lados con apertura, derivados de type+rot
  filled: Side[]; // segmentos ya recorridos por el flujo (para el cruce doble)
};

type Cell = Piece | null; // null = celda vacía; la fuente es una Piece marcada aparte

type BoardState = {
  grid: Cell[][]; // grid[row][col]; origen top-left
  source: { col: number; row: number; out: Side }; // celda fuente y su salida
  cursor: { col: number; row: number }; // celda resaltada para colocar
  queue: PieceType[]; // próximas piezas; queue[0] = pieza en mano
  handRot: 0 | 1 | 2 | 3; // rotación actual de la pieza en mano
  flow: {
    col: number; // celda que el flujo está llenando ahora
    row: number;
    enter: Side; // lado por el que el flujo entró a esta celda
    fillPct: number; // 0..100 de llenado de la celda actual
    active: boolean; // false durante START_DELAY
  };
  score: number;
  level: number;
  pipes: number; // conductos atravesados (métrica del 4to stat)
  streak: number; // conductos seguidos desde el último bono de racha
  countdownMs: number; // restante de START_DELAY (si active === false)
  status: "playing" | "paused" | "over";
};

export type CircuitoGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type CircuitoGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onPipesChange: (pipes: number) => void; // conductos atravesados
  onGameOver: (finalScore: number) => void;
};
```

Convenciones:

- Coordenadas: origen top-left; `grid[0]` es la fila superior; `N` apunta hacia filas de índice menor, `S` hacia mayor, `O` hacia columnas menores, `E` hacia mayores.
- Conectividad: dos celdas vecinas conectan si la que sale tiene apertura hacia el lado compartido y la que entra tiene apertura hacia el lado opuesto (`N↔S`, `E↔O`).
- El avance del flujo y la cuenta atrás usan un acumulador delta-time dentro del loop de `requestAnimationFrame` (mismo patrón que SPEC 09), independiente de la tasa de frames.
- Rotación: `openings` se recalcula rotando el conjunto base 90° horario por cada unidad de `rot` (`N→E→S→O→N`).

**`components/GamePlayerClient.tsx`** — extiende el tipo `FourthStat` (SPEC 09 + SPEC 15) con una variante `pipes`:

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" } // Serpentina
  | { kind: "time" } // Prisma
  | { kind: "pipes" }; // Circuito — conductos atravesados, sin corazones

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  // ...entradas existentes sin cambios...
  circuito: {
    fourthStat: { kind: "pipes" },
    suppressExternalPauseOverlay: false,
  },
};
```

El label ("Tubos") y su valor (`realPipes`, nuevo estado alimentado por `onPipesChange`, mismo patrón que `realLength`/`realTime`) se derivan de `fourthStat.kind`, sin tocar la lógica de los otros juegos.

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "circuito",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (el `id` `circuito` no existe):

- `id`: `circuito`
- `title`: `CIRCUITO`
- `short`: "Enruta el flujo de energía por el tubo más largo."
- `long`: "Toma conductos de la cola, rótalos y tiéndelos sobre la grilla para guiar el flujo de energía desde la fuente. Cada tubo que la corriente atraviesa suma puntos y los cruces valen doble; pero el flujo no espera: si llega a un extremo sin salida, se derrama y la partida termina. Cada nivel la corriente corre más rápido."
- `cat`: `PUZZLE`
- `cover`: `cover-circuito`
- `color`: `green`
- `best`: `0`
- `plays`: `0`

**`app/globals.css`** — nueva clase `.cover-circuito` (gradiente neón verde, mismo estilo que las demás `.cover-*`).

## Implementation plan

1. Documentar y dejar listo (para quien implemente) el `INSERT` en `public.games` de la fila `circuito` (vía `apply_migration`) y la clase `.cover-circuito` en `app/globals.css`. Tras esto, `/games/circuito` y la portada en `/games` cargan la ficha del nuevo juego con el copy y la portada correctos, todavía apuntando a la simulación falsa (aún no está en `REAL_SCORE_GAME_IDS`). Verificable sin tocar ningún componente de juego.

2. Crear `components/games/CircuitoGame.tsx` con el **modelo de piezas y conectividad** puro: tipos `PieceType`/`Side`/`Piece`, la tabla de aperturas base por tipo, el helper de rotación (`rot` → `openings`), y el helper de conectividad entre dos celdas vecinas. Compila aislado; todavía no se importa desde ninguna página.

3. Implementar en el mismo componente el **estado de tablero y la colocación**: `BoardState`, generación de la fuente en un borde, la cola de `QUEUE_LEN` piezas, el cursor, colocación de la pieza en mano en celdas vacías (rechazando ocupadas), y la rotación de la pieza en mano. Lógica pura, aún sin flujo ni render.

4. Implementar la **lógica del flujo**: la cuenta atrás inicial (`countdownMs`), el avance por acumulador delta-time (llenar la celda actual `fillPct`, al 100% calcular la celda de salida y validar la transición), el conteo de conductos atravesados, el marcado de segmentos `filled` para el cruce doble, el puntaje (`BASE_PIPE_POINTS` + `CROSS_BONUS` + `STREAK_BONUS`), la progresión de nivel (`PIPES_PER_LEVEL` → reduce `flowIntervalMs`), y la detección de derrame → fin. Lógica pura, aún sin render.

5. Agregar **render en canvas**: ajuste por `devicePixelRatio` (patrón `BloqueBusterGame`), dibujo de la grilla y la fuente, conductos vectoriales por tipo+rotación, el relleno del flujo interpolado dentro del tubo activo, resaltado del cursor, la cola de próximas piezas y el HUD interno mínimo (score/nivel/tubos/cuenta atrás). Sigue sin montarse en ninguna página.

6. Agregar **controles, ciclo de pausa/fin y props/handle**: listeners de teclado (`←↑↓→` mueven el cursor, `R` rota la pieza en mano, `Espacio`/`Enter` coloca) y de puntero (clic/tap coloca en la celda pulsada), props (`onScoreChange`, `onLevelChange`, `onPipesChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al derramarse el flujo, el loop se congela e invoca `onGameOver(finalScore)`. Sigue sin montarse.

7. Generalizar `components/GamePlayerClient.tsx`: extender `FourthStat` con `{ kind: "pipes" }` y agregar el estado `realPipes` (mismo patrón que `realLength`/`realTime`), **sin** agregar todavía `"circuito"` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para Asteroides/Tetris/Bloque Buster/Serpentina — verificable jugando cada uno antes de continuar.

8. En un solo paso atómico: agregar `"circuito"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "pipes" }`, `suppressExternalPauseOverlay: false`); montar `CircuitoGame` en el switch de `GamePlayerClient` cuando `game.id === "circuito"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "circuito", name, score })`. `/games/circuito/jugar` queda jugable de verdad con guardado real en Supabase; `/games/circuito` y la pestaña "CIRCUITO" de `/salon` pasan a usar el leaderboard real.

9. Pasada final: verificación manual en navegador del flujo completo (colocar y rotar conductos durante la cuenta atrás, ver la corriente avanzar y encender los tubos, atravesar un cruce por sus dos segmentos, sumar bono de racha, subir de nivel notando el flujo más rápido, provocar un derrame, pausar/reanudar, "FIN", guardar puntuación y verla en `/games/circuito` y `/salon`, y que Asteroides/Tetris/Bloque Buster/Serpentina y los 4 placeholders sigan intactos tras el refactor del paso 7), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` tiene una fila `id = 'circuito'` con `title` `CIRCUITO`, `cat` `PUZZLE`, `cover` `cover-circuito`, `color` `green`, y `short`/`long` descriptivos del enrutamiento de flujo.
- [ ] `/games/circuito` carga la ficha del juego con su portada `.cover-circuito` y el copy, sin errores en consola.
- [ ] `/games/circuito/jugar` renderiza el canvas real (grilla 12×9 con fuente y cola de piezas) dentro de `.crt-screen`, en vez de un placeholder `.game-arena`.
- [ ] Durante la cuenta atrás inicial el flujo no avanza y el jugador puede colocar y rotar piezas.
- [ ] Colocar una pieza solo funciona en celdas vacías; intentar colocar sobre una celda ocupada o la fuente no cambia el tablero.
- [ ] Rotar la pieza en mano cambia su orientación en pasos de 90° antes de colocarla.
- [ ] El flujo avanza de la fuente a la celda vecina solo si esta está ocupada y tiene apertura hacia el lado por el que entra la corriente.
- [ ] Cada conducto atravesado suma exactamente `BASE_PIPE_POINTS` (10); atravesar un cruce por su segundo segmento otorga además `CROSS_BONUS`.
- [ ] Cada `PIPES_PER_LEVEL` conductos sube el nivel y el flujo se vuelve perceptiblemente más rápido, con un piso `MIN_FLOW_INTERVAL_MS`.
- [ ] Cuando el flujo termina de llenar una celda sin salida válida (borde, celda vacía o vecina sin apertura), se dispara `onGameOver` con el score final.
- [ ] El 4to stat del HUD externo muestra "Tubos" con el conteo de conductos atravesados (no corazones, ni "Líneas", "Longitud" o "Tiempo") mientras se juega Circuito.
- [ ] "PAUSA" congela el juego (flujo y cuenta atrás incluidos) y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar al derrame.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "circuito"` (vía `insertScore`), y aparece en `/games/circuito` y en la pestaña "CIRCUITO" de `/salon`.
- [ ] "JUGAR DE NUEVO" reinicia a un estado limpio (score 0, nivel 1, grilla vacía con fuente nueva, cuenta atrás llena); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor del 4to stat, Asteroides, Tetris, Bloque Buster y Serpentina siguen mostrando "Vidas"/"Líneas"/"Longitud" exactamente igual que antes.
- [ ] Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando su estado actual sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** enrutamiento de flujo estilo Pipe Mania (colocar conductos de una cola bajo presión de un flujo que avanza). **No:** un match-3, un slide-merge o una caída de piezas — ya cubiertos por `prisma`, `fusion` y Tetris; el objetivo del lote es novedad de mecánica dentro de PUZZLE.
- **Yes:** flujo en tiempo real que avanza celda a celda y acelera por nivel, como condición de fin y de dificultad. **No:** modo turn-based "resuelve el tablero sin reloj" — el flujo en tiempo real es lo que da tensión y un puntaje limpio y competible; sin él sería un puzzle estático poco apto para leaderboard.
- **Yes:** permitir rotar la pieza en mano antes de colocar. **No:** orientación fija como el Pipe Mania original — la rotación aprovecha el hint "rompecabezas de rotación/enrutamiento", da control con teclado y añade profundidad sin complicar el modelo (la tabla de aperturas ya se rota).
- **Yes:** solo colocar en celdas vacías. **No:** sobrescribir conductos ya puestos (con penalización) — se descarta para la primera versión por simplicidad; puede ir en otra spec.
- **Yes:** pieza "cruce" atravesable dos veces con segmentos `filled` independientes y bono. **No:** cruce como simple 4-vías atravesable una vez — el doble paso es la mecánica clásica que premia planificar y encaja con el bono de puntaje.
- **Yes:** 4to stat "Tubos" (conductos atravesados) generalizando `FourthStat` con `{ kind: "pipes" }`. **No:** reutilizar `time`/`lines` o forzar vidas ficticias — menos honesto con la mecánica; SPEC 09/15 ya sentaron el precedente de generalizar por `kind`.
- **Yes:** render 100% vectorial de conductos y flujo. **No:** sprites bitmap — no se proveyeron assets y los segmentos vectoriales bastan para 4 tipos distinguibles.
- **Yes:** color `green` (libre en PUZZLE: Tetris=magenta, `prisma`=cyan, `fusion`=yellow). **No:** repetir un color ya usado en la categoría — `green` refuerza además la lectura "energía/circuito".
- **Yes:** leaderboard real en Supabase (`insertScore`), agregando `circuito` a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`) — es un juego real completo, consistente con los 4 juegos reales existentes.
- **Yes:** `INSERT` de fila nueva + clase `.cover-circuito`, documentados como pasos pendientes para quien implemente. **No:** que el planner ejecute la migración — fuera de su rol.

## Risks

| Risk                                                                                             | Mitigation                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La conectividad entre celdas (aperturas por lado y rotación) puede cortar o alargar mal el flujo | Tabla de aperturas base por tipo + rotación determinista (`N→E→S→O`); un único helper `conecta(a, ladoSalida, b)` valida apertura de salida y de entrada opuesta, usado en un solo lugar. |
| El ritmo del flujo vs. la cuenta atrás inicial puede volverse trivial o injusto                  | Constantes `START_DELAY_MS`, `BASE_FLOW_INTERVAL_MS`, `FLOW_SPEEDUP_PER_LEVEL` con piso `MIN_FLOW_INTERVAL_MS`; afinables en prueba manual sin tocar la lógica.                           |
| El flujo desacoplado del render podría avanzar de más en frames largos o pausas mal manejadas    | Avance por acumulador delta-time acotado por frame (patrón SPEC 09); en pausa el acumulador no avanza y `resume()` continúa desde el `fillPct` exacto.                                    |
| El cruce atravesable dos veces puede contarse doble o quedar bloqueado                           | Segmentos `filled` por lado independientes; el flujo solo pasa por el segmento cuyo par de lados no está lleno, y el bono se otorga una vez por segundo segmento.                         |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `"circuito"`              | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec.                                                                         |

## What is **not** in this spec

- Piezas especiales / power-ups (bomba, comodín, acelerador/ralentizador).
- Sobrescribir celdas ocupadas con penalización.
- Objetivos de nivel tipo "conecta la fuente A con la salida B".
- Múltiples fuentes o flujos simultáneos.
- Arrastre (drag) para colocar.
- Efectos de sonido.
- Animaciones elaboradas más allá de la interpolación del relleno del flujo.
- Controles táctiles/on-screen dedicados para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
</content>
</invoke>
