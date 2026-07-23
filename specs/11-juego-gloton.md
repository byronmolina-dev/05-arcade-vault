# SPEC 11 — Juego Glotón

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — juego en grid construido desde cero y generalización de `fourthStat` en `GamePlayerClient`)
> **Date:** 2026-07-23
> **Objective:** Activar el placeholder `gloton` con jugabilidad real construyendo `components/games/GlotonGame.tsx` — un comelón estilo laberinto que devora puntos mientras esquiva perseguidores, con píldoras de poder que invierten la caza — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

`gloton` es uno de los placeholders que ya existe como fila en `public.games` (`cat = ARCADE`, `color = yellow`, `cover = cover-glot`), así que activarlo no necesita migración de schema — solo componente + integración, la vía de menor riesgo (placeholder-first). Aunque ARCADE es la categoría más saturada del catálogo (bloque-buster y serpentina reales; gloton y ranaria placeholders), la mecánica de laberinto con perseguidores es claramente **distinta** a los otros dos ARCADE reales: no es rebote de pelota (Bloque Buster) ni una serpiente que crece en grilla abierta (Serpentina). Aquí el reto es la navegación de un laberinto fijo con IA enemiga que caza, más una inversión temporal de roles vía píldora de poder — una mecánica que ninguno de los 4 juegos reales ni `duelo-pixel`/`invasores` (ya registrados) cubre. Produce un puntaje individual acumulativo, apto para leaderboard real igual que los otros juegos reales.

## Scope

**In:**

- Construir `components/games/GlotonGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de componente de la skill `add-game`: `"use client"`, canvas de resolución interna fija 800×600 escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), loop propio con `requestAnimationFrame`.
- Laberinto fijo definido como constante interna (arreglo de strings): muros, celdas transitables, puntos (pellets), píldoras de poder (power pellets) y un túnel horizontal de wrap-around en la fila central (salir por la izquierda reaparece por la derecha y viceversa — como el laberinto clásico del género).
- Movimiento por grid del glotón: avanza de forma continua sobre los corredores del laberinto; `←`/`→`/`↑`/`↓` fijan la dirección deseada (`pendingDirection`), que se aplica en cuanto haya un corredor libre en esa dirección (giro "encolado" en las intersecciones, no giro instantáneo contra un muro).
- Comer puntos: pasar por una celda con pellet lo consume y suma `PELLET_POINTS` (+10). Pasar por una celda con píldora de poder la consume, suma `POWER_POINTS` (+50) y activa el modo de poder por `POWER_TICKS` ticks.
- Perseguidores (`GHOST_COUNT`, p.ej. 3 fantasmas de color `cyan`/`magenta`/`green`): parten de una zona central y se mueven por el laberinto con IA simple de persecución (en cada intersección eligen el corredor válido que reduce la distancia al glotón, sin invertir 180° salvo callejón sin salida). Colores tomados solo del enum permitido.
- Modo de poder: mientras está activo, los perseguidores entran en estado "asustado" (huyen del glotón y se dibujan en un tono atenuado). Si el glotón toca un perseguidor asustado, lo devora: suma `GHOST_POINTS` (base +200, escalando ×2 por cada fantasma comido dentro del mismo modo de poder) y ese fantasma regresa a la zona central para reactivarse. El modo de poder decae y termina al agotar `POWER_TICKS`.
- Colisión mortal: si el glotón toca un perseguidor **no** asustado, pierde 1 vida (`onLivesChange`); glotón y perseguidores vuelven a sus posiciones de inicio y la ronda continúa con los pellets restantes intactos. El score no cambia por perder una vida.
- Sistema de vidas (reutiliza el 4to stat `hearts` ya existente): el glotón empieza con `START_LIVES` (3) vidas. Perder la última vida congela el loop e invoca `onGameOver(finalScore)`.
- Progresión de nivel: consumir **todos** los pellets y píldoras del laberinto completa el nivel (`onLevelChange`), suma un bono `LEVEL_BONUS` (+300), reinicia los pellets del mismo laberinto y arranca una ronda con perseguidores más rápidos y modo de poder más corto (mismo patrón "nivel = dificultad" que los otros juegos reales).
- `GlotonGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático: al llegar a 0 vidas el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "gloton"`, montar `GlotonGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "gloton", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"gloton"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: actualizar `short`/`long` de la fila existente `gloton` (vía `UPDATE`, no migración de schema) para describir el juego de laberinto real. `cover` (`cover-glot`), `color` (`yellow`), `cat` (`ARCADE`), `best` y `plays` no cambian.

**Out of scope (para futuras specs):**

- Múltiples laberintos distintos por nivel — el nivel reutiliza el mismo laberinto con dificultad creciente; nuevos layouts van en su propia spec.
- IA de perseguidor con personalidades distintas por fantasma (targeting tipo Blinky/Pinky/Inky/Clyde del clásico) — todos comparten la misma heurística simple de persecución/huida.
- Frutas bonus, comodines u objetos coleccionables extra más allá de pellets y píldoras de poder.
- Física 3D o assets bitmap/audio pesados — el render es vectorial (formas simples de canvas: glotón como arco, fantasmas como cápsulas, pellets como puntos).
- Controles táctiles/on-screen para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija el nivel).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/GlotonGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px)
const CELL = 32; // px por celda del laberinto
// El laberinto se centra en el canvas; COLS/ROWS derivan del layout.

const START_LIVES = 3; // vidas del glotón (corazones del 4to stat)
const PELLET_POINTS = 10; // puntos por punto comido
const POWER_POINTS = 50; // puntos por píldora de poder
const GHOST_BASE_POINTS = 200; // puntos por el 1er fantasma comido en un modo de poder
const LEVEL_BONUS = 300; // bono al limpiar el laberinto
const POWER_TICKS = 420; // duración del modo de poder (en ticks) en el nivel 1
const GHOST_COUNT = 3;

// Layout del laberinto: '#' muro, '.' pellet, 'o' píldora de poder,
// ' ' corredor sin pellet, 'P' spawn del glotón, 'G' zona central de fantasmas,
// '-' celda de túnel (wrap horizontal). Constante interna del componente.
const MAZE: string[] = [
  /* ...filas del laberinto (autocontenido en el componente)... */
];

type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";

type Ghost = {
  pos: Cell; // celda actual (con interpolación de subposición para el render)
  dir: Direction;
  frightened: boolean; // true durante el modo de poder
};

type GlotonState = {
  player: Cell;
  dir: Direction;
  pendingDirection: Direction; // último input; se aplica al haber corredor libre
  ghosts: Ghost[];
  pellets: Set<string>; // claves "col,row" de pellets restantes
  powerPellets: Set<string>; // claves "col,row" de píldoras restantes
  powerTimer: number; // ticks restantes de modo de poder (0 = inactivo)
  ghostChain: number; // fantasmas comidos en el modo de poder actual (para el ×2)
  score: number;
  lives: number;
  level: number; // empieza en 1
  status: "playing" | "paused" | "over";
};

export type GlotonGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type GlotonGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left; el laberinto se centra dentro del área 800×600.
- Movimiento por grid con acumulador de tiempo (delta-time) dentro del loop de `requestAnimationFrame`: el glotón y los fantasmas avanzan una celda cada vez que el acumulador supera el tick actual (que se acelera por nivel), independiente de la tasa de frames — mismo patrón anti-"salto de celda" que SPEC 09.
- Colisiones y consumo de pellets se resuelven a nivel de celda (comparación de `col/row`), no por solapamiento de píxeles.
- El wrap horizontal solo aplica en la fila del túnel: salir por una celda `-` del borde reaparece en la `-` opuesta.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `gloton` a `REAL_GAME_CONFIG`:

```ts
"gloton": {
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
  "gloton",
] as const;
```

**`public.games`** — `UPDATE` sobre la fila existente (`id = 'gloton'`), solo `short`/`long`; `cover` (`cover-glot`), `color` (`yellow`), `cat` (`ARCADE`), `best`, `plays` no cambian:

- `short` (propuesto, a afinar en `/spec`): "Devora todo el laberinto sin que te atrapen."
- `long` (propuesto, a afinar en `/spec`): "Guía al glotón por un laberinto de neón comiendo cada punto mientras esquivas a los perseguidores. Muerde una píldora de poder y el cazador se vuelve presa: devóralos por puntos extra antes de que se recuperen. Limpia el tablero para subir de nivel; tres capturas y se acaba el festín."

Esta spec **no** introduce assets nuevos (render 100% vectorial) ni una clase `.cover-*` nueva (la fila ya usa `cover-glot`, que ya existe en `app/globals.css`).

## Implementation plan

1. Migración de contenido (no de schema): `UPDATE public.games SET short = ..., long = ... WHERE id = 'gloton'` con el nuevo copy. Sin cambios de comportamiento: `/games/gloton` y `/games` solo muestran el texto actualizado, nada más se rompe. **Nota:** esta migración la ejecuta quien implemente vía `apply_migration`; el planner no la ejecuta.

2. Crear `components/games/GlotonGame.tsx` con el esqueleto `forwardRef` + `<canvas>` 800×600 y un loop `requestAnimationFrame` vacío que solo limpia el fondo y dibuja los muros del laberinto (`MAZE`) centrado. Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **estado base y el movimiento del glotón**: `GlotonState`, parseo del `MAZE` a muros/pellets/píldoras/spawns, movimiento por grid con acumulador de tiempo, `pendingDirection` aplicado en intersecciones, wrap horizontal del túnel, consumo de pellets (+`PELLET_POINTS`) y píldoras (+`POWER_POINTS`, arranca `powerTimer`). Dibujo vectorial del glotón (arco tipo boca), pellets y píldoras. Sin fantasmas todavía. Sigue sin montarse.

4. Implementar los **perseguidores y las colisiones**: spawn de `GHOST_COUNT` fantasmas en la zona central, IA de persecución simple en intersecciones (elige el corredor válido que acerca al glotón, sin 180° salvo callejón), estado `frightened` durante el modo de poder (huyen), colisión glotón↔fantasma: mortal si no está asustado (resta 1 vida, reset de posiciones), devora si está asustado (+`GHOST_BASE_POINTS`×2^cadena, el fantasma vuelve al centro). Decaimiento y fin de `powerTimer`. Sigue sin montarse.

5. Implementar el **ciclo de niveles/vidas y los callbacks**: limpiar todos los pellets+píldoras completa el nivel (+`LEVEL_BONUS`, `onLevelChange`, repuebla el laberinto, sube la velocidad de los fantasmas y acorta `POWER_TICKS`); perder una vida dispara `onLivesChange`; 0 vidas congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"gloton"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `GlotonGame` en `GamePlayerClient` cuando `game.id === "gloton"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "gloton", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/gloton/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (mover con flechas y encolar giros en intersecciones, comer pellets y ver subir el score, cruzar el túnel de wrap, morder una píldora y devorar un fantasma asustado con el bono escalado, ser atrapado y ver bajar un corazón con reset de posiciones, limpiar el laberinto y subir de nivel notando fantasmas más rápidos, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/gloton` y en la pestaña "GLOTÓN" de `/salon`, y confirmar que los otros juegos reales y los placeholders restantes siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` para `id = 'gloton'` tiene `short`/`long` actualizados describiendo el juego de laberinto real; `cover` (`cover-glot`), `color` (`yellow`), `cat` (`ARCADE`), `best` y `plays` no cambiaron.
- [ ] `/games/gloton/jugar` renderiza el canvas real del juego (laberinto, glotón, pellets, píldoras y perseguidores) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] `←`/`→`/`↑`/`↓` dirigen al glotón por los corredores; un giro pedido contra un muro se encola y se aplica en cuanto hay corredor libre en esa dirección (no atraviesa muros).
- [ ] Comer un pellet suma exactamente `PELLET_POINTS` (10) y lo elimina del laberinto; comer una píldora suma `POWER_POINTS` (50) y activa el modo de poder.
- [ ] Durante el modo de poder los perseguidores se ven "asustados" y huyen; tocar uno lo devora sumando `GHOST_BASE_POINTS` (200) el primero, con el bono duplicando por cada fantasma comido dentro del mismo modo de poder, y el fantasma vuelve a la zona central.
- [ ] Tocar un perseguidor NO asustado resta exactamente 1 vida (un corazón menos), reinicia posiciones de glotón y fantasmas, deja los pellets restantes intactos y no cambia el score.
- [ ] Limpiar todos los pellets y píldoras suma `LEVEL_BONUS` (300), sube el nivel (4to stat "Nivel"), repuebla el laberinto y arranca una ronda con perseguidores perceptiblemente más rápidos.
- [ ] Cruzar el túnel horizontal reaparece al glotón por el lado opuesto sin morir.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Glotón.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `GlotonGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "gloton"` (vía `insertScore`).
- [ ] `/games/gloton` y la pestaña "GLOTÓN" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1, laberinto lleno); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los otros 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los placeholders restantes (`invasores`, `ranaria`, `duelo-pixel`) siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** activar el placeholder `gloton` que ya existe en `public.games` (placeholder-first, sin migración de schema). **No:** inventar un id nuevo para un juego de laberinto — la fila, el `cover-glot`, el `color yellow` y el `cat ARCADE` ya existen.
- **Yes:** aceptar un tercer ARCADE aunque la categoría esté saturada, porque la mecánica (laberinto fijo + IA perseguidora + inversión de roles por píldora) es claramente distinta a Bloque Buster (rebote) y Serpentina (serpiente que crece en grilla abierta). **No:** reasignar `gloton` a otra `cat` para "equilibrar" — cambiar la categoría exigiría migración y contradice el placeholder-first; el hueco de VERSUS ya lo cubre `duelo-pixel`.
- **Yes:** movimiento por grid con acumulador de tiempo (misma técnica anti-salto de celda de SPEC 09). **No:** movimiento libre pixel a pixel — complicaría el consumo de pellets y la IA en intersecciones sin aportar a la mecánica clásica.
- **Yes:** IA de perseguidor simple y homogénea (greedy hacia/lejos del glotón en intersecciones). **No:** personalidades por fantasma tipo el clásico — fuera de alcance; se puede refinar en una spec futura sin bloquear el MVP jugable.
- **Yes:** reutilizar el 4to stat `hearts` para 3 vidas (con reset de posiciones al ser atrapado). **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09.
- **Yes:** dificultad que escala por nivel (fantasmas más rápidos, `POWER_TICKS` más corto), reusando `onLevelChange`. **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad".
- **Yes:** puntaje = pellets (+10) / píldoras (+50) / fantasmas asustados (+200 ×2 en cadena) / bono de nivel (+300), individual y apto para leaderboard real en Supabase. **No:** simulación local (`pushScore`/`seededScores`) — este es el 5to juego que pasa de placeholder a real.
- **Yes:** render 100% vectorial (arco para el glotón, cápsulas para fantasmas, puntos para pellets). **No:** sprites bitmap o audio — no se proveyeron assets y no son necesarios para la mecánica.
- **Yes:** `UPDATE` de `short`/`long` de la fila existente. **No:** `INSERT` de una fila nueva ni clase `.cover-*` nueva — `gloton` ya existe con `cover-glot`.

## Risks

| Risk                                                                                                               | Mitigation                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| La IA de persecución greedy puede quedar atrapada oscilando en un cruce o acorralar al jugador de forma injusta.   | La heurística prohíbe el 180° salvo callejón sin salida y se afina con la velocidad por nivel; la ronda 1 arranca lenta y escala gradual; se valida a mano en la prueba manual del paso 7. |
| El movimiento por grid desacoplado del render (`requestAnimationFrame`) podría saltar celdas en equipos lentos.    | Acumulador de tiempo (delta-time): glotón y fantasmas avanzan exactamente una celda por tick superado, independiente del frame rate — misma técnica que SPEC 09.                           |
| Diseñar el `MAZE` a mano puede dejar celdas inaccesibles (pellets imposibles de comer) que impidan subir de nivel. | El layout se valida en el paso 3 recorriendo la conectividad del grafo de corredores desde el spawn; cualquier pellet aislado se corrige antes de cablear la progresión de nivel.          |
| El `UPDATE` de contenido en `public.games` es una migración a producción directa (regla del entorno Supabase).     | Es un `UPDATE` de solo texto (`short`/`long`) sobre una fila ya existente, sin tocar schema ni otras filas; lo ejecuta quien implemente (no el planner) y se verifica con `RETURNING`.     |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `gloton`.                                   | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                     |

## What is **not** in this spec

- Múltiples laberintos/layouts distintos por nivel.
- Personalidades de perseguidor diferenciadas (targeting tipo el clásico).
- Frutas bonus u objetos coleccionables extra.
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
