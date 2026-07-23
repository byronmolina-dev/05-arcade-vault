# SPEC 14 — Juego Estelas (Motos de Luz)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización del `fourthStat` en `GamePlayerClient` y movimiento por tick sobre grid con acumulador delta-time)
> **Date:** 2026-07-23
> **Objective:** Crear el juego nuevo `estelas` (categoría VERSUS) con `components/games/EstelasGame.tsx` — un duelo de motos de luz estilo Tron contra una IA local, donde cada moto deja una estela sólida y pierde quien choque primero — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

VERSUS es de las categorías más flacas del catálogo. `duelo-pixel` (el único placeholder VERSUS) ya tiene su propio borrador (SPEC 10) como duelo de disparos horizontal contra IA. Esta spec suma un **segundo** VERSUS con una mecánica claramente distinta: motos de luz que dejan estela permanente (no hay disparos; se gana por acorralamiento). La estética "motos de neón que pintan muros de luz en una rejilla oscura" calza como un guante con el look CRT/arcade neón del proyecto (`.crt-screen`, colores `cyan`/`magenta`), y produce un puntaje individual (rondas ganadas) apto para leaderboard real, igual que los 4 juegos reales existentes.

A diferencia de las SPEC 10-13 (que activan placeholders ya existentes en `public.games`), `estelas` es un **id nuevo**: requiere insertar una fila en `public.games` y una clase `.cover-estelas` en `app/globals.css`. Esa migración se documenta aquí como paso pendiente; **el planner no la ejecuta**.

## Scope

**In:**

- Construir `components/games/EstelasGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de la skill `add-game`: `"use client"`, canvas de resolución interna fija 800×600 escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), loop propio con `requestAnimationFrame` y movimiento por tick sobre grid con acumulador delta-time (mismo patrón que `SerpentinaGame`, SPEC 09).
- Grid de colisión: celda de 10px → grid de 80×40 sobre el canvas 800×400 útil (ver Data model para las dimensiones exactas), con una matriz de ocupación compartida `occupied[col][row]` que marca borde, estela del jugador y estela de la IA.
- Dos motos que avanzan **una celda por tick de forma continua y automática** (nunca se detienen), dejando una estela sólida en cada celda que abandonan. La moto del jugador arranca en el lado izquierdo, la de la IA en el lado derecho, avanzando una hacia la otra.
- Controles del jugador: `←`/`→`/`↑`/`↓` fijan la dirección del **próximo** tick; no se permite invertir 180° directamente sobre la propia estela (se ignora el input si la nueva dirección es la opuesta a la actual), misma regla que Serpentina.
- IA del oponente: avanza evitando colisiones con una mirada de 1–2 celdas hacia adelante (nunca gira hacia una celda ocupada si existe alternativa libre), con una tendencia creciente por ronda a "cortar" el paso del jugador (sesgo hacia acercarse a su trayectoria). Todos estos parámetros escalan por ronda.
- Fin de ronda: la primera moto que entra en una celda ocupada (borde, estela propia o ajena) pierde la ronda. Si ambas entran en una celda ocupada en el mismo tick (o colisión frontal en la misma celda), es empate y la ronda se repite sin cambiar score, nivel ni vidas.
- Puntaje: ganar una ronda (la IA choca primero) suma `ROUND_WIN_POINTS` (+100), sube el nivel (`onLevelChange`), limpia la arena y arranca una ronda con una moto rival más rápida y más agresiva.
- Sistema de vidas (reutiliza el 4to stat `hearts` existente): el jugador empieza con 3 vidas. Si el jugador choca primero, pierde 1 vida (`onLivesChange`), la ronda se reinicia con arena limpia **sin** subir nivel y **sin** cambiar el score. Perder la última vida congela el loop e invoca `onGameOver(finalScore)`.
- `EstelasGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático: al llegar a 0 vidas el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "estelas"`, montar `EstelasGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "estelas", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"estelas"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: **INSERT** de una fila nueva `id = 'estelas'` (a diferencia de SPEC 10-13, que hacen `UPDATE` de placeholders existentes), con `title`, `short`, `long`, `cat = 'VERSUS'`, `cover = 'cover-estelas'`, `color = 'magenta'`, `best`, `plays`. Esta migración la ejecuta quien implemente vía `apply_migration`; **el planner no la ejecuta**.
- `app/globals.css`: agregar la clase `.cover-estelas` (portada del catálogo, gradiente/estética neón coherente con las demás `.cover-*`), ya que `estelas` es un id nuevo sin portada previa.

**Out of scope (para futuras specs):**

- Multiplayer real (dos humanos en red o en el mismo teclado) — el "versus" es contra IA local. Cualquier PvP va en su propia spec.
- Modos de juego alternativos (mejor de N, muerte súbita, arena con obstáculos pregenerados, power-ups de velocidad/salto).
- Más de un rival IA simultáneo (3 o 4 motos en la arena).
- Estela que se desvanece con el tiempo o rompible — la estela es permanente durante la ronda.
- Física 3D o assets bitmap/audio pesados — el render es vectorial (líneas y celdas de canvas).
- Controles táctiles/on-screen para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija la ronda).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/EstelasGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 400; // alto interno del arena util (px) — grid 80x40 con celda de 10px
const CELL = 10; // px por celda
const COLS = 80; // W / CELL
const ROWS = 40; // H / CELL
const START_LIVES = 3; // vidas del jugador (corazones del 4to stat)
const ROUND_WIN_POINTS = 100; // puntos por ronda ganada (la IA choca primero)
const BASE_TICK_MS = 90; // intervalo de avance inicial (ms/celda)
const TICK_DECREASE_PER_ROUND = 6; // ms que se resta el tick por cada ronda ganada
const MIN_TICK_MS = 45; // piso del intervalo de avance

type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";

type Cycle = {
  pos: Cell; // celda actual de la cabeza de la moto
  direction: Direction; // dirección confirmada del tick en curso
  pending: Direction; // último input válido, aplicado en el próximo tick
  alive: boolean; // false en el tick en que choca
  crashedThisTick: boolean; // se resuelve el empate comparando ambas motos
};

// Dificultad por ronda (índice = nivel - 1, con clamp al último tramo)
type AiTuning = {
  lookahead: number; // celdas que la IA mira hacia adelante para no chocar (1..2)
  cutBias: number; // 0..1, cuánto sesga sus giros hacia cortar al jugador
};

type EstelasState = {
  occupied: boolean[][]; // [COLS][ROWS] — borde + estelas de ambas motos
  player: Cycle;
  ai: Cycle;
  score: number;
  lives: number;
  level: number; // ronda actual, empieza en 1
  status: "playing" | "paused" | "over";
};

export type EstelasGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type EstelasGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left.
- Movimiento por tick sobre grid, avanzado con acumulador delta-time dentro del `requestAnimationFrame` (patrón SPEC 09), no un `setInterval`.
- La moto del jugador se dibuja en `cyan`, la de la IA en `magenta` (contraste clásico de motos de luz); la estela usa el mismo color de cada moto atenuado.
- La celda que la moto abandona se marca en `occupied` **antes** de mover la cabeza a la nueva celda; el choque se evalúa contra `occupied` de la celda destino.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `estelas` a `REAL_GAME_CONFIG`:

```ts
estelas: {
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
  "estelas",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (id nuevo, no placeholder):

- `id`: `estelas`
- `title`: `ESTELAS`
- `cat`: `VERSUS`
- `color`: `magenta`
- `cover`: `cover-estelas`
- `short` (propuesto, a afinar en `/spec`): "Duelo de motos de luz: acorrala a la IA con tu estela."
- `long` (propuesto, a afinar en `/spec`): "Pilota una moto de neón que nunca frena y deja un muro de luz a su paso. Encierra a la IA para que choque antes que tú, mientras esquivas tu propia estela y los bordes de la arena. Cada ronda ganada trae un rival más veloz y astuto. Tres choques y el duelo termina."
- `best`, `plays`: valores iniciales coherentes con las demás filas (a definir en la migración; p. ej. `best = 0`, `plays = '0'`).

**`app/globals.css`** — nueva clase `.cover-estelas` para la portada del catálogo, en línea estética con las `.cover-*` existentes (gradiente neón cyan↔magenta que evoque las estelas). No hay assets bitmap: la portada es puramente CSS, igual que las demás.

Esta spec **no** introduce assets de imagen/audio (render 100% vectorial en canvas + portada CSS).

## Implementation plan

1. Migración de datos (la ejecuta quien implemente vía `apply_migration`, **no** el planner): `INSERT INTO public.games (id, title, short, long, cat, cover, color, best, plays) VALUES ('estelas', 'ESTELAS', ..., 'VERSUS', 'cover-estelas', 'magenta', 0, '0')`. En el mismo paso, agregar la clase `.cover-estelas` en `app/globals.css`. Verificable: `/games` lista la nueva tarjeta "ESTELAS" con su portada y `/games/estelas` abre la ficha (aún con el reproductor placeholder, porque el componente todavía no se monta). Nada más se rompe.

2. Crear `components/games/EstelasGame.tsx` con el esqueleto `forwardRef` + `<canvas>` 800×400 y un loop `requestAnimationFrame` vacío (solo limpia y dibuja el fondo de la arena y su borde). Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **estado y el movimiento base**: `EstelasState`, matriz `occupied` con bordes marcados, moto del jugador avanzando sola una celda por tick (acumulador delta-time), giro con `←/↑/↓/→` y bloqueo de 180°, y el marcado de estela en cada celda abandonada. Dibujo vectorial de la moto y su estela. Sin IA activa todavía (moto rival estática o ausente). Sigue sin montarse.

4. Implementar la **IA y la resolución de choques**: la moto rival avanza sola evitando celdas ocupadas con `lookahead`, con `cutBias` para sesgar giros hacia el jugador; detección de choque contra `occupied` en la celda destino de cada moto; resolución de empate cuando ambas chocan en el mismo tick. Tabla `AiTuning` por ronda. Sigue sin montarse.

5. Implementar el **ciclo de rondas/vidas y los callbacks**: la IA choca primero → gana la ronda (+`ROUND_WIN_POINTS`, `onLevelChange`, arena limpia, IA más dura, tick más rápido con piso `MIN_TICK_MS`); el jugador choca primero → resta 1 vida (`onLivesChange`) y reinicia la ronda sin subir nivel ni score; empate → repite la ronda sin cambios; 0 vidas → congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"estelas"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `EstelasGame` en `GamePlayerClient` cuando `game.id === "estelas"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "estelas", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/estelas/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (girar con flechas, ver crecer la estela, acorralar a la IA para ganar una ronda y notar el rival más rápido/astuto, chocar contra la propia estela y perder una vida, chocar contra el borde, forzar un empate frontal y ver que la ronda se repite sin cambios, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/estelas` y en la pestaña "ESTELAS" de `/salon`, y confirmar que los otros juegos reales y los placeholders siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games` muestra una tarjeta "ESTELAS" (categoría VERSUS, portada `.cover-estelas`) proveniente de la nueva fila en `public.games`.
- [ ] `/games/estelas/jugar` renderiza el canvas real del juego (arena con borde, moto del jugador cyan a la izquierda, moto IA magenta a la derecha, estelas) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] Las dos motos avanzan solas una celda por tick sin detenerse nunca, dejando una estela sólida en cada celda abandonada.
- [ ] `←`/`↑`/`↓`/`→` fijan la dirección del próximo tick; intentar invertir 180° directamente no hace que la moto choque contra su propia estela inmediata.
- [ ] Cuando la moto de la IA entra primero en una celda ocupada, el jugador gana la ronda: +100 puntos, sube el nivel (4to stat "Nivel"), la arena se limpia y arranca un rival perceptiblemente más rápido/astuto.
- [ ] Cuando la moto del jugador entra primero en una celda ocupada (borde, su estela o la de la IA), pierde exactamente 1 vida (un corazón menos en el HUD) sin cambiar el score ni subir de nivel, y la ronda se reinicia con arena limpia.
- [ ] Un empate (ambas motos chocan en el mismo tick o colisión frontal en la misma celda) repite la ronda sin cambiar score, nivel ni vidas.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Estelas.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `EstelasGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "estelas"` (vía `insertScore`).
- [ ] `/games/estelas` y la pestaña "ESTELAS" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los placeholders siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** resolver el "VERSUS" con motos de luz estilo Tron contra una IA local en un solo canvas. **No:** multiplayer real (en red o teclado compartido) — la plataforma no tiene infraestructura de tiempo real y está fuera de alcance por la regla de factibilidad.
- **Yes:** mecánica de estela permanente + acorralamiento (se gana sin disparar). **No:** duelo de disparos — ese concepto ya lo cubre `duelo-pixel` (SPEC 10); Estelas se diferencia deliberadamente para no solapar dentro de VERSUS.
- **Yes:** grid de colisión con matriz `occupied`, movimiento por tick con acumulador delta-time (patrón SPEC 09). **No:** movimiento continuo pixel a pixel — complicaría la detección de estela y se aleja de la sensación "rejilla de neón" clásica.
- **Yes:** reutilizar el 4to stat `hearts` para las 3 vidas (rondas perdidas permitidas). **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09.
- **Yes:** dificultad que escala por ronda (`AiTuning` indexado por nivel: `lookahead` + `cutBias`, y tick más rápido). **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad" de los otros juegos.
- **Yes:** puntaje = rondas ganadas (+100 por ronda), individual y apto para leaderboard real en Supabase. **No:** simulación local (`pushScore`/`seededScores`) — este juego nace como real, consistente con los últimos activados.
- **Yes:** `INSERT` de una fila nueva en `public.games` + clase `.cover-estelas` en `globals.css`, porque `estelas` es un id nuevo. **No:** reutilizar/reasignar un placeholder existente — los 4 (`duelo-pixel`, `gloton`, `ranaria`, `invasores`) ya tienen borrador propio (SPEC 10-13); tomar uno chocaría con esas specs.
- **Yes:** render 100% vectorial + portada CSS. **No:** sprites bitmap o audio — no se proveyeron assets y la mecánica no los necesita.

## Risks

| Risk                                                                                                                                    | Mitigation                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La IA se siente injusta: o imposible (nunca choca) o trivial (se estrella sola enseguida).                                              | `AiTuning` expone `lookahead` y `cutBias` acotados por ronda; la ronda 1 arranca con `lookahead` mínimo y `cutBias` bajo, y escala gradual; se afina a mano en la prueba manual del paso 7.                           |
| Escalar sin techo vuelve las rondas altas imposibles.                                                                                   | El tick hace _clamp_ en `MIN_TICK_MS` y `AiTuning` hace _clamp_ al último tramo; a partir de cierta ronda la dificultad deja de endurecerse y el score crece por habilidad.                                           |
| Es un id nuevo: `INSERT` en `public.games` + clase `.cover-estelas` es una migración a producción directa (regla del entorno Supabase). | La migración la ejecuta quien implemente (no el planner), en un solo paso verificable con `RETURNING`; la fila usa `cat`/`color` dentro de los enums (`VERSUS`/`magenta`) y un `cover` con clase CSS nueva y aislada. |
| El bloqueo de giro 180° podría fallar si el jugador presiona dos teclas opuestas muy rápido dentro del mismo tick.                      | `pending` solo se actualiza si la nueva dirección no es opuesta a `direction` (la confirmada en el tick anterior), no a la última tecla — misma mitigación que Serpentina (SPEC 09).                                  |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `estelas`.                                                       | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                                                |

## What is **not** in this spec

- Multiplayer real (PvP en red o teclado compartido).
- Modos de juego alternativos (mejor de N, muerte súbita, arena con obstáculos, power-ups).
- Más de un rival IA simultáneo.
- Estela que se desvanece o rompible.
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
