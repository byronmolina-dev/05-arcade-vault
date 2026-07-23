# SPEC 16 — Juego Defensa Orbital (Missile Command)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real: `forwardRef`/handle, callbacks `on<Cosa>Change`/`onGameOver`), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalizó el 4to stat del HUD `FourthStat` con un kind numérico "length")
> **Date:** 2026-07-23
> **Objective:** Crear desde cero `components/games/DefensaOrbitalGame.tsx` — un Missile Command clásico donde apuntas una mira con el ratón y disparas contra-misiles explosivos para interceptar misiles enemigos que caen sobre tus cúpulas — como juego SHOOTER nuevo (`id` nuevo, no placeholder) con leaderboard real en Supabase, generalizando el 4to stat del HUD para mostrar "Cúpulas".

## Section 1 — Por qué existe esta spec

El catálogo SHOOTER tiene un solo juego real (`asteroides`, vuelo libre con inercia) y uno en spec-borrador (`invasores`, formación descendente). Ambos son **ofensivos**: pilotas una nave y disparas hacia los enemigos. Falta una mecánica **defensiva** en el catálogo. Missile Command aporta exactamente eso — no mueves una nave, proteges objetivos en tierra interceptando proyectiles con explosiones de área — y además introduce el **apuntado por ratón**, un input que ningún juego actual usa (todos son teclado). Es un `id` nuevo porque los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) ya están tomados por las specs 10–13.

## Scope

**In:**

- Construir `components/games/DefensaOrbitalGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), 100% vectorial: canvas de resolución interna fija 800×600, con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`).
- **6 cúpulas** (domos defensivos) en posiciones fijas a lo largo del borde inferior. Cada cúpula está viva o destruida. Perder las 6 termina la partida.
- **1 batería lanzadora** en el centro inferior del canvas, munición ilimitada (el factor limitante es el tiempo de vuelo del contra-misil y la duración de la explosión, no un contador de balas).
- **Apuntado por ratón:** `mousemove` sobre el canvas mueve una mira (crosshair) dibujada en la posición del cursor; `click` (o `mousedown`) dispara un contra-misil desde la batería hacia la posición de la mira.
- **Contra-misil del jugador:** viaja en línea recta desde la batería hasta el punto objetivo a velocidad fija (px/frame); al alcanzar el objetivo desaparece y genera una **explosión**.
- **Explosión:** círculo que crece desde radio 0 hasta `MAX_RADIUS` y luego decrece hasta 0; mientras existe, destruye cualquier misil enemigo cuyo punto actual quede dentro del radio (colisión punto-en-círculo). Cada misil enemigo destruido por una explosión suma puntos.
- **Misiles enemigos:** caen desde el borde superior (x aleatoria) hacia un objetivo en tierra (x de una cúpula viva o un punto del suelo), en línea recta a velocidad creciente por oleada, dibujando una estela. Si un misil enemigo alcanza el suelo sobre una cúpula viva, esa cúpula se destruye. Si alcanza el suelo en un hueco (cúpula ya destruida), simplemente desaparece sin efecto.
- **Oleadas:** la partida avanza por oleadas (`onLevelChange` = número de oleada). Cada oleada lanza un número creciente de misiles enemigos a velocidad creciente. Al destruir/aterrizar todos los misiles de la oleada, se da un **bonus de fin de oleada** por cada cúpula que sigue viva, y arranca la siguiente oleada.
- **Puntaje:** `+25` por misil enemigo interceptado; `+100` por cada cúpula viva al cerrar una oleada (bonus). Valores acumulativos, aptos para leaderboard.
- **Fin de partida:** cuando las 6 cúpulas están destruidas, el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)` de inmediato — sin overlay interno ni reinicio automático, igual que los otros juegos reales.
- `DefensaOrbitalGame` expone handle `{ pause(); resume(); reset(); }` (`GameHandle` genérico ya usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange` (oleada), `onCitiesChange` (nuevo callback, mismo naming `on<Cosa>Change`, dispara solo cuando cambia el número de cúpulas vivas) y `onGameOver`. No expone `onLivesChange` (no hay corazones) ni `onLengthChange`.
- **Generalizar el 4to stat** del HUD externo en `GamePlayerClient.tsx`: extender el tipo `FourthStat` (hoy `hearts | lines | length`) con un nuevo kind `cities` (valor numérico, label "Cúpulas"), alimentado por un nuevo estado `realCities` (mismo patrón que `realLength` de SPEC 09), sin cambiar el render de Asteroides/Tetris/Bloque Buster/Serpentina.
- `lib/types.ts`: agregar `"defensa-orbital"` a `REAL_SCORE_GAME_IDS`.
- `GamePlayerClient.tsx`: cuando `game.id === "defensa-orbital"`, montar `DefensaOrbitalGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "defensa-orbital", name, score })` (Supabase), igual que los otros juegos reales.
- Por ser `id` nuevo (no placeholder): documentar el `INSERT` de la fila en `public.games` y la clase `.cover-defensa` en `app/globals.css` como pasos pendientes de la implementación (ver plan). **Esta spec no ejecuta la migración.**

**Out of scope (para futuras specs):**

- Munición limitada por batería y sistema de 3 baterías separadas del Missile Command original — se usa una sola batería con munición ilimitada.
- Explosiones en cadena (que la explosión de un misil enemigo genere otra) — un misil enemigo que aterriza solo destruye la cúpula, no encadena.
- Misiles enemigos que se dividen (MIRV), bombarderos o satélites del Missile Command original.
- Power-ups, misiles inteligentes o mejoras de batería.
- Reconstrucción de cúpulas entre oleadas (las cúpulas destruidas no vuelven).
- Efectos de sonido (no se proveyeron assets de audio para este juego).
- Controles táctiles/on-screen para móvil y apuntado por teclado.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/DefensaOrbitalGame.tsx`** (nuevo, constantes internas):

```ts
const W = 800; // ancho interno del canvas (px)
const H = 600; // alto interno del canvas (px)
const CITY_COUNT = 6; // cúpulas defensivas
const GROUND_Y = 560; // y del suelo donde se asientan las cúpulas
const BATTERY = { x: 400, y: 560 }; // origen de los contra-misiles (centro inferior)

const PLAYER_MISSILE_SPEED = 9; // px/frame del contra-misil hacia el objetivo
const EXPLOSION_MAX_RADIUS = 55; // radio máximo de la explosión (px)
const EXPLOSION_GROW = 1.6; // px/frame de crecimiento
const EXPLOSION_SHRINK = 1.1; // px/frame de decrecimiento

const BASE_ENEMY_SPEED = 1.1; // px/frame de los misiles enemigos en la oleada 1
const ENEMY_SPEED_PER_WAVE = 0.25; // incremento de velocidad por oleada
const BASE_ENEMY_COUNT = 6; // misiles enemigos en la oleada 1
const ENEMY_COUNT_PER_WAVE = 2; // misiles extra por oleada

const POINTS_PER_INTERCEPT = 25; // puntos por misil enemigo destruido
const POINTS_PER_SURVIVING_CITY = 100; // bonus por cúpula viva al cerrar oleada
```

```ts
// Convenciones: origen top-left; velocidades en px/frame; ángulos no se usan
// (todo se mueve por vectores objetivo-origen normalizados).

type Vec = { x: number; y: number };

type City = { x: number; alive: boolean };

type PlayerMissile = {
  pos: Vec;
  target: Vec; // punto donde estallará
  vel: Vec; // dirección * PLAYER_MISSILE_SPEED
};

type EnemyMissile = {
  start: Vec; // borde superior (para dibujar la estela)
  pos: Vec;
  target: Vec; // punto en el suelo (x de cúpula o hueco)
  vel: Vec; // dirección * velocidad de la oleada
};

type Explosion = {
  pos: Vec;
  radius: number;
  phase: "growing" | "shrinking";
};

type GameState = {
  cities: City[]; // longitud CITY_COUNT
  playerMissiles: PlayerMissile[];
  enemyMissiles: EnemyMissile[];
  explosions: Explosion[];
  crosshair: Vec; // posición actual de la mira (ratón)
  score: number;
  wave: number; // 1-based, se refleja en onLevelChange
  enemiesToSpawn: number; // restantes por lanzar en la oleada actual
  spawnTimerMs: number; // acumulador para escalonar el lanzamiento
  status: "playing" | "paused" | "over";
};

export type DefensaOrbitalGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type DefensaOrbitalGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (wave: number) => void;
  onCitiesChange: (citiesAlive: number) => void; // dispara solo si cambia
  onGameOver: (finalScore: number) => void;
};
```

**`components/GamePlayerClient.tsx`** — extiende el 4to stat generalizado en SPEC 09 con un nuevo kind `cities`:

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" } // Serpentina
  | { kind: "cities" }; // Defensa Orbital — nº de cúpulas vivas, sin corazones

// En REAL_GAME_CONFIG:
//   "defensa-orbital": { fourthStat: { kind: "cities" }, suppressExternalPauseOverlay: false }
```

El label ("Vidas" / "Líneas" / "Longitud" / "Cúpulas") y el valor (corazones / `realLines` / `realLength` / `realCities`) se derivan de `fourthStat.kind`. Se agrega un estado `realCities` (mismo patrón que `realLength`), alimentado por `onCitiesChange`, inicializado en `CITY_COUNT` (6).

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "defensa-orbital",
] as const;
```

**`public.games`** — fila NUEVA (`INSERT`, no `UPDATE`; el `id` no existe todavía). Campos:

- `id`: `defensa-orbital`
- `title`: `DEFENSA ORBITAL`
- `short`: "Intercepta misiles enemigos y salva tus cúpulas."
- `long`: "El cielo se llena de proyectiles y solo tú defiendes la colonia. Apunta con la mira, dispara contra-misiles que estallan en el aire y revienta cada ojiva antes de que toque tierra. Cada oleada llega más rápida; cada cúpula que salvas suma. Cuando cae la última cúpula, se acabó."
- `cat`: `SHOOTER`
- `cover`: `cover-defensa`
- `color`: `magenta`
- `best`: `0`
- `plays`: valor inicial coherente con las otras filas nuevas (ej. `"0"`)

**`app/globals.css`** — nueva clase de portada `.cover-defensa` siguiendo el patrón `.cover-*` de las demás portadas (gradiente/estética CRT en tono magenta). Documentada como paso pendiente; no la escribe esta spec.

## Implementation plan

1. **Migración + portada + copy (paso pendiente para quien implemente, NO ejecutado por el planner):** `INSERT` de la fila `defensa-orbital` en `public.games` vía `apply_migration` con los campos listados en Data model, y agregar la clase `.cover-defensa` en `app/globals.css`. Verificable: `/games` lista la nueva tarjeta con su portada y `/games/defensa-orbital` carga la ficha con el copy, ambas usando el fallback de simulación (todavía sin juego real ni leaderboard real). Nada más se rompe.

2. Construir `components/games/DefensaOrbitalGame.tsx` con el **estado y las entidades**: `GameState`, constantes internas, inicialización de las 6 cúpulas y la batería, y las funciones puras de actualización de `playerMissiles` (avance hacia `target`, detección de llegada → crea `Explosion`), `explosions` (crecer/decrecer, eliminar al llegar a radio 0) y `enemyMissiles` (avance hacia `target`, detección de llegada al suelo → destruye cúpula si viva). Compila aislado; aún no se importa desde ninguna página.

3. Agregar **colisiones y puntaje** en el mismo componente: por cada explosión activa, destruir los `enemyMissiles` cuyo `pos` caiga dentro del radio (`+POINTS_PER_INTERCEPT` c/u); lógica de oleada (`enemiesToSpawn`, `spawnTimerMs` para escalonar lanzamientos, cierre de oleada con `+POINTS_PER_SURVIVING_CITY` por cúpula viva y avance a la siguiente con más misiles/velocidad). Sigue sin montarse.

4. Agregar **carga de render en canvas**: ajuste por `devicePixelRatio`, dibujo del suelo, cúpulas (vivas vs. destruidas), batería, misiles enemigos con estela, contra-misiles con estela, explosiones (círculos con relleno translúcido) y la mira en la posición del ratón. HUD interno mínimo opcional (score/oleada). Sigue sin montarse.

5. Agregar **input, ciclo de vida y handle**: listeners de `mousemove` (actualiza `crosshair`) y `mousedown`/`click` (dispara un `PlayerMissile` desde la batería hacia la mira), loop con `requestAnimationFrame` y acumulador de delta-time, props (`onScoreChange`, `onLevelChange`, `onCitiesChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al destruirse la 6ª cúpula, congelar el loop e invocar `onGameOver(finalScore)`. Sigue sin montarse.

6. Generalizar `components/GamePlayerClient.tsx`: extender `FourthStat` con `{ kind: "cities" }` y agregar el estado `realCities` (patrón de `realLength`), **sin** agregar todavía `defensa-orbital` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para los 4 juegos reales existentes — verificable jugando cada uno antes de continuar.

7. En un solo paso atómico: agregar `"defensa-orbital"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "cities" }`, `suppressExternalPauseOverlay: false`); montar `DefensaOrbitalGame` en el switch de `GamePlayerClient` cuando `game.id === "defensa-orbital"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "defensa-orbital", name, score })`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de `REAL_SCORE_GAME_IDS` (generalizado en SPEC 07/08) — confirmar que la ficha y la pestaña del salón muestran el leaderboard real sin cambios extra; ajustar solo si algún punto hardcodeado por `id` lo requiere. `/games/defensa-orbital/jugar` queda jugable de verdad con guardado real en Supabase.

8. Pasada final: verificación manual en navegador del flujo completo (mover la mira con el ratón, disparar contra-misiles, ver la explosión crecer/decrecer, interceptar varios misiles con una sola explosión, ver caer una cúpula por un misil no interceptado, sumar el bonus de fin de oleada, notar la aceleración por oleada, perder las 6 cúpulas → "FIN DEL JUEGO", guardar puntuación y verla en `/games/defensa-orbital` y en `/salon`, y confirmar que Asteroides/Tetris/Bloque Buster/Serpentina y los placeholders restantes siguen intactos tras el refactor del paso 6), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] Existe la fila `defensa-orbital` en `public.games` con `cat = 'SHOOTER'`, `color = 'magenta'`, `cover = 'cover-defensa'` y el `short`/`long` indicados; `/games` muestra la tarjeta y `/games/defensa-orbital` carga la ficha.
- [ ] `/games/defensa-orbital/jugar` renderiza el canvas real (suelo, 6 cúpulas, batería, mira) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] Mover el ratón sobre el canvas mueve la mira a la posición del cursor.
- [ ] Hacer click dispara un contra-misil desde la batería hacia la posición de la mira; al llegar, genera una explosión que crece hasta `EXPLOSION_MAX_RADIUS` y luego decrece hasta desaparecer.
- [ ] Un misil enemigo cuyo punto actual entra en el radio de una explosión se destruye y suma exactamente 25 puntos.
- [ ] Un misil enemigo que llega al suelo sobre una cúpula viva la destruye; el 4to stat del HUD ("Cúpulas") baja en 1.
- [ ] Al destruir/aterrizar todos los misiles de una oleada, sube el número de oleada (`onLevelChange`), se suman 100 puntos por cada cúpula viva, y la siguiente oleada lanza más misiles a mayor velocidad.
- [ ] El 4to stat del HUD externo muestra "Cúpulas" con el número de cúpulas vivas (no corazones, ni "Líneas"/"Longitud") mientras se juega Defensa Orbital.
- [ ] Perder las 6 cúpulas congela el canvas de inmediato y dispara el modal externo de fin de partida con el puntaje final.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "defensa-orbital"` (vía `insertScore`).
- [ ] `/games/defensa-orbital` y la pestaña correspondiente de `/salon` muestran el leaderboard real tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 6 cúpulas, oleada 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor del 4to stat, Asteroides, Tetris, Bloque Buster y Serpentina muestran "Vidas"/"Líneas"/"Longitud" exactamente igual que antes.
- [ ] Los placeholders restantes (los que no hayan pasado a real) siguen mostrando la simulación falsa sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** apuntado por ratón (`mousemove` mira, `click` dispara). **No:** apuntado por teclado — el ratón es el input natural de Missile Command y aporta variedad de input al catálogo (todos los demás son teclado); el canvas ya puede recibir eventos de ratón sin cambiar el patrón.
- **Yes:** una sola batería con munición ilimitada. **No:** 3 baterías con munición limitada del original — se simplifica el estado y el HUD; el factor limitante pasa a ser el tiempo de vuelo del contra-misil y la duración de la explosión.
- **Yes:** 6 cúpulas como "vidas" del juego, reflejadas en el 4to stat "Cúpulas". **No:** un contador de vidas con corazones — el concepto natural aquí es objetivos protegidos, no vidas del jugador; se reutiliza la generalización `FourthStat` de SPEC 09 (que ya añadió "Longitud") en vez de forzar corazones.
- **Yes:** explosión de área que puede destruir varios misiles enemigos a la vez (colisión punto-en-círculo). **No:** impacto puntual 1-a-1 — la explosión de área es la mecánica distintiva de Missile Command y premia el timing.
- **Yes:** oleadas con misiles crecientes en número y velocidad (`onLevelChange` real). **No:** flujo continuo sin oleadas — las oleadas dan estructura de dificultad y un momento natural para el bonus por cúpula sobreviviente.
- **Yes:** puntaje acumulativo (25 por intercepción + 100 por cúpula viva al cerrar oleada) con leaderboard real en Supabase (`insertScore`), agregándolo a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`) — es un juego nuevo pensado para competir de verdad, consistente con los 4 reales existentes.
- **Yes:** render 100% vectorial (círculos, líneas, estelas). **No:** sprites bitmap ni assets — no se proveyeron y la estética CRT neón se logra con formas y color magenta.
- **Yes:** `id` nuevo `defensa-orbital` con `INSERT` en `public.games`. **No:** reutilizar un placeholder — los 4 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) ya están tomados por las specs 10–13.
- **Yes:** las cúpulas destruidas no se reconstruyen. **No:** reparación entre oleadas — se descarta por ahora para mantener la tensión y la simplicidad; podría ir en otra spec.

## Risks

| Risk                                                                                                                                                             | Mitigation                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generalizar el 4to stat de `GamePlayerClient` (paso 6) toca lógica compartida por los juegos reales — un error rompería el render de "Vidas"/"Líneas"/"Longitud" | El paso 6 se hace **sin** agregar `defensa-orbital` a `REAL_GAME_CONFIG` (mismo comportamiento exacto para los 4 juegos reales), verificado manualmente jugando cada uno antes del paso 7, que ya cambia comportamiento de forma atómica; además `FourthStat` ya fue generalizado en SPEC 09, así que este paso solo añade un kind más |
| El radio/tiempo de la explosión mal calibrados hacen el juego trivial (una explosión limpia todo) o imposible (nunca alcanza a interceptar)                      | `EXPLOSION_MAX_RADIUS`, `EXPLOSION_GROW`/`SHRINK` y `PLAYER_MISSILE_SPEED` son constantes internas afinables en prueba manual; el objetivo es interceptar ~2–3 misiles por explosión bien colocada                                                                                                                                     |
| El apuntado por ratón necesita convertir coordenadas de pantalla a coordenadas internas del canvas (800×600 escalado por CSS y DPR)                              | Se usa `canvas.getBoundingClientRect()` para mapear `clientX/clientY` al espacio interno (mismo factor de escala que el render), patrón estándar de canvas con ratón                                                                                                                                                                   |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `"defensa-orbital"`                                                                       | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec                                                                                                                                                                                                                       |

## What is **not** in this spec

- Munición limitada y sistema de 3 baterías.
- Explosiones en cadena, misiles que se dividen (MIRV), bombarderos o satélites.
- Power-ups o mejoras de batería.
- Reconstrucción de cúpulas entre oleadas.
- Efectos de sonido.
- Controles táctiles/on-screen y apuntado por teclado.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
