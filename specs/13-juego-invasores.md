# SPEC 13 — Juego Invasores

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real, 4to stat "Vidas"/corazones y disparo en canvas), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización de `fourthStat` en `GamePlayerClient`)
> **Date:** 2026-07-23
> **Objective:** Activar el placeholder `invasores` con jugabilidad real construyendo `components/games/InvasoresGame.tsx` — un Space Invaders clásico: cañón que barre horizontal contra una formación de invasores que desciende por oleadas de velocidad creciente, con búnkeres destructibles — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

`invasores` es uno de los cuatro placeholders que aún muestran la simulación falsa (`.game-arena` + puntaje aleatorio). Su fila ya existe en `public.games` (`cat = SHOOTER`, `color = green`, `cover = cover-invaders`), así que activarlo no requiere migración de schema, solo el componente de canvas y su integración — la prioridad "placeholder-first" del planner. La mecánica (formación en lockstep que desciende, cañón que barre en horizontal, búnkeres que se erosionan) no solapa con la de Asteroides, el otro juego SHOOTER real, que es vuelo libre con inercia y rotación. El puntaje es puntos-por-invasor más oleadas, individual y muy apto para leaderboard real en Supabase, igual que los cinco juegos reales ya existentes.

Nota de balance: SHOOTER ya tiene un juego real (Asteroides), por lo que `invasores` cedió la prioridad principal frente a `duelo-pixel` (VERSUS, la categoría más flaca). Esta spec queda en `Draft` como candidato secundario ya priorizado por "placeholder-first"; su aprobación es de un humano vía `/spec`.

## Scope

**In:**

- Construir `components/games/InvasoresGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de componente de la skill `add-game`: `"use client"`, canvas de resolución interna fija 800×600 escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), loop propio con `requestAnimationFrame`.
- Cañón del jugador anclado cerca del borde **inferior**, que solo se mueve en horizontal (acotado a los bordes del canvas). Controles: `←`/`→` mueven el cañón; `Espacio` dispara un proyectil hacia arriba. Regla clásica: **un solo proyectil del jugador en pantalla a la vez** (no puede volver a disparar hasta que el disparo anterior impacte o salga por arriba). Sin otros controles.
- Formación de invasores en grilla (`ROWS` filas × `COLS` columnas). La formación se mueve en **lockstep** horizontal a pasos discretos; cuando el invasor más al borde toca un lado del canvas, toda la formación **baja** un escalón (`DROP`) e invierte el sentido horizontal.
- Velocidad creciente **dentro de la oleada**: el intervalo entre pasos de la formación decrece conforme quedan menos invasores vivos (menos invasores = pasos más frecuentes = formación más rápida), reproduciendo la aceleración icónica del original.
- Disparos de los invasores: de forma periódica/aleatoria, un invasor de la fila inferior de su columna lanza una "bomba" que viaja hacia abajo (`BOMB_SPEED`). Puede haber varias bombas en pantalla a la vez (acotado por `MAX_BOMBS`).
- Búnkeres destructibles: `BUNKERS` escudos entre el cañón y la formación, cada uno representado como una grilla de bloques pequeños. Tanto los disparos del jugador (hacia arriba) como las bombas de los invasores (hacia abajo) erosionan los bloques que impactan y se descartan al impactar. Los búnkeres no bloquean el paso de la formación (solo de los proyectiles).
- Puntaje: cada invasor destruido suma puntos según su fila (`ROW_POINTS`: las filas del fondo, más lejanas, valen más que las del frente). No hay bono explícito por oleada; el score crece por invasores destruidos y por sobrevivir oleadas cada vez más rápidas.
- Oleadas: limpiar toda la formación gana la oleada, sube el nivel (`onLevelChange`) y genera una formación nueva que **arranca una fila más abajo** que la anterior (hasta un tope) y con el intervalo base de pasos reducido, endureciendo la dificultad. Los búnkeres se regeneran al iniciar cada oleada.
- Sistema de vidas (reutiliza el 4to stat `hearts` existente): el jugador empieza con 3 vidas. Una bomba que impacta el cañón resta 1 vida (`onLivesChange`), limpia las bombas en pantalla y reaparece el cañón en su posición inicial tras una breve pausa; el score y la oleada no cambian. Que **cualquier invasor alcance la fila del cañón (borde inferior)** termina la partida de inmediato sin importar las vidas restantes. Perder la última vida también congela el loop e invoca `onGameOver(finalScore)`.
- `InvasoresGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático: al perder (0 vidas o invasores en la base) el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "invasores"`, montar `InvasoresGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "invasores", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"invasores"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 06/08/09) — verificar que no requieren más cambios.
- `public.games`: la fila existente `invasores` ya tiene `short`/`long` que describen jugabilidad real ("Defiende el planeta de filas alienígenas." / "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie."). Un `UPDATE` de copy es **opcional** y a criterio de `/spec`; `cover` (`cover-invaders`), `color` (`green`), `cat` (`SHOOTER`), `best` y `plays` no cambian.

**Out of scope (para futuras specs):**

- Nave nodriza / OVNI misterioso (mystery UFO) que cruza la parte superior por puntos extra — iría en su propia spec para mantener contenida la primera versión.
- Multiplayer o modo cooperativo.
- Power-ups (disparo múltiple, escudo, cañón extra).
- Física 3D o assets bitmap/audio pesados — el render es vectorial (formas simples de canvas).
- Controles táctiles/on-screen para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija la oleada + los invasores restantes).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/InvasoresGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px)

const COLS = 11; // columnas de la formación
const ROWS = 5; // filas de la formación (55 invasores en total)
const INV_W = 30; // ancho de un invasor (px)
const INV_H = 22; // alto de un invasor (px)
const INV_GAP_X = 16; // separación horizontal entre invasores (px)
const INV_GAP_Y = 14; // separación vertical entre filas (px)
const STEP_X = 12; // desplazamiento horizontal por paso de la formación (px)
const DROP = 20; // descenso vertical al tocar un borde (px)

const START_LIVES = 3; // vidas del jugador (corazones del 4to stat)
const PLAYER_SPEED = 5; // px/frame del cañón (horizontal)
const SHOT_SPEED = 9; // px/frame del disparo del jugador (hacia arriba)
const BOMB_SPEED = 4; // px/frame de las bombas de los invasores (hacia abajo)
const MAX_BOMBS = 3; // bombas simultáneas máximas en pantalla

const BUNKERS = 4; // número de búnkeres
const BUNKER_COLS = 8; // bloques por fila de un búnker
const BUNKER_ROWS = 6; // filas de bloques de un búnker
const BUNKER_CELL = 10; // lado de un bloque de búnker (px)

// Puntos por fila (índice 0 = fila del frente/inferior; el fondo vale más)
const ROW_POINTS = [10, 20, 20, 30, 30] as const;

// Intervalo base (frames) entre pasos de la formación al inicio de una oleada.
// Se reduce por oleada y, dentro de la oleada, según invasores vivos.
const STEP_INTERVAL_BASE = 42; // frames al arrancar la oleada 1 con 55 vivos
const STEP_INTERVAL_MIN = 6; // piso: la formación no acelera más allá de esto

type Vec = { x: number; y: number };

type Invader = {
  col: number;
  row: number; // índice de fila (0 = frente)
  alive: boolean;
  pos: Vec; // esquina top-left del invasor
};

type Shot = { pos: Vec; vy: number }; // disparo del jugador (vy < 0)
type Bomb = { pos: Vec; vy: number }; // bomba de invasor (vy > 0)

type Bunker = {
  origin: Vec; // esquina top-left del búnker
  cells: boolean[][]; // [row][col], true = bloque intacto
};

type InvasoresState = {
  player: Vec; // esquina top-left del cañón (solo cambia x)
  dir: 1 | -1; // sentido horizontal actual de la formación
  invaders: Invader[];
  shot: Shot | null; // un solo disparo del jugador a la vez
  bombs: Bomb[];
  bunkers: Bunker[];
  stepTimer: number; // frames restantes hasta el próximo paso de la formación
  score: number;
  lives: number;
  level: number; // oleada actual, empieza en 1
  status: "playing" | "paused" | "over";
};

export type InvasoresGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type InvasoresGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left.
- Velocidades y desplazamientos en px/frame o px/paso.
- La formación se mueve en **lockstep discreto**: cada `stepTimer` que llega a 0, todos los invasores vivos se desplazan `STEP_X * dir`; si alguno tocaría un borde, en vez de eso toda la formación baja `DROP` e invierte `dir`.
- Aceleración de la formación: `stepInterval = clamp(STEP_INTERVAL_BASE - wavePenalty - (aliveInicial - aliveAhora) * k, STEP_INTERVAL_MIN, STEP_INTERVAL_BASE)` — menos vivos ⇒ intervalo menor ⇒ más rápido. Los coeficientes exactos (`wavePenalty`, `k`) se afinan a mano en la prueba manual del paso 7.
- El jugador solo varía `x`; los búnkeres son estáticos; las colisiones son AABB simples (proyectil ↔ invasor, proyectil ↔ celda de búnker, bomba ↔ cañón, bomba ↔ celda de búnker).

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `invasores` a `REAL_GAME_CONFIG`:

```ts
invasores: {
  fourthStat: { kind: "hearts" }, // 3 vidas -> corazones, igual que Asteroides
  suppressExternalPauseOverlay: false,
},
```

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "invasores",
] as const;
```

**`public.games`** — la fila `invasores` ya existe con `short`/`long` que describen jugabilidad real, `cover-invaders` (clase ya presente en `app/globals.css`), `color = green`, `cat = SHOOTER`. Un `UPDATE` de solo texto (`short`/`long`) es **opcional** y queda a criterio de `/spec` para afinar el copy; `cover`, `color`, `cat`, `best`, `plays` no cambian. Esta spec **no** introduce assets nuevos (render 100% vectorial) ni una clase `.cover-*` nueva.

## Implementation plan

1. (Opcional / a criterio de `/spec`) Migración de contenido (no de schema): `UPDATE public.games SET short = ..., long = ... WHERE id = 'invasores'` si se decide afinar el copy. La fila actual ya describe jugabilidad real, así que este paso puede omitirse. **Nota:** de ejecutarse, esta migración la corre quien implemente vía `apply_migration`; el planner no la ejecuta.

2. Crear `components/games/InvasoresGame.tsx` con el esqueleto `forwardRef` + `<canvas>` 800×600 y un loop `requestAnimationFrame` vacío (solo limpia y dibuja el fondo estelar y el cañón). Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **cañón y su disparo**: movimiento horizontal con `←`/`→` acotado a los bordes, disparo con `Espacio` con la regla de un solo `shot` en pantalla, avance del disparo hacia arriba y su descarte al salir por el borde superior. Dibujo vectorial del cañón y del disparo. Sin formación todavía.

4. Implementar la **formación y su movimiento lockstep**: generar la grilla `ROWS × COLS` de `Invader`, mover en pasos discretos con `stepTimer`, bajar `DROP` e invertir `dir` al tocar un borde (calculado sobre el invasor vivo más al borde), y la aceleración por invasores restantes. Colisión disparo↔invasor: marca `alive = false`, descarta el `shot`, suma `ROW_POINTS[row]` al score. Dibujo de los invasores (dos frames de animación simple por parpadeo opcional). Sigue sin montarse.

5. Implementar **bombas de invasores y búnkeres**: emisión periódica/aleatoria de bombas desde el invasor vivo más bajo de una columna al azar (acotado por `MAX_BOMBS`), avance hacia abajo y descarte al salir por el borde inferior; generación de los `BUNKERS` búnkeres como grillas de celdas; colisiones AABB disparo↔celda y bomba↔celda (apaga la celda y descarta el proyectil); colisión bomba↔cañón. Sigue sin montarse.

6. Implementar el **ciclo de oleadas/vidas y los callbacks**: limpiar toda la formación gana la oleada (`onLevelChange`, nueva formación una fila más abajo y con intervalo base menor, búnkeres regenerados); una bomba que impacta el cañón resta 1 vida (`onLivesChange`), limpia bombas y reaparece el cañón sin tocar score ni oleada; cualquier invasor que alcance la fila del cañón, o perder la última vida, congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

7. En un solo paso atómico: agregar `"invasores"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `InvasoresGame` en `GamePlayerClient` cuando `game.id === "invasores"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "invasores", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/invasores/jugar` queda jugable de verdad con guardado real en Supabase.

8. Pasada final: verificación manual en navegador del flujo completo (mover el cañón con `←`/`→`, disparar con `Espacio` y confirmar un solo disparo a la vez, derribar invasores y ver subir el score según la fila, notar la formación acelerar conforme quedan menos, erosionar un búnker desde ambos lados, recibir una bomba y ver bajar un corazón, limpiar una oleada y notarla arrancar más abajo/rápida, perder por invasor en la base y por 0 vidas disparando el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/invasores` y en la pestaña "INVASORES" de `/salon`, y confirmar que los otros juegos reales y los 3 placeholders restantes siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games/invasores/jugar` renderiza el canvas real del juego (cañón abajo, formación de invasores en grilla, búnkeres, disparos y bombas) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] `←`/`→` mueven el cañón en horizontal sin salirse del canvas.
- [ ] `Espacio` dispara un proyectil hacia arriba; no puede haber más de un disparo del jugador en pantalla a la vez (no dispara un chorro continuo).
- [ ] La formación se mueve en lockstep, baja un escalón e invierte el sentido al tocar un borde, y acelera perceptiblemente conforme quedan menos invasores vivos.
- [ ] Un disparo del jugador que impacta un invasor lo elimina, descarta el disparo y suma exactamente los puntos de su fila (`ROW_POINTS`).
- [ ] Los invasores lanzan bombas hacia abajo (hasta `MAX_BOMBS` a la vez) que descienden y salen por el borde inferior si no impactan nada.
- [ ] Los disparos del jugador y las bombas de los invasores erosionan las celdas de los búnkeres que impactan y se descartan al hacerlo.
- [ ] Limpiar toda la formación sube el nivel (4to stat "Nivel"), arranca una oleada nueva una fila más abajo y más rápida, y regenera los búnkeres.
- [ ] Una bomba que impacta el cañón resta exactamente 1 vida (un corazón menos en el HUD) sin cambiar el score ni la oleada, y reaparece el cañón en su posición inicial.
- [ ] Que cualquier invasor alcance la fila del cañón termina la partida de inmediato (modal de "FIN") sin importar las vidas restantes.
- [ ] Perder la última vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Invasores.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `InvasoresGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "invasores"` (vía `insertScore`).
- [ ] `/games/invasores` y la pestaña "INVASORES" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los otros 5 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`, `duelo-pixel`) y los 2 placeholders restantes (`gloton`, `ranaria`) siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** cañón que solo se mueve en horizontal y dispara vertical con un único disparo en pantalla, al estilo del Space Invaders clásico. **No:** vuelo libre con inercia/rotación — esa es la mecánica de Asteroides (el otro SHOOTER real) y solaparía; la formación descendente es justamente lo que diferencia a Invasores.
- **Yes:** formación en lockstep discreto que baja y rebota en los bordes, con aceleración por invasores restantes. **No:** movimiento continuo suave por frame — el paso discreto reproduce la sensación icónica y simplifica la lógica de rebote/aceleración.
- **Yes:** búnkeres como grilla de celdas booleanas que se apagan por impacto (erosión desde ambos lados). **No:** destrucción por-píxel sobre un `ImageData` — la grilla de celdas es más simple, barata y suficiente para la sensación de escudo que se desmorona.
- **Yes:** reutilizar el 4to stat `hearts` ya existente para las 3 vidas. **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09.
- **Yes:** dificultad que escala por oleada (arranca más abajo, intervalo base menor) y dentro de la oleada (menos invasores ⇒ más rápido). **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad" de los otros juegos.
- **Yes:** invasor que llega a la fila del cañón = fin inmediato sin importar vidas, fiel al original. **No:** restar solo una vida en ese caso — desvirtuaría la presión de "no dejarlos bajar".
- **Yes:** puntaje = puntos por invasor según fila, individual y apto para leaderboard real en Supabase (`insertScore`). **No:** simulación local (`pushScore`/`seededScores`) — este sería el 6to juego que pasa de placeholder a real, consistente con los anteriores.
- **Yes:** render 100% vectorial (formas simples de canvas), sin assets. **No:** sprites bitmap o audio — no se proveyeron assets y no son necesarios para la mecánica.
- **Yes:** dejar `short`/`long` y la fila `invasores` como están (ya describen jugabilidad real, `cover-invaders` ya existe). **No:** `INSERT` de una fila nueva ni clase `.cover-*` nueva — no hace falta migración de schema.
- **No (out of scope):** nave nodriza / OVNI misterioso superior — se deja para una spec futura para mantener contenida la primera versión.

## Risks

| Risk                                                                                                                            | Mitigation                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La curva de aceleración se siente injusta: la formación se vuelve ingobernable con pocos invasores o demasiado lenta al inicio. | `stepInterval` con `clamp` entre `STEP_INTERVAL_MIN` y `STEP_INTERVAL_BASE` y coeficientes (`wavePenalty`, `k`) afinados a mano en la prueba manual del paso 8; la oleada 1 arranca suave.           |
| La colisión con la grilla de celdas de búnker es densa y puede degradar el rendimiento con muchos proyectiles.                  | Solo hay un disparo del jugador y ≤`MAX_BOMBS` bombas a la vez; las AABB se prueban solo contra el búnker cuyo bounding-box contiene el proyectil, no contra todas las celdas de todos los búnkeres. |
| El rebote de la formación se calcula mal (usa un invasor ya muerto) y la formación se sale del canvas.                          | El borde se calcula sobre el min/max `x` de los invasores **vivos**; se cubre en la prueba manual derribando columnas extremas y verificando el rebote.                                              |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `invasores`.                                             | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                               |

## What is **not** in this spec

- Nave nodriza / OVNI misterioso superior por puntos extra.
- Multiplayer o modo cooperativo.
- Power-ups (disparo múltiple, escudo, cañón extra).
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
