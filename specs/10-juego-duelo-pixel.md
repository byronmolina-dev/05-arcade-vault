# SPEC 10 — Juego Duelo Pixel

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización de `fourthStat` en `GamePlayerClient`)
> **Date:** 2026-07-23
> **Objective:** Activar el placeholder `duelo-pixel` con jugabilidad real construyendo `components/games/DueloPixelGame.tsx` — un duelo 1v1 de naves-píxel enfrentadas contra una IA local por rondas de dificultad creciente — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

VERSUS es la categoría más flaca del catálogo: una sola fila (`duelo-pixel`) y todavía es un placeholder, mientras ARCADE está saturado (4 filas, 2 reales). Esta spec cubre ese hueco sin inventar una fila nueva, activando el placeholder que ya existe en `public.games`. El reto de "VERSUS" es que la plataforma no soporta multiplayer en red (ni está en alcance): el duelo se resuelve contra una **IA local** en un solo canvas, produciendo un puntaje individual apto para leaderboard real, igual que los otros 4 juegos reales.

## Scope

**In:**

- Construir `components/games/DueloPixelGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de componente de la skill `add-game`: `"use client"`, canvas de resolución interna fija 800×600 escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), loop propio con `requestAnimationFrame`.
- Duelo horizontal: la nave del jugador vive pegada al borde **izquierdo** y solo se mueve en vertical; la nave de la IA vive pegada al borde **derecho** y también se mueve en vertical. Los proyectiles viajan en horizontal (jugador dispara hacia la derecha, IA hacia la izquierda).
- Controles del jugador: `↑`/`↓` mueven la nave en vertical (acotada a los bordes del canvas); `Espacio` dispara un proyectil hacia la derecha con cadencia máxima (cooldown fijo entre disparos). Sin otros controles.
- IA del oponente: persigue la posición vertical del jugador con una velocidad de seguimiento acotada, dispara con un cooldown propio, e intenta esquivar proyectiles entrantes desviándose (comportamiento simple basado en la posición `y` del proyectil más cercano). Todos estos parámetros (velocidad de seguimiento, cadencia de disparo, probabilidad de esquiva) escalan por ronda.
- Estructura por rondas: cada ronda enfrenta al jugador con un oponente IA que tiene una barra de salud de ronda (`ROUND_HP` impactos). El jugador también tiene salud de ronda (`ROUND_HP` impactos).
- Puntaje: cada proyectil del jugador que impacta a la IA suma `HIT_POINTS` (+10). Vaciar la salud de ronda de la IA gana la ronda y suma un bono `ROUND_BONUS` (+100); sube el nivel (`onLevelChange`), reinicia ambas barras de salud de ronda y arranca una IA más difícil.
- Sistema de vidas (reutiliza el 4to stat `hearts` existente): el jugador empieza con 3 vidas. Si la IA vacía la salud de ronda del jugador, el jugador pierde 1 vida (`onLivesChange`) y la ronda se reinicia con salud fresca para ambos, **sin** subir de nivel y **sin** cambiar el score. Perder la última vida congela el loop e invoca `onGameOver(finalScore)`.
- `DueloPixelGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático: al llegar a 0 vidas el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "duelo-pixel"`, montar `DueloPixelGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "duelo-pixel", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"duelo-pixel"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: actualizar `short`/`long` de la fila existente `duelo-pixel` (vía `UPDATE`, no migración de schema) para describir el duelo real contra la IA. `cover` (`cover-duelo`), `color` (`cyan`), `cat` (`VERSUS`), `best` y `plays` no cambian.

**Out of scope (para futuras specs):**

- Multiplayer real (dos humanos en red o en el mismo teclado) — el "versus" es contra IA local. Cualquier PvP va en su propia spec.
- Modos de juego alternativos (mejor de 3, muerte súbita, torneo).
- Power-ups, obstáculos en la arena, o disparos con trayectoria no horizontal.
- Física 3D o assets bitmap/audio pesados — el render es vectorial (formas simples de canvas).
- Controles táctiles/on-screen para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija la ronda).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/DueloPixelGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px)
const ROUND_HP = 5; // impactos que aguanta cada duelista por ronda
const START_LIVES = 3; // vidas del jugador (corazones del 4to stat)
const HIT_POINTS = 10; // puntos por impacto del jugador a la IA
const ROUND_BONUS = 100; // puntos extra al vaciar la salud de la IA
const PLAYER_SPEED = 4; // px/frame de la nave del jugador (vertical)
const SHOT_SPEED = 8; // px/frame de los proyectiles (horizontal)
const PLAYER_SHOT_COOLDOWN = 18; // frames entre disparos del jugador

// Dificultad por ronda (índice = nivel - 1, con clamp al último tramo)
type AiTuning = {
  followSpeed: number; // px/frame de seguimiento vertical de la IA
  shotCooldown: number; // frames entre disparos de la IA (menor = más rápido)
  dodgeChance: number; // 0..1, probabilidad por frame de esquivar el proyectil más cercano
};

type Vec = { x: number; y: number };
type Duelist = { pos: Vec; hp: number; shotTimer: number }; // pos = centro de la nave
type Shot = { pos: Vec; vx: number; from: "player" | "ai" };

type DueloState = {
  player: Duelist;
  ai: Duelist;
  shots: Shot[];
  score: number;
  lives: number;
  level: number; // ronda actual, empieza en 1
  status: "playing" | "paused" | "over";
};

export type DueloPixelGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type DueloPixelGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left.
- Velocidades en px/frame.
- El jugador está fijo en `x` cerca del borde izquierdo; la IA fija en `x` cerca del borde derecho; ambos solo varían `y`.
- Los proyectiles del jugador tienen `vx = +SHOT_SPEED`; los de la IA `vx = -SHOT_SPEED`.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `duelo-pixel` a `REAL_GAME_CONFIG`:

```ts
"duelo-pixel": {
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
  "duelo-pixel",
] as const;
```

**`public.games`** — `UPDATE` sobre la fila existente (`id = 'duelo-pixel'`), solo `short`/`long`; `cover` (`cover-duelo`), `color` (`cyan`), `cat` (`VERSUS`), `best`, `plays` no cambian:

- `short` (propuesto, a afinar en `/spec`): "Duelo de naves-píxel contra la IA por rondas."
- `long` (propuesto, a afinar en `/spec`): "Enfréntate cara a cara con una IA en una arena de neón: muévete en vertical y dispara al oponente del borde opuesto. Cada ronda ganada trae un rival más rápido y certero. Tres fallos y el duelo termina."

Esta spec **no** introduce assets nuevos (render 100% vectorial) ni una clase `.cover-*` nueva (la fila ya usa `cover-duelo`, que ya existe en `app/globals.css`).

## Implementation plan

1. Migración de contenido (no de schema): `UPDATE public.games SET short = ..., long = ... WHERE id = 'duelo-pixel'` con el nuevo copy. Sin cambios de comportamiento: `/games/duelo-pixel` y `/games` solo muestran el texto actualizado, nada más se rompe. **Nota:** esta migración la ejecuta quien implemente vía `apply_migration`; el planner no la ejecuta.

2. Crear `components/games/DueloPixelGame.tsx` con el esqueleto `forwardRef` + `<canvas>` 800×600 y un loop `requestAnimationFrame` vacío (solo limpia y dibuja el fondo de la arena). Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **estado y movimiento base**: `DueloState`, nave del jugador con `↑`/`↓` acotada a los bordes, disparo del jugador con `Espacio` y `PLAYER_SHOT_COOLDOWN`, avance de proyectiles y su descarte al salir del canvas. Dibujo vectorial de ambas naves y de los proyectiles. Sin IA activa todavía (oponente estático). Sigue sin montarse.

4. Implementar la **IA y las colisiones**: seguimiento vertical del jugador (`followSpeed`), disparo de la IA (`shotCooldown`), esquiva simple (`dodgeChance` sobre el proyectil entrante más cercano), colisión proyectil↔duelista (resta `hp`, descarta el proyectil, suma `HIT_POINTS` al pegarle a la IA). Tabla `AiTuning` por ronda. Sigue sin montarse.

5. Implementar el **ciclo de rondas/vidas y los callbacks**: vaciar el `hp` de la IA gana la ronda (+`ROUND_BONUS`, `onLevelChange`, reinicio de barras, IA más dura); vaciar el `hp` del jugador resta 1 vida (`onLivesChange`) y reinicia la ronda sin subir nivel; 0 vidas congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"duelo-pixel"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `DueloPixelGame` en `GamePlayerClient` cuando `game.id === "duelo-pixel"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "duelo-pixel", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/duelo-pixel/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (mover con `↑`/`↓`, disparar con `Espacio`, pegarle a la IA y ver subir el score, ganar una ronda y notar la IA más rápida/certera, perder una vida y ver bajar un corazón, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/duelo-pixel` y en la pestaña "DUELO PIXEL" de `/salon`, y confirmar que los otros juegos reales y los 3 placeholders restantes siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `public.games` para `id = 'duelo-pixel'` tiene `short`/`long` actualizados describiendo el duelo real contra la IA; `cover` (`cover-duelo`), `color` (`cyan`), `cat` (`VERSUS`), `best` y `plays` no cambiaron.
- [ ] `/games/duelo-pixel/jugar` renderiza el canvas real del juego (arena, nave del jugador a la izquierda, nave IA a la derecha, proyectiles) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] `↑`/`↓` mueven la nave del jugador en vertical sin salirse del canvas.
- [ ] `Espacio` dispara un proyectil hacia la derecha respetando el cooldown (no dispara un chorro continuo por frame).
- [ ] Un proyectil del jugador que impacta a la IA suma exactamente `HIT_POINTS` (10) y descarta ese proyectil.
- [ ] Vaciar la salud de ronda de la IA suma `ROUND_BONUS` (100), sube el nivel (4to stat "Nivel") y arranca una ronda con IA perceptiblemente más rápida/certera.
- [ ] Vaciar la salud de ronda del jugador resta exactamente 1 vida (un corazón menos en el HUD) sin cambiar el score ni subir de nivel, y reinicia la ronda con salud fresca para ambos.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Duelo Pixel.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `DueloPixelGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "duelo-pixel"` (vía `insertScore`).
- [ ] `/games/duelo-pixel` y la pestaña "DUELO PIXEL" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los otros 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los 3 placeholders restantes (`gloton`, `invasores`, `ranaria`) siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** resolver el "VERSUS" contra una IA local en un solo canvas. **No:** multiplayer real (en red o teclado compartido) — la plataforma no tiene infraestructura de tiempo real y está fuera de alcance por la regla de factibilidad; un PvP real iría en su propia spec.
- **Yes:** duelo horizontal (jugador izquierda, IA derecha, proyectiles horizontales) para que la mecánica se lea como un "duelo cara a cara". **No:** disparo vertical estilo shooter — se alejaría del concepto "duelo" y solaparía con Asteroides/Invasores.
- **Yes:** reutilizar el 4to stat `hearts` ya existente para las 3 vidas. **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09, no hace falta tocar el render compartido.
- **Yes:** dificultad que escala por ronda (`AiTuning` indexado por nivel). **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad" de los otros 4 juegos y evita UI extra.
- **Yes:** puntaje = impactos (+10) más bono por ronda (+100), individual y apto para leaderboard real en Supabase. **No:** simulación local (`pushScore`/`seededScores`) — este es el 5to juego que pasa de placeholder a real, consistente con los anteriores.
- **Yes:** render 100% vectorial (formas simples de canvas), sin assets. **No:** sprites bitmap o audio — no se proveyeron assets para este juego y no son necesarios para la mecánica.
- **Yes:** `UPDATE` de `short`/`long` de la fila existente. **No:** `INSERT` de una fila nueva ni clase `.cover-*` nueva — `duelo-pixel` ya existe en `public.games` con `cover-duelo`, así que no hace falta migración de schema.

## Risks

| Risk                                                                                                           | Mitigation                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La IA se siente injusta: o imposible de tocar (esquiva perfecta) o trivial (no esquiva ni dispara).            | `AiTuning` expone `followSpeed`/`shotCooldown`/`dodgeChance` por ronda con valores acotados; la ronda 1 arranca suave y escala gradual; se afinan a mano en la prueba manual del paso 7.     |
| Escalar la dificultad sin techo vuelve las rondas altas imposibles y mata la sensación de progreso.            | La tabla `AiTuning` hace _clamp_ al último tramo de dificultad; a partir de cierta ronda los parámetros dejan de endurecerse y el score sigue creciendo por habilidad, no por imposibilidad. |
| El `UPDATE` de contenido en `public.games` es una migración a producción directa (regla del entorno Supabase). | Es un `UPDATE` de solo texto (`short`/`long`) sobre una fila ya existente, sin tocar schema ni otras filas; lo ejecuta quien implemente (no el planner) y se verifica con `RETURNING`.       |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `duelo-pixel`.                          | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                       |

## What is **not** in this spec

- Multiplayer real (PvP en red o teclado compartido).
- Modos de juego alternativos (mejor de 3, muerte súbita, torneo).
- Power-ups, obstáculos en la arena o disparos no horizontales.
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
