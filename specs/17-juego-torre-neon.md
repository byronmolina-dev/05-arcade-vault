# SPEC 17 — Juego Torre Neón (rebote vertical ascendente)

> **Status:** Draft
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, `devicePixelRatio`), SPEC 09 (Serpentina — generalización del 4to stat `FourthStat` a un valor numérico sin corazones)
> **Date:** 2026-07-23
> **Objective:** Crear desde cero el componente `components/games/TorreNeonGame.tsx` — un juego de rebote vertical ascendente (la nave-píxel rebota sola y el jugador solo mueve en horizontal para caer sobre plataformas neón procedurales que suben sin fin) — como nuevo `id` ARCADE `torre-neon` con jugabilidad y leaderboard real en Supabase, reutilizando la generalización del 4to stat de SPEC 09 para mostrar "Altura".

## Section 1 — Por qué esta spec existe

ARCADE está saturado en el catálogo (bloque-buster, serpentina reales; gloton, ranaria en borrador). Este lote pide cubrir ARCADE **solo** con una mecánica claramente distinta de las cuatro anteriores (rebote de paleta, serpiente en grid, laberinto Pac-Man, cruce de carriles Frogger). El rebote vertical ascendente es esa mecánica nueva: introduce gravedad continua + auto-salto + scroll vertical procedural, ninguno presente en los 6 juegos ya especificados (05-13). No reutiliza ningún placeholder (los 4 ya están tomados por specs 10-13), así que es un `id` nuevo y requiere insertar una fila en `public.games` (paso documentado, no ejecutado por el planner).

## Scope

**In:**

- Construir `components/games/TorreNeonGame.tsx` desde cero: la nave-píxel cae por gravedad y **rebota automáticamente** cada vez que aterriza (cayendo) sobre una plataforma; el jugador solo controla el desplazamiento horizontal con `←`/`→`. No hay botón de salto.
- Canvas de resolución interna fija 480×640 (vertical, cabe en el `aspect-ratio` compartido de `.crt-screen`), con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`/`SerpentinaGame`). Render 100% vectorial (rectángulos/arcos neón), sin assets bitmap ni audio.
- Física simple en px/frame: gravedad constante hacia abajo, velocidad vertical de rebote fija al aterrizar (mismo impulso siempre en plataformas normales), velocidad horizontal controlada por teclado. Envoltura horizontal (wrap-around): salir por el borde izquierdo reaparece por el derecho y viceversa.
- Scroll vertical: cuando la nave sube por encima de la mitad superior del canvas, el mundo se desplaza hacia abajo (la nave se mantiene visualmente centrada-arriba) y se generan nuevas plataformas por encima; las plataformas que salen por debajo del canvas se descartan.
- Generación procedural de plataformas por encima del tope visible, con separación vertical aleatoria dentro de un rango que garantiza que la siguiente plataforma siempre es alcanzable con el impulso de rebote base.
- Tres tipos de plataforma: `normal` (estática), `movil` (se desplaza en horizontal y rebota en los bordes) y `resorte` (da un impulso de rebote mayor, un único super-salto). Sin plataformas frágiles/enemigos en esta spec.
- Puntuación: la "altura" es la distancia máxima ascendida en metros (1 metro = una constante de px). `score` acumula 10 puntos por cada nuevo metro de altura máxima alcanzado, más un bono fijo por cada plataforma `resorte` usada. Nunca decrece (subir y volver a la misma altura no vuelve a sumar).
- Progresión de nivel: cada `METERS_PER_LEVEL` metros de altura sube el nivel (`onLevelChange`) y aumenta ligeramente la dificultad (mayor separación media entre plataformas y mayor proporción de plataformas `movil`), con topes para no volverse imposible.
- Fin de partida: si la nave cae por debajo del borde inferior visible del canvas (no aterrizó sobre ninguna plataforma a tiempo), el loop se congela (último frame visible, sin más actualizaciones) e invoca `onGameOver(finalScore)`. No hay sistema de vidas: una sola caída termina la partida (misma decisión que Serpentina).
- `TorreNeonGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange`, `onHeightChange` (nuevo callback, mismo naming `on<Cosa>Change`, dispara solo cuando la altura máxima en metros cambia), `onGameOver`. No expone `onLivesChange` — el concepto no existe en este juego.
- Generalizar el 4to stat del HUD externo en `GamePlayerClient.tsx`: añadir el `FourthStat` de kind `"height"` (label "Altura", valor numérico en metros, sin corazones), reutilizando exactamente el mecanismo introducido en SPEC 09 para `"length"`; sin cambiar el render de Asteroides/Tetris/Bloque Buster/Serpentina.
- `lib/types.ts`: agregar `"torre-neon"` a `REAL_SCORE_GAME_IDS`. `app/games/[id]/page.tsx` y `SalonClient.tsx` leen genéricamente de esa constante (generalizado en SPEC 07/08); revisar y, si aplica, extender los puntos hardcodeados/fallback para el nuevo `id` igual que se hizo para los juegos reales previos.
- `GamePlayerClient.tsx`: cuando `game.id === "torre-neon"`, montar `TorreNeonGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "torre-neon", name, score })` (Supabase), igual que los 4 juegos reales.
- **Paso pendiente documentado (no lo ejecuta el planner):** insertar la fila nueva en `public.games` vía `apply_migration` con `id = 'torre-neon'`, `title = 'TORRE NEÓN'`, `short`, `long`, `cat = 'ARCADE'`, `cover = 'cover-torre'`, `color = 'magenta'`, `best = 0`, `plays = '0'`; y agregar la clase `.cover-torre` en `app/globals.css` siguiendo el patrón de las otras `.cover-*` (bloque de gradiente neón + `::after`).

**Out of scope (para futuras specs):**

- Sistema de vidas o escudos — una sola caída termina la partida.
- Enemigos/obstáculos móviles que maten al tocarlos (monstruos tipo Doodle Jump), agujeros negros, o plataformas frágiles que se rompen.
- Power-ups adicionales (jetpack, propulsor, escudo) más allá de la plataforma `resorte`.
- Disparo hacia arriba para eliminar obstáculos.
- Inclinación por acelerómetro o controles táctiles/on-screen para móvil.
- Efectos de sonido (no se proveen assets de audio).
- Scroll horizontal o niveles con fin (la torre es infinita).
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/TorreNeonGame.tsx`** (nuevo, constantes internas):

```ts
const VIEW_W = 480; // px, resolución interna del canvas
const VIEW_H = 640;
const GRAVITY = 0.4; // px/frame^2, aceleración vertical hacia abajo
const BOUNCE_VY = -11; // px/frame, impulso vertical al aterrizar en plataforma normal
const SPRING_VY = -18; // px/frame, impulso de la plataforma resorte
const MOVE_VX = 5; // px/frame, velocidad horizontal por input
const PLAYER_W = 36;
const PLAYER_H = 36;
const PLAT_W = 72;
const PLAT_H = 14;
const GAP_MIN = 70; // px, separación vertical mínima entre plataformas
const GAP_MAX = 130; // px, separación vertical máxima (< alcance del rebote base)
const PX_PER_METER = 40; // 1 metro de "Altura" = 40 px ascendidos
const METERS_PER_LEVEL = 25; // metros para subir de nivel
const SPRING_BONUS = 30; // puntos por usar una plataforma resorte

type PlatformKind = "normal" | "movil" | "resorte";

type Platform = {
  x: number; // esquina superior izquierda, coords de mundo
  worldY: number; // coord vertical de mundo (crece hacia arriba = negativo)
  kind: PlatformKind;
  vx: number; // px/frame, solo != 0 si kind === "movil"
};

type TorreState = {
  playerX: number; // esquina sup-izq de la nave, coord de pantalla horizontal
  playerVy: number; // px/frame, velocidad vertical actual
  vx: number; // px/frame horizontal según input (-MOVE_VX | 0 | MOVE_VX)
  worldOffset: number; // px totales desplazados hacia abajo (mundo -> pantalla)
  maxHeightM: number; // altura máxima en metros alcanzada (monótona creciente)
  platforms: Platform[]; // plataformas activas visibles + buffer superior
  score: number;
  level: number;
  status: "playing" | "paused" | "over";
};

export type TorreNeonGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type TorreNeonGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onHeightChange: (meters: number) => void; // maxHeightM, dispara solo si cambia
  onGameOver: (finalScore: number) => void;
};
```

Convenciones:

- Coordenadas de pantalla: origen arriba-izquierda; `y` crece hacia abajo.
- La cámara solo sube: el rebote afecta `playerVy`; cuando la nave supera la línea `VIEW_H * 0.4` subiendo, se acumula el delta en `worldOffset` en vez de mover la nave más arriba, y todas las plataformas se desplazan hacia abajo esa misma cantidad.
- Velocidades en px/frame (rAF), gravedad en px/frame²; la colisión de aterrizaje solo ocurre cuando `playerVy > 0` (cayendo) y la base de la nave cruza el tope de una plataforma.

**`components/GamePlayerClient.tsx`** — extiende el `FourthStat` de SPEC 09 con un nuevo kind:

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" } // Serpentina
  | { kind: "height" }; // Torre Neón — metros, valor numérico sin corazones
```

Se agrega un estado `realHeight` (mismo patrón que `realLength`/`realLines`), alimentado por `onHeightChange`; el label "Altura" y su valor se derivan de `fourthStat.kind === "height"`. Entrada en `REAL_GAME_CONFIG`:

```ts
"torre-neon": {
  fourthStat: { kind: "height" },
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
  "torre-neon",
] as const;
```

**`public.games`** — fila NUEVA (`INSERT`, no `UPDATE`; el `id` no existía):

- `id`: `torre-neon`
- `title`: `TORRE NEÓN`
- `short`: "Rebota sin fin subiendo por plataformas de neón."
- `long`: "Tu nave-píxel rebota sola: solo la mueves de lado a lado para caer sobre las plataformas neón que ascienden sin descanso. Aprovecha los resortes, cruza los bordes de un lado al otro y sube todo lo que puedas. Un solo paso en falso al vacío y la partida termina."
- `cat`: `ARCADE` · `cover`: `cover-torre` · `color`: `magenta` · `best`: `0` · `plays`: `0`

**`app/globals.css`** — nueva clase `.cover-torre` (patrón neón vertical, magenta), siguiendo el estilo de las otras `.cover-*`.

## Implementation plan

1. Crear `components/games/TorreNeonGame.tsx` con el esqueleto: `"use client"`, `forwardRef`/`useImperativeHandle` exponiendo `{ pause, resume, reset }` (no-op por ahora), un `<canvas>` con ajuste por `devicePixelRatio` que solo pinta el fondo neón y una plataforma de inicio bajo la nave. Compila aislado; todavía no se importa desde ninguna página.

2. Implementar la **física core y el estado** (`TorreState`): gravedad + rebote automático al aterrizar (colisión solo cuando `playerVy > 0`), input horizontal `←`/`→` con wrap-around en los bordes, y el impulso fijo `BOUNCE_VY`. La nave rebota indefinidamente sobre una fila de plataformas fijas de prueba. Sin scroll ni generación aún. Test manual (montaje temporal o Storybook-less): la nave rebota y se mueve en horizontal envolviendo los bordes.

3. Agregar **scroll vertical + generación procedural**: acumular `worldOffset` cuando la nave supera la línea superior, generar plataformas nuevas por encima con `GAP_MIN..GAP_MAX`, descartar las que salen por abajo, y calcular `maxHeightM = worldOffset / PX_PER_METER`. Introducir tipos `movil` y `resorte` con sus impulsos. Test manual: subir indefinidamente con plataformas siempre alcanzables; el resorte da un salto notablemente mayor.

4. Cablear **puntuación, nivel, fin y callbacks**: `score` (+10 por metro nuevo de `maxHeightM`, `+SPRING_BONUS` por resorte), `level` cada `METERS_PER_LEVEL`, disparo de `onScoreChange`/`onLevelChange`/`onHeightChange`, y `onGameOver(finalScore)` cuando la nave cae por debajo del borde inferior (loop congelado en el último frame). Implementar `pause`/`resume`/`reset` reales. Sigue sin montarse en ninguna página.

5. Generalizar `components/GamePlayerClient.tsx`: agregar el kind `"height"` al tipo `FourthStat` y el estado `realHeight` (mismo patrón que `realLength`), **sin** agregar aún `"torre-neon"` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para los juegos existentes — verificable jugando cada uno antes de continuar.

6. **Paso pendiente para quien implemente (no lo ejecuta el planner):** `apply_migration` con el `INSERT` en `public.games` para la fila `torre-neon` (campos de la sección Data model) y agregar la clase `.cover-torre` en `app/globals.css`. Con esto `/games` muestra la nueva portada y `/games/torre-neon` la ficha, todavía con arena placeholder.

7. En un solo paso atómico: agregar `"torre-neon"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "height" }`); montar `TorreNeonGame` en el switch de `GamePlayerClient` cuando `game.id === "torre-neon"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "torre-neon", name, score })`; extender los puntos hardcodeados/fallback en `app/games/[id]/page.tsx` y `components/SalonClient.tsx` si aún los requieren para el nuevo `id`. `/games/torre-neon/jugar` queda jugable con guardado real en Supabase.

8. Pasada final: verificación manual en navegador del flujo completo (rebotar, moverse en horizontal con wrap-around, subir con plataformas móviles y resortes, ver "Altura" y "Nivel" crecer, caer al vacío y disparar el fin, pausar/reanudar, "FIN", guardar puntuación y verla en `/games/torre-neon` y `/salon`; confirmar que los 4 juegos reales y los 4 placeholders siguen intactos tras el refactor del paso 5), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games/torre-neon` carga la ficha con `title`, `short`/`long`, portada `.cover-torre` (magenta) y `cat` ARCADE, sin errores.
- [ ] `/games/torre-neon/jugar` renderiza el canvas real dentro de `.crt-screen` (fondo neón + plataformas + nave), no la arena placeholder.
- [ ] La nave rebota automáticamente al aterrizar sobre una plataforma sin ningún input de salto.
- [ ] `←`/`→` mueven la nave en horizontal; salir por un borde la reaparece por el opuesto (wrap-around).
- [ ] Al subir por encima de la línea superior, el mundo se desplaza y se generan plataformas nuevas siempre alcanzables con el rebote base (no hay "muro imposible").
- [ ] Aterrizar en una plataforma `resorte` produce un salto visiblemente mayor que en una `normal` y suma el bono de puntos.
- [ ] Las plataformas `movil` se desplazan en horizontal y rebotan en los bordes del canvas.
- [ ] La "Altura" (metros) es monótona creciente y `score` suma 10 por cada nuevo metro de altura máxima; volver a bajar y resubir a la misma altura no vuelve a sumar.
- [ ] Cada `METERS_PER_LEVEL` metros sube el nivel y la dificultad aumenta de forma perceptible pero acotada.
- [ ] El 4to stat del HUD externo muestra "Altura" con los metros actuales (no corazones, ni "Líneas", ni "Longitud") mientras se juega Torre Neón.
- [ ] Caer por debajo del borde inferior congela el canvas de inmediato y dispara el modal externo de fin con el score final.
- [ ] No existe sistema de vidas: una sola caída termina la partida.
- [ ] "PAUSA" congela y muestra el overlay externo "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto.
- [ ] "FIN" termina la partida de inmediato con el score actual.
- [ ] "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "torre-neon"` (vía `insertScore`).
- [ ] `/games/torre-neon` y la pestaña correspondiente en `/salon` muestran el leaderboard real tras guardar.
- [ ] "JUGAR DE NUEVO" reinicia a estado limpio (score 0, altura 0, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor del 4to stat, Asteroides, Tetris, Bloque Buster y Serpentina muestran su 4to stat exactamente igual que antes.
- [ ] Los 4 placeholders restantes (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando la simulación falsa sin cambios.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** rebote vertical ascendente (tipo Doodle Jump) como la mecánica ARCADE nueva. **No:** otro breakout/snake/laberinto/Frogger — el lote exige una mecánica claramente distinta de las 4 ya cubiertas; la gravedad + auto-salto + scroll vertical procedural no aparece en ningún juego 05-13.
- **Yes:** `id` nuevo `torre-neon` con `INSERT` en `public.games`. **No:** reutilizar un placeholder — los 4 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) ya están tomados por specs 10-13.
- **Yes:** color `magenta`. **No:** cyan/green/yellow — ya usados por los ARCADE existentes (bloque-buster cyan, serpentina/ranaria green, gloton yellow); magenta distingue visualmente la portada (solo Tetris lo usa hoy).
- **Yes:** sin vidas, una caída termina (sigue el precedente honesto de Serpentina). **No:** 3 vidas — no encaja con la mecánica de ascenso continuo.
- **Yes:** reutilizar la generalización `FourthStat` de SPEC 09 añadiendo kind `"height"`. **No:** forzar un valor de "vidas" ficticio ni un nuevo componente de HUD — el mecanismo ya existe y es el más honesto para mostrar "Altura".
- **Yes:** wrap-around horizontal en los bordes (fiel al género). **No:** paredes que detienen la nave — endurecería el juego sin aportar al género.
- **Yes:** tres tipos de plataforma (normal, móvil, resorte) para variedad y curva de dificultad. **No:** enemigos, plataformas frágiles, agujeros negros o power-ups extra — se difieren a otra spec para mantener el alcance contenido.
- **Yes:** puntaje = altura máxima (10 pts/metro) + bono de resorte, apto para leaderboard real en Supabase. **No:** puntaje por tiempo o por plataformas tocadas — la altura es la medida competible natural del género.
- **Yes:** render 100% vectorial, sin audio, sin controles táctiles ni tests. **No:** sprites bitmap/sonidos — no se proveyeron assets; mismo criterio que Serpentina para lo no provisto.

## Risks

| Risk                                                                                                                                              | Mitigation                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor del 4to stat en `GamePlayerClient` (paso 5) toca lógica compartida por los juegos reales y podría romper "Vidas"/"Líneas"/"Longitud". | El paso 5 añade el kind `"height"` **sin** registrar `torre-neon` en `REAL_GAME_CONFIG`; se verifica jugando cada juego existente antes del paso 7, que ya cambia comportamiento de forma atómica.                              |
| Física en px/frame atada al framerate: en dispositivos lentos la nave podría atravesar una plataforma delgada entre frames (tunneling).           | Usar sub-stepping o comprobar el cruce del segmento recorrido por la base de la nave contra el tope de la plataforma (barrido), no solo la posición del frame actual; `PLAT_H` de 14px y `BOUNCE_VY` acotado reducen el riesgo. |
| La generación procedural podría producir una separación mayor que el alcance del rebote base, creando un "muro imposible".                        | `GAP_MAX` se fija por debajo de la altura máxima alcanzable con `BOUNCE_VY` bajo `GRAVITY`; la fórmula del alcance se documenta en el componente y se valida en prueba manual.                                                  |
| `INSERT` público sin auth en `scores` permite puntuaciones falsas o en volumen para `torre-neon`.                                                 | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general; no se mitiga en esta spec.                                                                                                               |
| El planner no ejecuta migraciones; olvidar el `INSERT` en `public.games` dejaría `/games/torre-neon` en 404.                                      | El paso 6 documenta explícitamente el `INSERT` y la clase `.cover-torre` como prerrequisito para quien implemente vía `apply_migration` + skill `add-game`.                                                                     |

## What is **not** in this spec

- Sistema de vidas o escudos.
- Enemigos/obstáculos que maten al tocar, plataformas frágiles, agujeros negros.
- Power-ups extra (jetpack, propulsor, escudo) más allá del resorte.
- Disparo hacia arriba.
- Controles táctiles/acelerómetro y efectos de sonido.
- Scroll horizontal o final de la torre.
- Multijugador o modos alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
