# SPEC 21 — Juego Tanques (Duelo de Tanques de Neón)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real, movimiento por ángulo/rotación y 4to stat "Vidas"/corazones), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, física continua px/frame con `devicePixelRatio` y reflexión de rebote), SPEC 09 (Serpentina — generalización del `fourthStat` en `GamePlayerClient`)
> **Date:** 2026-07-23
> **Objective:** Crear el juego nuevo `tanques` (categoría VERSUS) con `components/games/TanquesGame.tsx` — un duelo de tanques estilo Combat/Atari contra una IA local en una arena con muros, donde los proyectiles rebotan en las paredes y gana la ronda quien acierte primero al rival — con leaderboard real en Supabase.

## Section 1 — Por qué esta spec existe

VERSUS es la categoría más flaca del catálogo. `duelo-pixel` (placeholder VERSUS, SPEC 10) es un duelo de disparos horizontal con posiciones fijas en los bordes; `estelas` (SPEC 14) es un duelo de motos de luz que se gana por acorralamiento sin disparar; `raqueta` (SPEC 18) es un Pong de paletas y pelota. Esta spec suma un **cuarto** VERSUS con una mecánica claramente distinta de los tres: el arquetipo Combat/Tank — dos tanques que se desplazan y rotan **libremente en 2D** por una arena con muros, disparando proyectiles que **rebotan en las paredes** antes de acertar. No hay posiciones fijas ni disparo horizontal directo (a diferencia de `duelo-pixel`), no se gana con estela permanente (a diferencia de `estelas`) y no hay paleta/pelota (a diferencia de `raqueta`). La estética de dos tanques vectoriales y balas ricocheteando en muros de neón sobre fondo negro es puro CRT/arcade (`.crt-screen`), y produce un puntaje individual acumulativo (rondas ganadas a la IA) apto para leaderboard real, igual que los 4 juegos reales existentes.

Con `tanques`, VERSUS queda en 4 juegos, a la par de ARCADE (4) y SHOOTER (4), equilibrando el catálogo.

A diferencia de las SPEC 10-13 (que activan placeholders ya existentes en `public.games`), `tanques` es un **id nuevo**: requiere insertar una fila en `public.games` y una clase `.cover-tanques` en `app/globals.css`. Esa migración se documenta aquí como paso pendiente; **el planner no la ejecuta**.

## Scope

**In:**

- Construir `components/games/TanquesGame.tsx` desde cero, siguiendo el patrón de la skill `add-game`: `"use client"`, canvas de resolución interna fija escalado por CSS para llenar `.crt-screen` (`aspect-ratio: 4/3`), escalado por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`, SPEC 08), loop propio con `requestAnimationFrame` y física continua pixel-a-pixel con velocidad en px/frame (no grid, no acumulador de tick).
- Arena rectangular con un layout fijo de **muros** internos (rectángulos) además de los 4 bordes exteriores. El layout es simétrico para que ninguno de los dos tanques tenga ventaja inicial.
- Dos tanques: el del jugador y el de la IA, cada uno con posición `(x, y)`, ángulo de orientación (el cañón apunta en la dirección del ángulo) y un color de neón. Arrancan en esquinas/lados opuestos de la arena.
- Movimiento del tanque del jugador estilo Combat: girar izquierda/derecha rota el ángulo; avanzar/retroceder se mueve en la dirección del cañón. Colisión del cuerpo del tanque contra muros y bordes (no los atraviesa).
- Disparo: el jugador dispara un proyectil desde la boca del cañón en la dirección del ángulo. Los proyectiles **rebotan** en muros y bordes por reflexión de eje, y expiran tras `BULLET_MAX_BOUNCES` rebotes o `BULLET_TTL_MS` de vida. Cadencia limitada (cooldown) y máximo de balas propias vivas a la vez.
- Impacto: si un proyectil (de cualquiera de los dos) toca un tanque, ese tanque recibe el impacto → termina la ronda. Si el impactado es la IA, el jugador **gana** la ronda; si el impactado es el jugador, **pierde** una vida.
- IA del oponente: navega la arena persiguiendo/flanqueando al jugador, apunta el cañón hacia él (con imprecisión) y dispara aprovechando líneas o rebotes. Su agresividad, precisión de puntería y cadencia escalan por ronda (`AiTuning` indexado por ronda con clamp), batible en la ronda 1 y perceptiblemente más dura en rondas altas.
- Puntuación y vidas: ganar una ronda suma `ROUND_WIN_POINTS`; cada ronda ganada incrementa el nivel/ronda (`onLevelChange`) y endurece a la IA. Perder una ronda (te aciertan) resta 1 vida (`onLivesChange`). Tras cerrar una ronda (por cualquiera de los dos), se reinicia la disposición de tanques y balas y arranca la siguiente. El jugador empieza con 3 vidas; perder la última congela el loop e invoca `onGameOver(finalScore)`.
- `TanquesGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico que usa `gameRef` en `GamePlayerClient`) vía `forwardRef`/`useImperativeHandle`, y props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` (mismo naming `on<Cosa>Change`; cada callback dispara solo cuando su valor cambia, no cada frame).
- Sin overlay interno de "game over" ni reinicio automático de partida: al llegar a 0 vidas el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)`. El único modal de fin de partida es el que ya vive en `GamePlayerClient`.
- Integración en `components/GamePlayerClient.tsx`: cuando `game.id === "tanques"`, montar `TanquesGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, usar `fourthStat: { kind: "hearts" }` en `REAL_GAME_CONFIG`, y "GUARDAR PUNTUACIÓN" con `insertScore({ gameId: "tanques", name, score })` (Supabase) en `handleSaveScore`.
- Leaderboard real: agregar `"tanques"` a `REAL_SCORE_GAME_IDS` en `lib/types.ts`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08/09) — verificar que no requieren más cambios.
- `public.games`: **INSERT** de una fila nueva `id = 'tanques'` (a diferencia de SPEC 10-13, que hacen `UPDATE` de placeholders existentes), con `title`, `short`, `long`, `cat = 'VERSUS'`, `cover = 'cover-tanques'`, `color = 'yellow'`, `best`, `plays`. Esta migración la ejecuta quien implemente vía `apply_migration`; **el planner no la ejecuta**.
- `app/globals.css`: agregar la clase `.cover-tanques` (portada del catálogo, gradiente/estética neón coherente con las demás `.cover-*`), ya que `tanques` es un id nuevo sin portada previa.

**Out of scope (para futuras specs):**

- Multiplayer real (dos humanos en red o en el mismo teclado) — el "versus" es contra IA local. Cualquier PvP va en su propia spec.
- Modos de juego alternativos (mejor de N rondas con marcador, muerte súbita, power-ups de tanque/proyectil, minas, tanques invisibles al estilo Combat, más de 2 tanques).
- Layouts de arena múltiples o generados proceduralmente — esta spec usa un único layout de muros fijo y simétrico.
- Física 3D o assets bitmap/audio pesados — el render es vectorial (rectángulos, triángulos/polígonos y puntos de canvas).
- Controles táctiles/on-screen o por ratón para móvil.
- Dificultad seleccionable por el jugador (la dificultad la fija la ronda).
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/TanquesGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px) — aspect 4/3
const TANK_SIZE = 26; // lado del cuerpo del tanque (px)
const TANK_SPEED = 2.4; // velocidad de avance/retroceso (px/frame)
const TANK_TURN = 0.05; // velocidad de giro (radianes/frame)
const BULLET_SPEED = 6; // rapidez del proyectil (px/frame)
const BULLET_SIZE = 6; // lado/diámetro del proyectil (px)
const BULLET_MAX_BOUNCES = 3; // rebotes en muros/bordes antes de expirar
const BULLET_TTL_MS = 4000; // vida máxima del proyectil (ms)
const FIRE_COOLDOWN_MS = 600; // cadencia mínima entre disparos del jugador
const MAX_PLAYER_BULLETS = 2; // proyectiles propios vivos a la vez
const START_LIVES = 3; // vidas del jugador (corazones del 4to stat)
const ROUND_WIN_POINTS = 100; // puntos por ronda ganada a la IA

type Vec = { x: number; y: number };

// Muro estático de la arena (AABB); el layout es un array fijo simétrico
type Wall = { x: number; y: number; w: number; h: number };

type Tank = {
  pos: Vec; // centro del tanque (px, origen top-left)
  angle: number; // orientación del cañón (radianes, 0 = derecha)
  color: "yellow" | "cyan"; // jugador = yellow, IA = cyan (contraste)
};

type Bullet = {
  pos: Vec; // centro del proyectil (px)
  vel: Vec; // velocidad en px/frame
  owner: "player" | "ai"; // quién lo disparó (para el conteo por dueño)
  bounces: number; // rebotes acumulados; al superar BULLET_MAX_BOUNCES expira
  bornAt: number; // timestamp de creación (para BULLET_TTL_MS)
};

// Dificultad por ronda (índice = ronda - 1, con clamp al último tramo)
type AiTuning = {
  aggression: number; // 0..1: cuánto persigue vs. mantiene distancia
  aimError: number; // radianes de error de puntería (mayor = más torpe)
  fireCooldownMs: number; // cadencia de disparo de la IA
};

type TanquesState = {
  player: Tank;
  ai: Tank;
  bullets: Bullet[];
  score: number;
  lives: number;
  round: number; // empieza en 1; se refleja como "Nivel" en el HUD
  status: "playing" | "paused" | "over";
};

export type TanquesGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type TanquesGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void; // aquí "level" = ronda
  onGameOver: (finalScore: number) => void;
};
```

Convenciones (mismas que specs de juegos previas):

- Origen del canvas: top-left. Ángulos en radianes (0 = eje +X). Velocidades en px/frame.
- Movimiento continuo pixel-a-pixel dentro del `requestAnimationFrame` (patrón SPEC 08, Bloque Buster), no grid ni acumulador de tick.
- El tanque del jugador se dibuja en `yellow`, el de la IA en `cyan` (contraste); muros en un tono neón tenue; proyectiles con una estela corta. Fondo negro.
- Rebote del proyectil: al solapar un muro/borde por su eje X se invierte `vel.x`; por su eje Y se invierte `vel.y` (reflexión clásica), incrementando `bounces`.
- Colisiones por AABB en cada frame (proyectil↔muro, proyectil↔tanque, cuerpo del tanque↔muro/borde); para rapideces altas, considerar sub-stepping del proyectil o clamp de `BULLET_SPEED` para evitar tunneling.

**`components/GamePlayerClient.tsx`** — reutiliza el `fourthStat` ya generalizado en SPEC 09 (no introduce un nuevo tipo). Solo agrega la entrada de `tanques` a `REAL_GAME_CONFIG`:

```ts
tanques: {
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
  "tanques",
] as const;
```

**`public.games`** — `INSERT` de una fila nueva (id nuevo, no placeholder):

- `id`: `tanques`
- `title`: `TANQUES`
- `cat`: `VERSUS`
- `color`: `yellow`
- `cover`: `cover-tanques`
- `short` (propuesto, a afinar en `/spec`): "Duelo de tanques: acierta al rival esquivando muros."
- `long` (propuesto, a afinar en `/spec`): "El Combat del Vault: conduce tu tanque por una arena de muros de neón, gira el cañón y dispara balas que rebotan en las paredes. Cada ronda que le ganas a la IA la vuelve más letal. Te aciertan tres veces y el duelo termina."
- `best`, `plays`: valores iniciales coherentes con las demás filas (a definir en la migración; p. ej. `best = 0`, `plays = '0'`).

**`app/globals.css`** — nueva clase `.cover-tanques` para la portada del catálogo, en línea estética con las `.cover-*` existentes (gradiente neón que evoque dos tanques y muros sobre fondo oscuro). No hay assets bitmap: la portada es puramente CSS, igual que las demás.

Esta spec **no** introduce assets de imagen/audio (render 100% vectorial en canvas + portada CSS).

## Implementation plan

1. Migración de datos (la ejecuta quien implemente vía `apply_migration`, **no** el planner): `INSERT INTO public.games (id, title, short, long, cat, cover, color, best, plays) VALUES ('tanques', 'TANQUES', ..., 'VERSUS', 'cover-tanques', 'yellow', 0, '0')`. En el mismo paso, agregar la clase `.cover-tanques` en `app/globals.css`. Verificable: `/games` lista la nueva tarjeta "TANQUES" con su portada y `/games/tanques` abre la ficha (aún con el reproductor placeholder, porque el componente todavía no se monta). Nada más se rompe.

2. Crear `components/games/TanquesGame.tsx` con el esqueleto `forwardRef` + `<canvas>` (resolución interna 800×600, escalado por `devicePixelRatio` como Bloque Buster) y un loop `requestAnimationFrame` vacío que solo limpia el fondo, dibuja el layout de muros fijo, y ambos tanques estáticos en sus posiciones iniciales. Compila aislado; todavía no se importa desde ninguna página.

3. Implementar el **movimiento del jugador**: `TanquesState`, input de giro (`←/→` o `A/D`) que rota `player.angle`, avance/retroceso (`↑/↓` o `W/S`) en la dirección del cañón, y colisión del cuerpo del tanque contra muros y bordes (clamp/bloqueo, no los atraviesa). Sin IA, sin balas todavía. Sigue sin montarse.

4. Implementar los **proyectiles del jugador**: disparo (`Espacio`) desde la boca del cañón con `FIRE_COOLDOWN_MS` y `MAX_PLAYER_BULLETS`, movimiento en px/frame, **rebote** por reflexión de eje contra muros/bordes incrementando `bounces`, y expiración por `BULLET_MAX_BOUNCES`/`BULLET_TTL_MS`. Todavía sin daño ni IA. Sigue sin montarse.

5. Implementar la **IA y el cierre de ronda**: el tanque de la IA navega y apunta al jugador con `AiTuning` (agresividad, `aimError`, cadencia) y dispara; detección de impacto proyectil↔tanque por AABB. Cuando una bala toca a la IA → ronda ganada; cuando toca al jugador → ronda perdida. Reset de tanques/balas al cerrar ronda. Tabla `AiTuning` por ronda con clamp. Sigue sin montarse.

6. Implementar el **scoring/vidas y los callbacks**: ronda ganada → +`ROUND_WIN_POINTS`, sube `round` (`onLevelChange`) y endurece la IA; ronda perdida → resta 1 vida (`onLivesChange`); 0 vidas → congela el loop e invoca `onGameOver(finalScore)`. Cablear `onScoreChange`/`onLivesChange`/`onLevelChange` para disparar solo al cambiar el valor, y el handle imperativo `pause`/`resume`/`reset` vía `useImperativeHandle`. Remover listeners y cancelar el rAF en el cleanup del `useEffect`. Sigue sin montarse.

7. En un solo paso atómico: agregar `"tanques"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `TanquesGame` en `GamePlayerClient` cuando `game.id === "tanques"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "tanques", name, score })`. Verificar que `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya cubren el nuevo id por leer genéricamente de `REAL_SCORE_GAME_IDS`; extenderlos solo si algún hardcodeo residual lo exige. `/games/tanques/jugar` queda jugable de verdad con guardado real en Supabase.

8. Pasada final: verificación manual en navegador del flujo completo (conducir y girar el tanque, ver el cuerpo chocar contra muros, disparar y ver la bala rebotar en las paredes y expirar, acertarle a la IA y ver subir el score y la ronda con IA más dura, recibir un impacto y perder una vida, perder las 3 vidas y disparar el modal de "FIN", pausar/reanudar, "FIN" manual, guardar puntuación y verla en `/games/tanques` y en la pestaña "TANQUES" de `/salon`, y confirmar que los otros juegos reales y los placeholders siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games` muestra una tarjeta "TANQUES" (categoría VERSUS, portada `.cover-tanques`) proveniente de la nueva fila en `public.games`.
- [ ] `/games/tanques/jugar` renderiza el canvas real del juego (fondo negro, muros de neón, tanque del jugador yellow, tanque IA cyan) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] Girar (`←/→` o `A/D`) rota el cañón del tanque del jugador y avanzar/retroceder (`↑/↓` o `W/S`) lo mueve en la dirección del cañón, sin atravesar muros ni salir de la arena.
- [ ] Disparar (`Espacio`) crea un proyectil desde la boca del cañón, respetando `FIRE_COOLDOWN_MS` y el máximo de balas propias vivas.
- [ ] Los proyectiles rebotan en muros y bordes y expiran tras el límite de rebotes o de tiempo, sin acumularse indefinidamente.
- [ ] El tanque de la IA navega, apunta y dispara; es batible en la ronda 1 y perceptiblemente más agresivo/preciso en rondas altas.
- [ ] Cuando un proyectil acierta a la IA, el jugador gana la ronda (+100), sube la ronda (4to stat "Nivel") y la IA se endurece; se reinicia la disposición para la siguiente ronda.
- [ ] Cuando un proyectil acierta al jugador, pierde exactamente 1 vida (un corazón menos en el HUD) sin cambiar el score, y se reinicia la disposición.
- [ ] Perder la 3ra vida congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el score final.
- [ ] El 4to stat del HUD externo muestra "Vidas" con corazones (no "Líneas" ni "Longitud") mientras se juega Tanques.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel/Ronda) refleja en tiempo real los valores reales de `TanquesGame`.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar quedarse sin vidas.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "tanques"` (vía `insertScore`).
- [ ] `/games/tanques` y la pestaña "TANQUES" de `/salon` muestran el leaderboard real (top por score descendente) tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, ronda 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) y los placeholders siguen intactos tras el cambio.
- [ ] `npm run build` y `npm run lint` no reportan errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** resolver el "VERSUS" con duelo de tanques estilo Combat contra una IA local en un solo canvas. **No:** multiplayer real (en red o teclado compartido) — la plataforma no tiene infraestructura de tiempo real y está fuera de alcance por la regla de factibilidad.
- **Yes:** navegación 2D libre con rotación + proyectiles que rebotan en muros. **No:** disparo horizontal desde posiciones fijas (`duelo-pixel`, SPEC 10), ni estela/acorralamiento sin disparos (`estelas`, SPEC 14), ni paletas + pelota (`raqueta`, SPEC 18) — Tanques se diferencia deliberadamente para no solapar dentro de VERSUS.
- **Yes:** física continua pixel-a-pixel en px/frame con `devicePixelRatio` y rebote por reflexión de eje (patrón SPEC 08). **No:** grid + acumulador de tick (patrón SPEC 09) — el movimiento por ángulo y el ricochet analógico son la esencia del juego.
- **Yes:** reutilizar el 4to stat `hearts` para las 3 vidas (impactos recibidos permitidos). **No:** inventar un nuevo `kind` de `fourthStat` — el concepto de vidas ya está soportado desde SPEC 05/09.
- **Yes:** dificultad que escala por ronda (`AiTuning` indexado por ronda: agresividad + `aimError` + cadencia, con clamp). **No:** selector de dificultad para el jugador — mantiene la convención "nivel = dificultad" de los otros juegos.
- **Yes:** un único layout de muros fijo y simétrico. **No:** múltiples arenas o generación procedural — se puede añadir en otra spec; empezar simple reduce riesgo de arenas injustas.
- **Yes:** balas con límite de rebotes y TTL. **No:** balas eternas — evitan saturar la arena y forzar empates imposibles.
- **Yes:** puntaje = rondas ganadas a la IA (+100 por ronda), individual y apto para leaderboard real en Supabase. **No:** simulación local (`pushScore`/`seededScores`) — este juego nace como real, consistente con los últimos activados.
- **Yes:** `INSERT` de una fila nueva en `public.games` + clase `.cover-tanques` en `globals.css` con `color = 'yellow'` (único color libre en VERSUS: cyan/magenta/green ya están usados por `duelo-pixel`/`estelas`/`raqueta`). **No:** reutilizar/reasignar un placeholder existente — los 4 (`duelo-pixel`, `gloton`, `ranaria`, `invasores`) ya tienen borrador propio (SPEC 10-13); tomar uno chocaría con esas specs.
- **Yes:** render 100% vectorial + portada CSS. **No:** sprites bitmap o audio — no se proveyeron assets y la mecánica no los necesita.

## Risks

| Risk                                                                                                                                    | Mitigation                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La IA se siente injusta: o imposible (nunca falla, dispara perfecto) o trivial.                                                         | `AiTuning` acota agresividad, `aimError` (imprecisión de puntería) y cadencia por ronda con clamp al último tramo; la IA no apunta perfecto ni dispara sin cooldown; se afina a mano en la prueba manual del paso 8. |
| Balas con rebote saturan la arena o vuelven la ronda eterna.                                                                            | Límite `BULLET_MAX_BOUNCES` y `BULLET_TTL_MS` por proyectil, más `MAX_PLAYER_BULLETS` para las propias.                                                                                                              |
| Tunneling: a rapidez alta un proyectil atraviesa un muro/tanque sin registrar colisión.                                                 | `BULLET_SPEED` moderado y, si hace falta, sub-stepping del movimiento del proyectil por frame; se valida en la prueba manual.                                                                                        |
| El cuerpo del tanque se traba o se cuela en esquinas de muros.                                                                          | Resolución de colisión AABB por eje (separar en X e Y) con clamp; layout de muros sin pasillos más angostos que el tanque; se valida en la prueba manual.                                                            |
| Es un id nuevo: `INSERT` en `public.games` + clase `.cover-tanques` es una migración a producción directa (regla del entorno Supabase). | La migración la ejecuta quien implemente (no el planner), en un solo paso verificable con `RETURNING`; la fila usa `cat`/`color` dentro de los enums (`VERSUS`/`yellow`) y un `cover` con clase CSS nueva y aislada. |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `tanques`.                                                       | Riesgo ya aceptado y documentado desde SPEC 06 para toda la tabla `scores`; no se mitiga en esta spec.                                                                                                               |

## What is **not** in this spec

- Multiplayer real (PvP en red o teclado compartido).
- Modos de juego alternativos (mejor de N rondas con marcador, muerte súbita, power-ups, minas, tanques invisibles, más de 2 tanques).
- Layouts de arena múltiples o generados proceduralmente.
- Sprites bitmap, audio o cualquier asset pesado.
- Controles táctiles/on-screen o por ratón para móvil.
- Selector de dificultad para el jugador.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
