# SPEC 18 — Juego Raqueta (Pong de Neón)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient` y física de rebote continuo px/frame con `devicePixelRatio`), SPEC 09 (Serpentina — generalización del `fourthStat` en `GamePlayerClient`)
> **Date:** 2026-07-23
> **Objective:** Crear el juego nuevo `raqueta` (categoría VERSUS) con `components/games/RaquetaGame.tsx` — un duelo de paletas estilo Pong contra una IA local, donde una pelota rebota entre ambos jugadores y se suma punto cuando la IA falla — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

VERSUS es la categoría más flaca del catálogo. `duelo-pixel` (placeholder VERSUS) tiene su borrador (SPEC 10) como duelo de disparos horizontal contra IA, y `estelas` (SPEC 14) es un duelo de motos de luz por acorralamiento. Esta spec suma un **tercer** VERSUS con una mecánica claramente distinta de ambos: el arquetipo Pong — dos paletas enfrentadas y una pelota que viaja en ambos sentidos, donde cualquiera de los dos lados puede conceder el punto. No hay disparos (a diferencia de `duelo-pixel`) ni estelas permanentes (a diferencia de `estelas`), y a diferencia de `bloque-buster` (breakout de una sola paleta que rompe muros, categoría ARCADE) aquí hay un **rival** que también puede fallar. La estética de dos paletas y una pelota de neón sobre fondo negro con línea central punteada es el arquetipo mismo del look CRT/arcade (`.crt-screen`), y produce un puntaje individual acumulativo (puntos ganados a la IA) apto para leaderboard real, igual que los 4 juegos reales existentes.

A diferencia de las SPEC 10-13 (que activan placeholders ya existentes en `public.games`), `raqueta` es un **id nuevo**: requiere insertar una fila en `public.games` y una clase `.cover-raqueta` en `app/globals.css`. Esa migración se documenta aquí como paso pendiente; **el planner no la ejecuta**.

## Scope

**In:**

- Construir `components/games/RaquetaGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), siguiendo el patrón de la skill `add-game`: `"use client"`, canvas de resolución interna fija escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), escalado por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`, SPEC 08), loop propio con `requestAnimationFrame` y física de rebote continuo pixel-a-pixel con velocidad en px/frame (no grid, no acumulador de tick — a diferencia de Serpentina/Estelas).
- Dos paletas verticales: la del jugador en el borde izquierdo, la de la IA en el borde derecho. Ambas solo se mueven en el eje vertical (Y), acotadas dentro del arena.
- Una pelota que arranca en el centro hacia un lado aleatorio, rebota contra los bordes superior/inferior del arena y contra ambas paletas. Al golpear una paleta invierte su componente horizontal y ajusta la vertical según el punto de impacto en la paleta (más cerca del extremo → ángulo más pronunciado), con clamp de ángulo mínimo vertical para evitar rebotes casi horizontales eternos, y un pequeño speed-up por golpe.
- Controles del jugador: `↑`/`↓` (y opcionalmente `W`/`S`) mueven la paleta del jugador arriba/abajo; sin otros inputs.
- IA del oponente: la paleta de la IA sigue la posición Y de la pelota con una velocidad de seguimiento máxima y una "zona muerta" de reacción, ambas escaladas por nivel (más rápida y más precisa a mayor nivel), con clamp para que sea batible pero no trivial.
- Puntuación y vidas: cuando la pelota pasa el borde derecho (la IA falla), el jugador gana un punto → suma `POINT_WIN_POINTS`; cada `POINTS_PER_LEVEL` puntos sube el nivel (`onLevelChange`) y acelera pelota + IA. Cuando la pelota pasa el borde izquierdo (el jugador falla), pierde 1 vida (`onLivesChange`). En ambos casos la pelota se resetea al centro y sale hacia el lado que acaba de anotar/conceder (o aleatorio, a afinar en `/spec`). El jugador empieza con 3 vidas; perder la última vida congela el loop e invoca `onGameOver(finalScore)`.
- `RaquetaGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático: al llegar a 0 vidas el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "raqueta"`, montar `RaquetaGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "raqueta", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"raqueta"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: **INSERT** de una fila nueva `id = 'raqueta'` (a diferencia de SPEC 10-13, que hacen `UPDATE` de placeholders existentes), con `title`, `short`, `long`, `cat = 'VERSUS'`, `cover = 'cover-raqueta'`, `color = 'green'`, `best`, `plays`. Esta migración la ejecuta quien implemente vía `apply_migration`; **el planner no la ejecuta**.
- `app/globals.css`: agregar la clase `.cover-raqueta` (portada del catálogo, gradiente/estética neón coherente con las demás `.cover-*`), ya que `raqueta` es un id nuevo sin portada previa.

**Out of scope (para futuras specs):**

- Multiplayer real (dos humanos en red o en el mismo teclado) — el "versus" es contra IA local. Cualquier PvP va en su propia spec.
- Modos de juego alternativos (mejor de N sets, muerte súbita, power-ups de paleta/pelota, obstáculos en el arena, pelota múltiple).
- Efectos de spin/curva avanzados más allá del ángulo por punto de impacto.
- Física 3D o assets bitmap/audio pesados — el render es vectorial (rectángulos, círculo y línea de canvas).
- Controles táctiles/on-screen o por ratón para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija el nivel).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/RaquetaGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px) — aspect 4/3
const PADDLE_W = 12; // ancho de cada paleta (px)
const PADDLE_H = 90; // alto de cada paleta (px)
const PADDLE_MARGIN = 24; // separación de la paleta respecto a su borde (px)
const PLAYER_SPEED = 7; // velocidad vertical de la paleta del jugador (px/frame)
const BALL_SIZE = 12; // lado/diámetro de la pelota (px)
const BASE_BALL_SPEED = 5; // rapidez inicial de la pelota (px/frame)
const BALL_SPEEDUP = 0.25; // incremento de rapidez por golpe de paleta (px/frame)
const MAX_BALL_SPEED = 13; // techo de rapidez de la pelota (px/frame)
const MIN_VY_RATIO = 0.25; // componente vertical mínima tras golpe (evita rebotes casi horizontales)
const START_LIVES = 3; // vidas del jugador (corazones del 4to stat)
const POINT_WIN_POINTS = 10; // puntos por punto ganado a la IA
const POINTS_PER_LEVEL = 5; // puntos ganados por cada subida de nivel

type Vec = { x: number; y: number };

type Ball = {
  pos: Vec; // centro de la pelota (px, origen top-left)
  vel: Vec; // velocidad en px/frame
  speed: number; // rapidez actual (módulo), crece por golpe con clamp a MAX_BALL_SPEED
};

// Dificultad por nivel (índice = nivel - 1, con clamp al último tramo)
type AiTuning = {
  maxSpeed: number; // velocidad vertical máxima de seguimiento de la IA (px/frame)
  deadZone: number; // px de tolerancia antes de que la IA reaccione (mayor = más torpe)
};

type RaquetaState = {
  playerY: number; // Y del borde superior de la paleta del jugador (px)
  aiY: number; // Y del borde superior de la paleta de la IA (px)
  ball: Ball;
  score: number;
  lives: number;
  level: number; // empieza en 1
  status: "playing" | "paused" | "over";
};

export type RaquetaGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type RaquetaGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left. Velocidades en px/frame.
- Movimiento continuo pixel-a-pixel dentro del `requestAnimationFrame` (patrón SPEC 08, Bloque Buster), no grid ni acumulador de tick.
- La paleta del jugador se dibuja en `cyan`, la de la IA en `magenta` (contraste clásico); la pelota en `green` (color de la tarjeta); línea central punteada tenue. Fondo negro.
- Colisión pelota↔paleta por solape de AABB en cada frame; para rapideces altas, considerar sub-stepping o clamp de `MAX_BALL_SPEED` para evitar tunneling a través de la paleta.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `raqueta` a `REAL_GAME_CONFIG`:

```ts
raqueta: {
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
  "raqueta",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (id nuevo, no placeholder):

- `id`: `raqueta`
- `title`: `RAQUETA`
- `cat`: `VERSUS`
- `color`: `green`
- `cover`: `cover-raqueta`
- `short` (propuesto, a afinar en `/spec`): "Duelo de paletas: gánale la pelota a la IA."
- `long` (propuesto, a afinar en `/spec`): "El Pong de neón del Vault: mueve tu paleta arriba y abajo y devuelve la pelota hasta que la IA no llegue. Cada punto que le arrebatas acelera la pelota y afila al rival. Falla tres veces y el duelo termina."
- `best`, `plays`: valores iniciales coherentes con las demás filas (a definir en la migración; p. ej. `best = 0`, `plays = '0'`).

**`app/globals.css`** — nueva clase `.cover-raqueta` para la portada del catálogo, en línea estética con las `.cover-*` existentes (gradiente neón que evoque dos paletas y una pelota sobre fondo oscuro). No hay assets bitmap: la portada es puramente CSS, igual que las demás.

Esta spec **no** introduce assets de imagen/audio (render 100% vectorial en canvas + portada CSS).

## Implementation plan

1. Migración de datos (la ejecuta quien implemente vía `apply_migration`, **no** el planner): `INSERT INTO public.games (id, title, short, long, cat, cover, color, best, plays) VALUES ('raqueta', 'RAQUETA', ..., 'VERSUS', 'cover-raqueta', 'green', 0, '0')`. En el mismo paso, agregar la clase `.cover-raqueta` en `app/globals.css`. Verificable: `/games` lista la nueva tarjeta "RAQUETA" con su portada y `/games/raqueta` abre la ficha (aún con el reproductor placeholder, porque el componente todavía no se monta). Nada más se rompe.

2. Crear `components/games/RaquetaGame.tsx` con el esqueleto `forwardRef` + `<canvas>` (resolución interna 800×600, escalado por `devicePixelRatio` como Bloque Buster) y un loop `requestAnimationFrame` vacío (solo limpia el fondo, dibuja las dos paletas estáticas, la línea central punteada y la pelota en el centro). Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **movimiento base**: `RaquetaState`, input `↑/↓` (`W/S`) para la paleta del jugador con clamp a los bordes, y la pelota moviéndose e invirtiendo su `vel.y` al tocar los bordes superior/inferior. Sin IA ni scoring todavía (la paleta rival estática, la pelota atraviesa los laterales sin consecuencia). Sigue sin montarse.

4. Implementar la **colisión con paletas y la IA**: rebote pelota↔paleta con inversión horizontal, ángulo según punto de impacto, clamp de `MIN_VY_RATIO` y speed-up por golpe con techo `MAX_BALL_SPEED`; paleta de la IA siguiendo la Y de la pelota con `AiTuning` (`maxSpeed` + `deadZone`). Tabla `AiTuning` por nivel. Sigue sin montarse.

5. Implementar el **scoring/vidas y los callbacks**: la pelota pasa el borde derecho (IA falla) → +`POINT_WIN_POINTS`, cada `POINTS_PER_LEVEL` puntos sube nivel (`onLevelChange`) y acelera pelota + IA; la pelota pasa el borde izquierdo (jugador falla) → resta 1 vida (`onLivesChange`); en ambos casos reset de la pelota al centro; 0 vidas → congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"raqueta"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `RaquetaGame` en `GamePlayerClient` cuando `game.id === "raqueta"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "raqueta", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/raqueta/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (mover la paleta con flechas, ver rebotar la pelota contra bordes y paletas, ganarle un punto a la IA y ver subir el score y —cada 5 puntos— el nivel con pelota/IA más rápidas, fallar y perder una vida, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/raqueta` y en la pestaña "RAQUETA" de `/salon`, y confirmar que los otros juegos reales y los placeholders siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games` muestra una tarjeta "RAQUETA" (categoría VERSUS, portada `.cover-raqueta`) proveniente de la nueva fila en `public.games`.
- [ ] `/games/raqueta/jugar` renderiza el canvas real del juego (fondo negro, línea central punteada, paleta del jugador cyan a la izquierda, paleta IA magenta a la derecha, pelota green) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] `↑`/`↓` (y `W`/`S`) mueven la paleta del jugador arriba/abajo, sin salirse del arena.
- [ ] La pelota rebota contra los bordes superior/inferior y contra ambas paletas; al golpear una paleta cambia de dirección horizontal y su ángulo depende del punto de impacto, sin quedarse en rebotes casi horizontales eternos.
- [ ] La paleta de la IA sigue la pelota y es batible en el nivel 1, y perceptiblemente más rápida/precisa en niveles altos.
- [ ] Cuando la pelota pasa el borde derecho (la IA falla), el jugador gana un punto (+10) y la pelota se resetea al centro; cada 5 puntos sube el nivel (4to stat "Nivel") y aceleran pelota e IA.
- [ ] Cuando la pelota pasa el borde izquierdo (el jugador falla), pierde exactamente 1 vida (un corazón menos en el HUD) sin cambiar el score, y la pelota se resetea al centro.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Raqueta.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `RaquetaGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "raqueta"` (vía `insertScore`).
- [ ] `/games/raqueta` y la pestaña "RAQUETA" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los placeholders siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** resolver el "VERSUS" con Pong de paletas contra una IA local en un solo canvas. **No:** multiplayer real (en red o teclado compartido) — la plataforma no tiene infraestructura de tiempo real y está fuera de alcance por la regla de factibilidad.
- **Yes:** mecánica de dos paletas + pelota que viaja en ambos sentidos, donde el rival también puede fallar. **No:** duelo de disparos (`duelo-pixel`, SPEC 10) ni estela/acorralamiento (`estelas`, SPEC 14) — Raqueta se diferencia deliberadamente para no solapar dentro de VERSUS; y **no** breakout de una sola paleta (`bloque-buster`, SPEC 08, ARCADE), donde no hay rival que conceda el punto.
- **Yes:** física de rebote continuo pixel-a-pixel en px/frame con `devicePixelRatio` (patrón SPEC 08). **No:** grid + acumulador de tick (patrón SPEC 09) — Pong no es un juego de rejilla; el rebote analógico es su esencia.
- **Yes:** reutilizar el 4to stat `hearts` para las 3 vidas (fallos permitidos). **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09.
- **Yes:** dificultad que escala por nivel (`AiTuning` indexado por nivel: `maxSpeed` + `deadZone`, y pelota más rápida). **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad" de los otros juegos.
- **Yes:** puntaje = puntos ganados a la IA (+10 por punto), individual y apto para leaderboard real en Supabase. **No:** simulación local (`pushScore`/`seededScores`) — este juego nace como real, consistente con los últimos activados.
- **Yes:** `INSERT` de una fila nueva en `public.games` + clase `.cover-raqueta` en `globals.css`, porque `raqueta` es un id nuevo. **No:** reutilizar/reasignar un placeholder existente — los 4 (`duelo-pixel`, `gloton`, `ranaria`, `invasores`) ya tienen borrador propio (SPEC 10-13); tomar uno chocaría con esas specs.
- **Yes:** render 100% vectorial + portada CSS. **No:** sprites bitmap o audio — no se proveyeron assets y la mecánica no los necesita.

## Risks

| Risk                                                                                                                                    | Mitigation                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La IA se siente injusta: o imposible (nunca falla) o trivial (falla enseguida).                                                         | `AiTuning` expone `maxSpeed` y `deadZone` acotados por nivel; la IA no es perfecta (velocidad de seguimiento finita + zona muerta), y escala gradual con clamp al último tramo; se afina a mano en la prueba manual del paso 7. |
| Rebotes casi horizontales vuelven la pelota eterna y aburrida.                                                                          | Clamp de `MIN_VY_RATIO` a la componente vertical tras cada golpe de paleta, más speed-up progresivo por golpe con techo `MAX_BALL_SPEED`.                                                                                       |
| Tunneling: a rapidez alta la pelota atraviesa la paleta sin registrar colisión.                                                         | Techo `MAX_BALL_SPEED` moderado y, si hace falta, sub-stepping del movimiento de la pelota por frame; se valida en la prueba manual.                                                                                            |
| Es un id nuevo: `INSERT` en `public.games` + clase `.cover-raqueta` es una migración a producción directa (regla del entorno Supabase). | La migración la ejecuta quien implemente (no el planner), en un solo paso verificable con `RETURNING`; la fila usa `cat`/`color` dentro de los enums (`VERSUS`/`green`) y un `cover` con clase CSS nueva y aislada.             |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `raqueta`.                                                       | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                                                          |

## What is **not** in this spec

- Multiplayer real (PvP en red o teclado compartido).
- Modos de juego alternativos (mejor de N sets, muerte súbita, power-ups, obstáculos, pelota múltiple).
- Efectos de spin/curva avanzados más allá del ángulo por punto de impacto.
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen o por ratón para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
