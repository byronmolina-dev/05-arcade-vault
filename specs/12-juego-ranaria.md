# SPEC 12 — Juego Ranaria (Frogger)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización de `fourthStat` en `GamePlayerClient` y juego en grid construido desde cero)
> **Date:** 2026-07-23
> **Objective:** Activar el placeholder `ranaria` con jugabilidad real construyendo `components/games/RanariaGame.tsx` — un Frogger en grid donde una rana cruza una autopista de coches y un río de troncos hasta los nenúfares — con vidas (corazones) y leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

`ranaria` ya existe como fila en `public.games` (`cat: ARCADE`, `color: green`, `cover: cover-rana`) pero es un placeholder sin jugabilidad: `/games/ranaria/jugar` muestra la simulación falsa (`.game-arena`) y su leaderboard es simulado. Su copy actual ("Cruza la autopista de pixeles… Salta entre carriles de coches… troncos a la deriva en el río… Llega a los nenúfares") ya describe un Frogger clásico; esta spec lo hace real.

Sobre el balance de categorías: ARCADE es la categoría más poblada (bloque-buster y serpentina reales, más gloton y ranaria placeholders), así que normalmente se evita sumar otro ARCADE. La excepción aplica aquí porque (a) es **placeholder-first** — activar una fila que ya existe, sin migración de schema ni inventar un id nuevo — y (b) la mecánica de "cruzar carriles evitando obstáculos y montarse en plataformas móviles" es **claramente distinta** de las otras dos ARCADE reales: no es rebote de pelota con paleta (Bloque Buster) ni serpiente que crece en grid (Serpentina). Es la única mecánica del catálogo con desplazamiento vertical hacia una meta sorteando tráfico lateral, así que aporta novedad competible sin solaparse con nada existente ni con los candidatos ya registrados (`duelo-pixel` VERSUS 1v1, `invasores` shooter de formación).

## Scope

**In:**

- Construir `components/games/RanariaGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de la skill `add-game`: `"use client"`, canvas de resolución interna fija 800×600 escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), loop propio con `requestAnimationFrame`.
- Grid de 20×15 celdas (celda de 40px), origen top-left. Distribución de filas por franjas (de arriba hacia abajo): fila 0 = zona de meta con 5 nenúfares; filas 1–5 = río (5 carriles de troncos/tortugas flotantes); fila 6 = mediana de césped (zona segura); filas 7–13 = autopista (7 carriles de coches); fila 14 = orilla de salida (zona segura). Los conteos exactos de carriles viven en una tabla de configuración interna y son afinables en `/spec`.
- Movimiento de la rana por saltos discretos: `↑`/`↓`/`←`/`→` mueven la rana una celda por pulsación, acotada a los bordes del canvas. Cada salto es instantáneo (no interpolado); la orientación visual de la rana sigue la última dirección.
- Autopista: cada carril de coches tiene un sentido (`+1`/`-1`), una velocidad (px/frame) y un patrón de espaciado. Si la celda de la rana solapa un coche, la rana muere (pierde 1 vida).
- Río: cada carril de troncos/tortugas tiene sentido, velocidad y espaciado. Sobre el río la rana **debe** estar montada en un objeto flotante: mientras lo está, su `x` se desplaza con la velocidad de ese objeto (arrastre). Si la rana queda en una celda de agua no cubierta por ningún flotante, se ahoga (pierde 1 vida). Si un flotante arrastra a la rana fuera del borde izquierdo o derecho del canvas, también muere.
- Nenúfares (meta): llegar a un nenúfar libre en la fila 0 lo marca como ocupado, suma `PAD_POINTS` (+50) más un bono de tiempo (`TIME_BONUS_PER_SEC` × segundos restantes), y reinicia la rana en la orilla de salida (fila 14) con el temporizador lleno. Llegar a un nenúfar ya ocupado, o aterrizar sobre el divisor entre nenúfares (no sobre un slot válido), cuenta como muerte (pierde 1 vida).
- Puntos por avance: la primera vez que la rana alcanza una fila más adelantada que su récord de esta vida (`furthestRow`) suma `HOP_POINTS` (+10). Retroceder no resta ni vuelve a puntuar filas ya contadas.
- Temporizador por vida: cada intento arranca con `TIME_LIMIT_MS` (30s) que descuenta en tiempo real; llegar a 0 mata a la rana (pierde 1 vida). El temporizador se reinicia al empezar una vida nueva y al llegar a un nenúfar.
- Progresión de nivel: llenar los 5 nenúfares completa el nivel — suma `LEVEL_BONUS` (+200), sube el nivel (`onLevelChange`), vacía los nenúfares, aumenta las velocidades de los carriles (mismo patrón "nivel = dificultad" que Asteroides/Tetris/Bloque Buster/Serpentina) y reinicia la rana en la orilla con temporizador lleno.
- Sistema de vidas (reutiliza el 4to stat `hearts` existente, sin generalizar nada): la rana empieza con `START_LIVES` (3) vidas. Cada muerte resta 1 vida (`onLivesChange`), reinicia la posición en la orilla y el temporizador, **sin** vaciar los nenúfares ya conseguidos y **sin** cambiar el score. Perder la última vida congela el loop (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. Sin overlay interno de "game over" ni reinicio automático — el único modal de fin es el de `GamePlayerClient`.
- `RanariaGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "ranaria"`, montar `RanariaGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG` (ya soportado desde SPEC 05/09, sin tocar el render del HUD), y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "ranaria", name, score })` en `handleSaveScore`.
- Leaderboard real: agregar `"ranaria"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: `UPDATE` (no migración de schema) sobre la fila existente `ranaria`, afinando `short`/`long` para que describan la mecánica real activada. El copy placeholder actual ya es un Frogger, así que el cambio es menor. `cover` (`cover-rana`), `color` (`green`), `cat` (`ARCADE`), `best` y `plays` no cambian.

**Out of scope (para futuras specs):**

- Sprites bitmap o assets de audio — el render es 100% vectorial (formas simples de canvas); no se proveyeron assets para este juego en `references/source-assets/`.
- Enemigos extra del Frogger clásico (serpientes sobre los troncos, cocodrilos, mosca/insecto bonus en un nenúfar).
- Tortugas que se sumergen periódicamente (todas las plataformas del río flotan de forma estable en esta spec).
- Power-ups, vidas extra por puntaje, o carriles con patrones aleatorios entre partidas.
- Controles táctiles/on-screen para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Nueva clase `.cover-*` o `INSERT` de fila — `ranaria` ya existe en `public.games` con `cover-rana`.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/RanariaGame.tsx`** (nuevo, constantes internas):

```ts
const CELL = 40; // px — canvas interno 800x600 -> grid de 20x15 celdas
const COLS = 20;
const ROWS = 15;
const START_LIVES = 3; // vidas de la rana (corazones del 4to stat)
const HOP_POINTS = 10; // puntos al alcanzar una fila más adelantada que nunca esta vida
const PAD_POINTS = 50; // puntos al llegar a un nenúfar libre
const LEVEL_BONUS = 200; // puntos al llenar los 5 nenúfares
const TIME_LIMIT_MS = 30000; // tiempo por vida antes de morir (ms)
const TIME_BONUS_PER_SEC = 2; // puntos por segundo restante al llegar a un nenúfar
const NUM_PADS = 5; // nenúfares en la fila de meta

// Configuración de carriles (índice = fila del grid). Afinable en /spec.
type LaneKind = "safe" | "road" | "river";
type Lane = {
  row: number; // fila del grid (0 = arriba)
  kind: LaneKind;
  dir: 1 | -1; // sentido del scroll de sus objetos
  speed: number; // px/frame (base; escala por nivel)
  span: number; // largo de cada objeto (coche/tronco) en celdas
  gap: number; // separación entre objetos (px)
};

type Frog = {
  x: number; // px, centro de la rana (continuo para viajar sobre troncos)
  row: number; // fila actual del grid (0..14)
  facing: "up" | "down" | "left" | "right";
};

type RanariaState = {
  frog: Frog;
  laneOffsets: number[]; // desplazamiento acumulado por carril (px), avanza cada frame
  furthestRow: number; // fila más adelantada alcanzada esta vida (menor = más lejos)
  pads: boolean[]; // NUM_PADS nenúfares: true = ocupado
  timeLeftMs: number;
  score: number;
  lives: number;
  level: number; // empieza en 1
  status: "playing" | "paused" | "over";
};

export type RanariaGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type RanariaGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left; fila 0 arriba (meta), fila 14 abajo (salida).
- Velocidades en px/frame; el temporizador se descuenta con delta-time real (ms), independiente de la tasa de frames.
- Las posiciones de los coches/troncos de cada carril se derivan de `laneOffsets[row] + k * (span*CELL + gap)`, envolviendo módulo el ancho lógico del carril — no hay arrays de objetos persistentes que crear/destruir.
- La rana salta de celda en celda; su `x` se snap-ea al centro de celda al saltar en tierra/autopista, pero se vuelve continuo mientras la arrastra un tronco en el río.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo `kind`). Solo agrega la entrada de `ranaria` a `REAL_GAME_CONFIG`:

```ts
ranaria: {
  fourthStat: { kind: "hearts" }, // 3 vidas -> corazones, igual que Asteroides
  suppressExternalPauseOverlay: false,
},
```

Y una rama de montaje `game.id === "ranaria"` que cablea las 4 props (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) al `gameRef`, igual que la rama de Asteroides/Bloque Buster (que también usan vidas).

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "ranaria",
] as const;
```

**`public.games`** — `UPDATE` sobre la fila existente (`id = 'ranaria'`), solo `short`/`long`; `cover` (`cover-rana`), `color` (`green`), `cat` (`ARCADE`), `best` y `plays` no cambian:

- `short` (propuesto, a afinar en `/spec`): "Cruza la autopista y el río hasta los nenúfares."
- `long` (propuesto, a afinar en `/spec`): "Guía a la rana a través de carriles de coches a toda velocidad y un río de troncos a la deriva. Móntate en los troncos para no ahogarte, esquiva el tráfico y llena los cinco nenúfares antes de que se acabe el tiempo. Cada nivel acelera el caos."

Esta spec **no** introduce assets nuevos (render 100% vectorial), ni una clase `.cover-*` nueva (la fila ya usa `cover-rana`, presente en `app/globals.css`), ni un `INSERT` (la fila ya existe).

## Implementation plan

1. Migración de contenido (no de schema): `UPDATE public.games SET short = ..., long = ... WHERE id = 'ranaria'` con el copy afinado. Sin cambios de comportamiento: `/games/ranaria` y `/games` solo muestran el texto actualizado. **Nota:** esta migración la ejecuta quien implemente vía `apply_migration`; el planner no la ejecuta.

2. Crear `components/games/RanariaGame.tsx` con el esqueleto `forwardRef` + `<canvas>` 800×600 y un loop `requestAnimationFrame` que solo limpia y dibuja las franjas estáticas (meta con nenúfares vacíos, río, mediana, autopista, orilla). Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **estado y el movimiento de la rana**: `RanariaState`, salto por celda con `↑↓←→` acotado a los bordes, `furthestRow` y los puntos de avance (`HOP_POINTS`), temporizador por vida con delta-time. Dibujo vectorial de la rana. Sin tráfico ni río activos todavía. Sigue sin montarse.

4. Implementar los **carriles móviles y las colisiones**: tabla `Lane`, avance de `laneOffsets` por frame, render de coches (autopista) y troncos (río) derivados del offset. Colisión con coche = muerte; agua sin flotante = muerte; arrastre por tronco (la `x` de la rana sigue al flotante) y muerte al salir del borde. Sigue sin montarse.

5. Implementar el **ciclo de meta / vidas / nivel y los callbacks**: llegar a un nenúfar libre (+`PAD_POINTS` + bono de tiempo, reinicio en la orilla, temporizador lleno); nenúfar ocupado o divisor = muerte; llenar los 5 nenúfares (+`LEVEL_BONUS`, `onLevelChange`, vaciar nenúfares, subir velocidades); muerte resta 1 vida (`onLivesChange`) sin tocar score ni nenúfares; 0 vidas congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"ranaria"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `RanariaGame` en `GamePlayerClient` cuando `game.id === "ranaria"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "ranaria", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/ranaria/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (saltar con las 4 flechas, cruzar la autopista esquivando coches, montarse en un tronco y ver la rana arrastrada, ahogarse en agua libre, ser aplastada por un coche, agotar el temporizador, llegar a un nenúfar y ver subir el score + reiniciar en la orilla, llenar los 5 nenúfares y notar la subida de nivel con carriles más rápidos, perder una vida y ver bajar un corazón, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/ranaria` y en la pestaña "RANARIA" de `/salon`, y confirmar que los otros juegos reales y los placeholders restantes siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` para `id = 'ranaria'` tiene `short`/`long` afinados describiendo la mecánica real; `cover` (`cover-rana`), `color` (`green`), `cat` (`ARCADE`), `best` y `plays` no cambiaron.
- [ ] `/games/ranaria/jugar` renderiza el canvas real del juego (franjas de meta, río, mediana, autopista, orilla, rana, coches y troncos en movimiento) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] `↑`/`↓`/`←`/`→` mueven la rana un salto de celda por pulsación, sin salirse del canvas.
- [ ] Solapar un coche en la autopista resta exactamente 1 vida y reinicia la rana en la orilla de salida.
- [ ] Quedar sobre agua sin flotante resta exactamente 1 vida; estar sobre un tronco arrastra la `x` de la rana con la velocidad del tronco.
- [ ] Que un tronco arrastre a la rana fuera de un borde lateral del canvas resta exactamente 1 vida.
- [ ] Agotar el temporizador de la vida actual resta exactamente 1 vida y reinicia la posición y el temporizador.
- [ ] Llegar a un nenúfar libre suma `PAD_POINTS` (50) más el bono de tiempo, marca ese nenúfar como ocupado y reinicia la rana en la orilla con el temporizador lleno.
- [ ] Llegar a un nenúfar ya ocupado, o aterrizar sobre el divisor entre nenúfares, resta 1 vida (no puntúa).
- [ ] Alcanzar una fila más adelantada que el récord de la vida actual suma `HOP_POINTS` (10) una sola vez por fila; retroceder no resta ni vuelve a puntuar.
- [ ] Llenar los 5 nenúfares suma `LEVEL_BONUS` (200), sube el nivel (4to stat "Nivel"), vacía los nenúfares y acelera perceptiblemente los carriles.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Ranaria.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `RanariaGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto (incluido el temporizador).
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "ranaria"` (vía `insertScore`).
- [ ] `/games/ranaria` y la pestaña "RANARIA" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1, nenúfares vacíos, temporizador lleno); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los otros 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los placeholders restantes (`gloton`, `invasores`, `duelo-pixel`) siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** activar `ranaria` como Frogger, respetando su `cat: ARCADE` ya fijado en `public.games`. **No:** cambiar su categoría para "aliviar" el balance ARCADE — la mecánica Frogger es claramente distinta a Bloque Buster (paleta/pelota) y Serpentina (grid de serpiente), así que la excepción de "otro ARCADE con mecánica distinta" aplica; cambiar `cat` sería una migración innecesaria y rompería el copy/cover existentes.
- **Yes:** movimiento por saltos discretos de celda, fiel al Frogger clásico. **No:** movimiento continuo pixel a pixel en tierra — se aleja de la mecánica clásica y complica el alineamiento con carriles y nenúfares.
- **Yes:** la rana se monta en los troncos y su `x` se arrastra con ellos (montarse es obligatorio para cruzar el río). **No:** río sin plataformas (solo esquivar) — perdería la mecánica característica de Frogger de "montarse y no caer".
- **Yes:** reutilizar el 4to stat `hearts` existente para las 3 vidas. **No:** generalizar el HUD con un nuevo `kind` (como hizo Serpentina con "length") — el concepto de vidas ya está soportado desde SPEC 05/09 y encaja tal cual con Frogger; no hay que tocar el render compartido.
- **Yes:** temporizador por vida (30s) que mata al agotarse, con bono de puntos por tiempo restante al llegar a un nenúfar. **No:** sin límite de tiempo — el copy placeholder ya prometía "antes de que se acabe el tiempo" y el temporizador añade presión competible y variedad de score.
- **Yes:** nivel sube al llenar los 5 nenúfares, acelerando los carriles (convención "nivel = dificultad" de los otros 4 juegos). **No:** dificultad estática — rompería la progresión que ya comparten Asteroides/Tetris/Bloque Buster/Serpentina.
- **Yes:** render 100% vectorial (rana, coches, troncos, nenúfares como formas de canvas con la paleta neón). **No:** sprites bitmap o audio — no se proveyeron assets para este juego (a diferencia de Serpentina/Bloque Buster); no son necesarios para la mecánica.
- **Yes:** leaderboard real en Supabase (`insertScore`), agregando `ranaria` a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`/`seededScores`) — consistente con que este pasa de placeholder a juego real, como los 5 anteriores.
- **Yes:** `UPDATE` de `short`/`long` de la fila existente (copy placeholder ya es casi correcto). **No:** `INSERT` de fila nueva ni clase `.cover-*` nueva — `ranaria` ya existe con `cover-rana`, sin migración de schema.

## Risks

| Risk                                                                                                                                                    | Mitigation                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La detección de "montarse en un tronco" mal ajustada hace que la rana se ahogue estando visualmente sobre un tronco (o viceversa), sintiéndose injusto. | La colisión rana↔flotante usa el mismo criterio de solape por celda que rana↔coche; se afina el margen de tolerancia (un par de px) en la prueba manual del paso 7, con render que deja ver claramente el borde del tronco. |
| El arrastre de la rana por el tronco desacoplado del salto por celda puede dejar la `x` sin snap al cambiar de carril, acumulando drift.                | La `x` es continua solo mientras la rana está sobre el río; al saltar a una fila de tierra/autopista se re-snap-ea al centro de celda más cercano, evitando drift acumulado.                                                |
| Escalar la velocidad de los carriles sin techo vuelve los niveles altos imposibles y mata la progresión.                                                | Las velocidades por nivel se calculan con un incremento acotado y un clamp al tramo máximo (mismo criterio que la dificultad de los otros juegos reales); se verifica a mano que niveles altos sigan siendo jugables.       |
| El temporizador basado en delta-time podría "saltar" tras una pausa larga o al recuperar el foco de la pestaña.                                         | El acumulador de tiempo solo avanza mientras `status === "playing"`; en `pause`/blur se deja de descontar, y `resume` continúa desde el valor congelado, igual que el freeze de render de los otros juegos.                 |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `ranaria`.                                                                       | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                                                      |

## What is **not** in this spec

- Sprites bitmap o audio (render 100% vectorial).
- Enemigos extra del Frogger clásico (serpientes, cocodrilos, insecto bonus).
- Tortugas que se sumergen periódicamente.
- Power-ups, vidas extra por puntaje o carriles aleatorios entre partidas.
- Controles táctiles/on-screen para móvil.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Nueva clase `.cover-*` o `INSERT` de fila en `public.games`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
