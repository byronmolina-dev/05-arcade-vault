# SPEC 20 — Juego Caza Neón (matamarcianos de scroll vertical)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real: `forwardRef`/handle, callbacks `on<Cosa>Change`/`onGameOver`, y 4to stat `hearts`/vidas), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient` y canvas con `devicePixelRatio`), SPEC 09 (Serpentina — 4to stat generalizado `FourthStat` y acumulador delta-time)
> **Date:** 2026-07-23
> **Objective:** Crear desde cero `components/games/CazaNeonGame.tsx` — un matamarcianos de scroll vertical estilo Raiden/1942 donde pilotas una nave que dispara hacia arriba en ráfaga automática y esquiva las balas de oleadas de enemigos que entran volando, con un jefe cada varias oleadas — como juego SHOOTER nuevo (`id` nuevo, no placeholder) con leaderboard real en Supabase, reutilizando el 4to stat `hearts` (3 vidas) sin generalizar el HUD.

## Section 1 — Por qué existe esta spec

El catálogo SHOOTER tiene tres mecánicas: `asteroides` (vuelo libre con inercia, rotación, propulsión y wrap-around), `invasores` (formación estática que marcha en bloque de lado a lado, spec-borrador) y `defensa-orbital` (Missile Command defensivo con apuntado por ratón y explosiones de área, spec-borrador). Falta el arquetipo más canónico del shooter de salón: el **matamarcianos de scroll vertical** (Raiden, 1942, Xevious). Aporta una mecánica distinta a las tres: un mundo que hace scroll continuo hacia abajo (sensación de avance), enemigos que **entran y salen volando en patrones** (no una rejilla estática), y **esquive de balas enemigas** (bullet-hell ligero), todo con teclado — lo que además refuerza el contraste con el ratón de Defensa Orbital. Es un `id` nuevo porque los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) ya están tomados por las specs 10–13.

## Scope

**In:**

- Construir `components/games/CazaNeonGame.tsx` desde cero (sin juego de referencia en `references/started-games/`), 100% vectorial: canvas de resolución interna fija vertical **480×640**, con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`/`TorreNeonGame`).
- **Campo estelar de fondo:** puntos que hacen scroll hacia abajo a velocidad constante, dando sensación de avance; puramente decorativo (no colisiona).
- **Nave del jugador:** se mueve en las **4 direcciones** con las flechas o WASD, confinada dentro de los límites del canvas (clamp a los bordes). Dispara en **ráfaga automática hacia arriba** mientras se mantiene pulsada la tecla de disparo (Espacio) con una cadencia fija (`FIRE_COOLDOWN_MS`); sin rotación ni inercia (siempre apunta hacia arriba).
- **Balas del jugador:** viajan en línea recta hacia arriba a velocidad fija (px/frame); se eliminan al salir por el borde superior. Cada bala que impacta un enemigo le resta 1 de vida.
- **Enemigos:** entran desde el borde superior en **oleadas**, siguiendo patrones de vuelo simples y deterministas (ej. descenso recto, zigzag senoidal, arco lateral). Cada enemigo tiene HP (1–2 según tipo). Algunos tipos disparan **balas enemigas** hacia abajo (recto o dirigido a la posición de la nave) con cadencia propia. Un enemigo que sale por el borde inferior sin ser destruido simplemente desaparece (sin penalización de vida).
- **Balas enemigas:** viajan en línea recta a velocidad de la oleada; colisionan con la nave (AABB con margen). Un impacto quita 1 vida a la nave.
- **Colisiones:** bala-jugador ↔ enemigo (AABB), bala-enemiga ↔ nave (AABB), y contacto directo enemigo ↔ nave (AABB) también quita 1 vida. Tras perder una vida, la nave entra en **invulnerabilidad breve** (`INVULN_MS`, parpadeo visual) para evitar perder varias vidas de golpe.
- **Vidas:** la nave tiene **3 vidas** (4to stat `hearts`, ya soportado). Perder la 3ª vida termina la partida.
- **Oleadas:** la partida avanza por oleadas (`onLevelChange` = número de oleada). Cada oleada lanza un conjunto creciente de enemigos, a mayor velocidad de enemigo/bala y mayor cadencia de disparo enemigo. Al destruir/agotar todos los enemigos de la oleada, se da un **bonus de fin de oleada** y arranca la siguiente.
- **Jefe (boss):** cada `WAVES_PER_BOSS` oleadas, en vez de enjambre normal aparece un **jefe** con barra de HP alta y un patrón de disparo contenido; derrotarlo otorga un **bonus de jefe** grande y cierra la oleada.
- **Puntaje:** `+PTS_ENEMY` por enemigo normal destruido; `+PTS_WAVE_CLEAR` por completar una oleada; `+PTS_BOSS` por derrotar al jefe. Valores acumulativos, aptos para leaderboard.
- **Fin de partida:** al perder la 3ª vida, el loop se congela (dibuja el último frame, deja de actualizar) e invoca `onGameOver(finalScore)` de inmediato — sin overlay interno ni reinicio automático, igual que los otros juegos reales.
- `CazaNeonGame` expone handle `{ pause(); resume(); reset(); }` (`GameHandle` genérico ya usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLivesChange` (vidas restantes), `onLevelChange` (oleada) y `onGameOver`. Reutiliza el 4to stat `hearts` existente; **no** requiere generalizar `FourthStat`.
- `lib/types.ts`: agregar `"caza-neon"` a `REAL_SCORE_GAME_IDS`.
- `GamePlayerClient.tsx`: cuando `game.id === "caza-neon"`, montar `CazaNeonGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "caza-neon", name, score })` (Supabase), igual que los otros juegos reales.
- Por ser `id` nuevo (no placeholder): documentar el `INSERT` de la fila en `public.games` y la clase `.cover-caza` en `app/globals.css` como pasos pendientes de la implementación (ver plan). **Esta spec no ejecuta la migración.**

**Out of scope (para futuras specs):**

- Power-ups y armas múltiples (disparo en abanico, láser, misiles teledirigidos, bombas de pantalla) — el arma es única, de un solo cañón hacia arriba, sin niveles.
- Escudos, vidas extra por puntaje o continues.
- Enemigos con IA avanzada, kamikazes que persiguen a la nave o formaciones tipo Galaga que capturan la nave.
- Múltiples jefes distintos o fases de jefe con transformación — un único patrón de jefe reutilizado.
- Scroll de niveles con mapa/terreno diseñado a mano (el fondo es un campo estelar procedural, no un nivel con relieve).
- Efectos de sonido (no se proveyeron assets de audio para este juego).
- Controles táctiles/on-screen para móvil y apuntado por ratón.
- Multijugador (co-op de 2 naves) o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/CazaNeonGame.tsx`** (nuevo, constantes internas):

```ts
const W = 480; // ancho interno del canvas (px)
const H = 640; // alto interno del canvas (px)

const SHIP = { w: 28, h: 32, speed: 4.5 }; // tamaño y velocidad (px/frame) de la nave
const START_LIVES = 3; // vidas iniciales (4to stat hearts)
const INVULN_MS = 1200; // invulnerabilidad tras recibir daño
const FIRE_COOLDOWN_MS = 150; // cadencia de disparo del jugador

const PLAYER_BULLET_SPEED = 8; // px/frame hacia arriba
const BASE_ENEMY_SPEED = 1.4; // px/frame de descenso base (oleada 1)
const ENEMY_SPEED_PER_WAVE = 0.2; // incremento de velocidad por oleada
const BASE_ENEMY_BULLET_SPEED = 3; // px/frame de las balas enemigas (oleada 1)

const BASE_ENEMY_COUNT = 8; // enemigos en la oleada 1
const ENEMY_COUNT_PER_WAVE = 3; // enemigos extra por oleada
const WAVES_PER_BOSS = 5; // cada cuántas oleadas aparece un jefe
const BOSS_HP = 60; // vida del jefe

const PTS_ENEMY = 100; // puntos por enemigo normal destruido
const PTS_WAVE_CLEAR = 250; // bonus por completar una oleada
const PTS_BOSS = 2000; // bonus por derrotar al jefe

const STAR_COUNT = 60; // puntos del campo estelar de fondo
const STAR_SPEED = 2; // px/frame de scroll del fondo
```

```ts
// Convenciones: origen top-left; velocidades en px/frame; y crece hacia abajo.
// Colisiones por AABB (rectángulos alineados a ejes) con margen.

type Vec = { x: number; y: number };

type EnemyKind = "recto" | "zigzag" | "arco"; // patrón de vuelo determinista

type Enemy = {
  pos: Vec;
  hp: number;
  kind: EnemyKind;
  t: number; // tiempo de vida, para patrones senoidales/deterministas
  fireTimerMs: number; // acumulador para disparo enemigo (0 = no dispara)
};

type Boss = {
  pos: Vec;
  hp: number; // hasta BOSS_HP
  t: number;
  fireTimerMs: number;
};

type Bullet = {
  pos: Vec;
  vel: Vec; // dirección * velocidad
  from: "player" | "enemy";
};

type Star = { pos: Vec }; // decorativo, scroll hacia abajo

type GameState = {
  ship: Vec; // posición (esquina sup-izq del AABB de la nave)
  lives: number; // START_LIVES → 0
  invulnUntilMs: number; // timestamp interno hasta el que la nave es invulnerable
  fireCooldownMs: number; // acumulador de cadencia de disparo
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: Enemy[];
  boss: Boss | null; // no-null durante una oleada de jefe
  stars: Star[];
  score: number;
  wave: number; // 1-based, se refleja en onLevelChange
  enemiesToSpawn: number; // restantes por lanzar en la oleada actual
  spawnTimerMs: number; // acumulador para escalonar el spawn
  status: "playing" | "paused" | "over";
};

export type CazaNeonGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type CazaNeonGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (wave: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

**`components/GamePlayerClient.tsx`** — **no** requiere generalizar `FourthStat`. Reutiliza el kind `hearts` ya existente:

```ts
// En REAL_GAME_CONFIG:
//   "caza-neon": { fourthStat: { kind: "hearts" }, suppressExternalPauseOverlay: false }
```

Las vidas restantes se muestran con el 4to stat "Vidas" (corazones), alimentado por `onLivesChange`, exactamente como ya lo hacen Asteroides y Bloque Buster. No se agrega ningún estado nuevo tipo `realCities`/`realLength`.

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
  "caza-neon",
] as const;
```

**`public.games`** — fila NUEVA (`INSERT`, no `UPDATE`; el `id` no existe todavía). Campos:

- `id`: `caza-neon`
- `title`: `CAZA NEÓN`
- `short`: "Pilota tu caza, esquiva el enjambre y revienta al jefe."
- `long`: "El vacío se llena de cazas enemigos que bajan en formación disparando. Muévete rápido, mantén el dedo en el gatillo y deja una estela de chatarra a tu paso. Cada oleada aprieta más y, cada cierto tramo, un acorazado bloquea el camino. Aguanta con tres vidas y sube tu marca."
- `cat`: `SHOOTER`
- `cover`: `cover-caza`
- `color`: `cyan`
- `best`: `0`
- `plays`: valor inicial coherente con las otras filas nuevas (ej. `"0"`)

**`app/globals.css`** — nueva clase de portada `.cover-caza` siguiendo el patrón `.cover-*` de las demás portadas (gradiente/estética CRT en tono cyan). Documentada como paso pendiente; no la escribe esta spec.

## Implementation plan

1. **Migración + portada + copy (paso pendiente para quien implemente, NO ejecutado por el planner):** `INSERT` de la fila `caza-neon` en `public.games` vía `apply_migration` con los campos listados en Data model, y agregar la clase `.cover-caza` en `app/globals.css`. Verificable: `/games` lista la nueva tarjeta con su portada y `/games/caza-neon` carga la ficha con el copy, ambas usando el fallback de simulación (todavía sin juego real ni leaderboard real). Nada más se rompe.

2. Construir `components/games/CazaNeonGame.tsx` con el **estado y las entidades**: `GameState`, constantes internas, inicialización de la nave, el campo estelar y los arrays vacíos, y las funciones puras de actualización de `playerBullets`/`enemyBullets` (avance por `vel`, descarte fuera de pantalla), `stars` (scroll con reinserción arriba) y movimiento de `enemies` según `kind` (recto/zigzag/arco, deterministas por `t`). Compila aislado; aún no se importa desde ninguna página.

3. Agregar **spawn de oleadas, disparo enemigo, colisiones y puntaje** en el mismo componente: lógica de oleada (`enemiesToSpawn`, `spawnTimerMs` para escalonar spawns, cierre de oleada con `+PTS_WAVE_CLEAR` y avance con más/ más rápidos enemigos), disparo enemigo por `fireTimerMs`, colisiones AABB bala-jugador↔enemigo (`+PTS_ENEMY`), bala-enemiga↔nave y enemigo↔nave (−1 vida + `INVULN_MS`), y aparición del jefe cada `WAVES_PER_BOSS` oleadas (HP `BOSS_HP`, `+PTS_BOSS` al derrotarlo). Sigue sin montarse.

4. Agregar **capa de render en canvas**: ajuste por `devicePixelRatio`, dibujo del campo estelar, la nave (con parpadeo durante invulnerabilidad), enemigos por tipo, jefe con barra de HP, balas de jugador y enemigas con estela. HUD interno mínimo opcional (score/oleada). Sigue sin montarse.

5. Agregar **input, ciclo de vida y handle**: listeners de teclado (flechas/WASD = mover con clamp a bordes; Espacio mantenido = disparo automático por `FIRE_COOLDOWN_MS`), loop con `requestAnimationFrame` y acumulador de delta-time, props (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al perder la 3ª vida, congelar el loop e invocar `onGameOver(finalScore)`. Sigue sin montarse.

6. En un solo paso atómico: agregar `"caza-neon"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "hearts" }`, `suppressExternalPauseOverlay: false`); montar `CazaNeonGame` en el switch de `GamePlayerClient` cuando `game.id === "caza-neon"`, cableando PAUSA/REANUDAR/FIN al `gameRef`, `onLivesChange`→4to stat "Vidas", y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "caza-neon", name, score })`. `app/games/[id]/page.tsx` y `components/SalonClient.tsx` ya leen genéricamente de `REAL_SCORE_GAME_IDS` (generalizado en SPEC 07/08) — confirmar que la ficha y la pestaña del salón muestran el leaderboard real sin cambios extra; ajustar solo si algún punto hardcodeado por `id` lo requiere. `/games/caza-neon/jugar` queda jugable de verdad con guardado real en Supabase.

7. Pasada final: verificación manual en navegador del flujo completo (mover la nave, disparo automático, destruir enemigos de varios tipos, esquivar balas, recibir un golpe y ver la invulnerabilidad parpadeante, completar una oleada y sumar el bonus, notar la aceleración por oleada, llegar al jefe y derrotarlo por su bonus, perder las 3 vidas → "FIN DEL JUEGO", guardar puntuación y verla en `/games/caza-neon` y en `/salon`, y confirmar que Asteroides/Tetris/Bloque Buster/Serpentina y los placeholders restantes siguen intactos), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] Existe la fila `caza-neon` en `public.games` con `cat = 'SHOOTER'`, `color = 'cyan'`, `cover = 'cover-caza'` y el `short`/`long` indicados; `/games` muestra la tarjeta y `/games/caza-neon` carga la ficha.
- [ ] `/games/caza-neon/jugar` renderiza el canvas real (campo estelar en scroll, nave, enemigos) dentro de `.crt-screen`, en vez del placeholder `.game-arena`.
- [ ] Las flechas/WASD mueven la nave en las 4 direcciones y la nave no puede salir de los bordes del canvas.
- [ ] Mantener Espacio dispara balas hacia arriba a cadencia fija; cada bala que impacta un enemigo le resta vida y, al agotarla, lo destruye sumando exactamente 100 puntos.
- [ ] Al menos dos tipos de enemigo se mueven con patrones distintos (ej. recto y zigzag) y al menos un tipo dispara balas hacia abajo.
- [ ] Una bala enemiga o un enemigo que toca la nave le quita 1 vida y activa una invulnerabilidad breve con parpadeo; durante ella no se pierde otra vida.
- [ ] El 4to stat del HUD externo muestra "Vidas" (corazones) con las vidas restantes mientras se juega Caza Neón.
- [ ] Al eliminar/agotar todos los enemigos de una oleada, sube el número de oleada (`onLevelChange`), se suman 250 puntos de bonus y la siguiente oleada trae más enemigos a mayor velocidad.
- [ ] Cada 5 oleadas aparece un jefe con barra de HP; derrotarlo suma 2000 puntos y cierra la oleada.
- [ ] Perder la 3ª vida congela el canvas de inmediato y dispara el modal externo de fin de partida con el puntaje final.
- [ ] "PAUSA" congela el juego y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "caza-neon"` (vía `insertScore`).
- [ ] `/games/caza-neon` y la pestaña correspondiente de `/salon` muestran el leaderboard real tras guardar una puntuación.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, 3 vidas, oleada 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Asteroides, Tetris, Bloque Buster y Serpentina siguen mostrando su 4to stat exactamente igual que antes, y los placeholders restantes siguen mostrando la simulación falsa sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** scroll vertical con campo estelar en movimiento y enemigos que entran volando en patrones. **No:** rejilla estática que marcha de lado a lado (eso es Invasores) — el scroll continuo y los patrones de vuelo son lo que distingue el shmup del Space Invaders.
- **Yes:** input por teclado (mover 4 direcciones + Espacio para disparo automático). **No:** apuntado por ratón — el ratón ya es el input distintivo de Defensa Orbital; el teclado mantiene el contraste y es el input natural del shmup vertical.
- **Yes:** sin rotación ni inercia; la nave siempre apunta hacia arriba con movimiento directo. **No:** física de vuelo libre con propulsión y wrap (eso es Asteroides) — el shmup usa movimiento posicional directo.
- **Yes:** 3 vidas reutilizando el 4to stat `hearts` existente. **No:** generalizar `FourthStat` con un kind nuevo — a diferencia de Defensa Orbital ("Cúpulas"), aquí el concepto natural es vidas de la nave, ya soportado sin tocar lógica compartida.
- **Yes:** esquive de balas enemigas con invulnerabilidad breve tras el golpe. **No:** bullet-hell denso de patrones complejos — se mantiene "ligero" y esquivable para que sea justo con teclado.
- **Yes:** un único tipo de jefe cada 5 oleadas con HP y patrón contenidos. **No:** varios jefes o fases de transformación — se acota el alcance; podrían ir en otra spec.
- **Yes:** arma única de un cañón hacia arriba, sin power-ups. **No:** armas múltiples, abanico, bombas o escudos — se deja fuera para mantener el estado y el balance simples; van en otra spec si llegan.
- **Yes:** puntaje acumulativo (100 por enemigo + 250 por oleada + 2000 por jefe) con leaderboard real en Supabase (`insertScore`), agregándolo a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`) — es un juego nuevo pensado para competir de verdad, consistente con los 4 reales existentes.
- **Yes:** render 100% vectorial (formas, estelas y campo estelar como puntos). **No:** sprites bitmap ni assets — no se proveyeron y la estética CRT neón se logra con formas y color cyan.
- **Yes:** `id` nuevo `caza-neon` con `INSERT` en `public.games`. **No:** reutilizar un placeholder — los 4 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) ya están tomados por las specs 10–13.

## Risks

| Risk                                                                                                 | Mitigation                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Densidad de balas enemigas mal calibrada hace el juego imposible (o trivial) de esquivar con teclado | `BASE_ENEMY_BULLET_SPEED`, la cadencia de disparo enemigo y el número de enemigos que disparan son constantes internas afinables; además hay `INVULN_MS` tras cada golpe para evitar perder varias vidas seguidas |
| Balas rápidas pueden atravesar la nave a bajo framerate (tunneling)                                  | Colisión por AABB con margen y, si hace falta, sub-stepping del avance de balas por frame; el loop usa acumulador delta-time (patrón SPEC 09)                                                                     |
| El jefe con HP alto puede eternizar o trabar la partida si su patrón es demasiado esquivo            | `BOSS_HP` y su patrón de disparo son constantes contenidas; el jefe ocupa el ancho superior sin huir, garantizando que el disparo del jugador lo alcance                                                          |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas para `"caza-neon"`                 | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec                                                                                                  |

## What is **not** in this spec

- Power-ups, armas múltiples, abanico, láser, misiles teledirigidos o bombas de pantalla.
- Escudos, vidas extra por puntaje o continues.
- Enemigos con IA avanzada, kamikazes que persiguen, o captura de nave tipo Galaga.
- Múltiples jefes o fases de jefe con transformación.
- Niveles con terreno/mapa diseñado a mano (el fondo es un campo estelar procedural).
- Efectos de sonido.
- Controles táctiles/on-screen y apuntado por ratón.
- Multijugador (co-op) o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
