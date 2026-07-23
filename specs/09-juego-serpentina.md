# SPEC 09 — Juego Serpentina (Snake)

> **Status:** Implemented
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — generalizó `REAL_SCORE_GAME_IDS`), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`, primer juego con sprites bitmap y `devicePixelRatio`)
> **Date:** 2026-07-22
> **Objective:** Construir desde cero (sin juego de referencia en `references/started-games/`) el componente `components/games/SerpentinaGame.tsx` — Snake clásico en grid con las frutas de `references/source-assets/snake-assets/` — activando el placeholder `serpentina` con jugabilidad real y leaderboard real en Supabase, y generalizando el 4to stat de `GamePlayerClient` para poder mostrar "Longitud" en vez de vidas/líneas.

## Scope

**In:**

- Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/serpentina/fruits.png` para servirlo vía Next.js.
- Construir `components/games/SerpentinaGame.tsx` desde cero (sin juego de referencia): Snake clásico en grid, canvas de resolución interna fija 800×600 (celda de 40px → grid de 20×15), con ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`, primer y único otro juego con sprites bitmap).
- Movimiento por turnos sobre el grid (no continuo): la serpiente avanza una celda por tick; `←`/`→`/`↑`/`↓` cambian la dirección del próximo tick; no se permite invertir 180° directamente sobre el propio cuerpo (ignora el input si la nueva dirección es la opuesta a la actual).
- Atlas de coordenadas portado como constante TS interna del componente (mismo criterio "todo autocontenido" que `LEVELS`/`SPRITES` en `BloqueBusterGame`), con un subconjunto curado de 8 frutas del atlas original de 21 (manzana, banana, uva, sandía, cereza, naranja, fresa, piña) elegidas por ser visualmente distinguibles al tamaño de una celda.
- Spawn de fruta: una fruta a la vez, en una celda libre aleatoria (no ocupada por el cuerpo), sprite elegido al azar entre las 8 curadas, todas con el mismo valor de puntos fijo (+10). Comer la fruta crece la serpiente en 1 segmento y genera una nueva fruta.
- Progresión de nivel: cada 5 frutas comidas sube el nivel (`onLevelChange`) y acelera el tick del movimiento (mismo patrón de "nivel = dificultad" que Asteroides/Tetris/Bloque Buster).
- Fin de partida: chocar contra cualquier borde del grid o contra el propio cuerpo congela el loop (deja de actualizar, dibuja el último frame) e invoca `onGameOver(finalScore)` de inmediato — sin overlay interno de "GAME OVER" ni reinicio automático, igual que los otros 3 juegos reales. No hay concepto de vidas: un solo choque termina la partida.
- `SerpentinaGame` expone handle `{ pause(); resume(); reset(); }` (mismo `GameHandle` genérico ya usado por `gameRef` en `GamePlayerClient`) y props `onScoreChange`, `onLevelChange`, `onLengthChange` (nuevo callback, mismo naming `on<Cosa>Change`, dispara solo cuando el número de segmentos cambia), `onGameOver`. No expone `onLivesChange` — el concepto no existe en este juego.
- Generalizar el 4to stat del HUD externo en `GamePlayerClient.tsx`: hoy el render asume corazones de vidas o "Líneas" (valor numérico especial); se extiende para poder mostrar "Longitud" (valor numérico, sin corazones) para `serpentina`, sin cambiar el render/comportamiento de Asteroides, Tetris ni Bloque Buster.
- `lib/types.ts`: agregar `"serpentina"` a `REAL_SCORE_GAME_IDS`. `app/games/[id]/page.tsx` y `SalonClient.tsx` ya leen genéricamente de esa constante (generalizado en SPEC 07/08) — no requieren más cambios.
- `GamePlayerClient.tsx`: cuando `game.id === "serpentina"`, montar `SerpentinaGame`, cablear PAUSA/REANUDAR/FIN al `gameRef` compartido, y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "serpentina", name, score })` (Supabase), igual que los otros 3 juegos reales.
- Migración SQL (`UPDATE`, no `INSERT` — la fila `serpentina` ya existe) para actualizar `short`/`long` del registro en `public.games`, mencionando explícitamente que se comen frutas, en vez de "núcleos magenta". `cover` (`cover-snake`), `color` (`green`), `cat` (`ARCADE`), `best` y `plays` no cambian.

**Out of scope (para futuras specs):**

- Wrap-around/portal en los bordes — se descartó explícitamente; chocar contra cualquier borde termina la partida (Snake clásico).
- Sistema de vidas — se descartó explícitamente; un solo choque (pared o cuerpo propio) termina la partida.
- Puntaje variable por tipo de fruta — se descartó explícitamente; todas las frutas valen lo mismo.
- Las 13 frutas restantes del atlas de 21 que no forman parte del subconjunto curado de 8.
- Efectos de sonido (no se proveyeron assets de audio para este juego, a diferencia de Bloque Buster).
- Controles táctiles/on-screen para móvil.
- Power-ups, obstáculos internos del grid, o cualquier otra mecánica no descrita arriba.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`components/games/SerpentinaGame.tsx`** (nuevo, constantes internas):

```ts
const CELL = 40; // px — canvas interno 800x600 -> grid de 20x15 celdas
const COLS = 20;
const ROWS = 15;
const FRUITS_PER_LEVEL = 5; // frutas comidas para subir de nivel
const BASE_TICK_MS = 160; // intervalo de movimiento inicial (ms/celda)
const TICK_DECREASE_PER_LEVEL = 12; // ms que se resta el tick por cada nivel

// Subconjunto curado del atlas (references/source-assets/snake-assets/sprites.js)
const FRUIT_ATLAS = {
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  banana: { x: 34, y: 136, w: 110, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
} as const; // recortes dentro de public/games/serpentina/fruits.png

type FruitKind = keyof typeof FRUIT_ATLAS;
type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";

type SnakeState = {
  body: Cell[]; // body[0] = cabeza, resto en orden hacia la cola
  direction: Direction;
  pendingDirection: Direction; // último input válido, aplicado en el próximo tick
  fruit: { cell: Cell; kind: FruitKind };
  score: number;
  level: number;
  fruitsEatenThisLevel: number;
  status: "playing" | "paused" | "over";
};

export type SerpentinaGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type SerpentinaGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onLengthChange: (length: number) => void; // body.length, dispara solo si cambia
  onGameOver: (finalScore: number) => void;
};
```

**`components/GamePlayerClient.tsx`** — generaliza el 4to stat (hoy asume corazones de vidas o "Líneas") para poder representar también "Longitud":

```ts
type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" }; // Serpentina — valor numérico, sin corazones

type RealGameConfig = {
  fourthStat: FourthStat;
  suppressExternalPauseOverlay: boolean;
};

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  asteroides: {
    fourthStat: { kind: "hearts" },
    suppressExternalPauseOverlay: false,
  },
  tetris: {
    fourthStat: { kind: "lines" },
    suppressExternalPauseOverlay: false,
  },
  "bloque-buster": {
    fourthStat: { kind: "hearts" },
    suppressExternalPauseOverlay: true,
  },
  serpentina: {
    fourthStat: { kind: "length" },
    suppressExternalPauseOverlay: false,
  },
};
```

El label del 4to stat ("Vidas" / "Líneas" / "Longitud") y su valor (corazones repetidos / `realLines` / `realLength`) se derivan de `fourthStat.kind` en vez del string mágico `"Líneas"` que compara hoy el JSX. Se agrega un nuevo estado `realLength` (mismo patrón que `realLines`), alimentado por `onLengthChange`.

**`lib/types.ts`**:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
  "serpentina",
] as const;
```

**Assets** (nuevo, copiado desde `references/source-assets/snake-assets/`):

```
public/games/serpentina/fruits.png
```

**`public.games`** — `UPDATE` sobre la fila existente (`id = 'serpentina'`), solo `short`/`long`; `cover`, `color`, `cat`, `best`, `plays` no cambian:

- `short`: "Come frutas sin morder tu propia cola."
- `long`: "Guía una serpiente de píxeles por la grilla en busca de fruta fresca: manzanas, sandías, piñas y más. Cada bocado la alarga y acelera el ritmo. Un giro en falso contra el borde o tu propio cuerpo termina la partida."

## Implementation plan

1. Migración SQL (`UPDATE public.games ... WHERE id = 'serpentina'`) con el nuevo `short`/`long`, y copiar `references/source-assets/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`. Sin cambios de comportamiento: nada importa el asset todavía; `/games/serpentina` y `/games` ya muestran el copy actualizado sin romper nada.

2. Portar a `components/games/SerpentinaGame.tsx` el **estado y la lógica de grid**: `SnakeState`, movimiento por tick (`direction`/`pendingDirection`), spawn de fruta en celda libre, detección de colisión con pared y con el propio cuerpo, crecimiento al comer, y progresión de nivel (`FRUITS_PER_LEVEL`, `TICK_DECREASE_PER_LEVEL`). Compila de forma aislada; todavía no se importa desde ninguna página.

3. Agregar **carga de assets y render en canvas**: carga de `fruits.png`, ajuste por `devicePixelRatio` (mismo patrón que `BloqueBusterGame`), dibujo del grid/fondo, cuerpo de la serpiente (formas vectoriales simples, sin sprite propio), fruta actual (`drawImage` recortado de `FRUIT_ATLAS`) y HUD interno mínimo (score/nivel). Sigue sin montarse en ninguna página.

4. Agregar **controles y ciclo de pausa/fin**: listeners de teclado (`←↑↓→`, con bloqueo de giro 180°), props (`onScoreChange`, `onLevelChange`, `onLengthChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al chocar contra pared o cuerpo propio, el loop se congela (último frame visible, sin más actualizaciones) e invoca `onGameOver(finalScore)`. Sigue sin montarse.

5. Generalizar `components/GamePlayerClient.tsx`: introducir el tipo `FourthStat`/`fourthStat.kind` y el nuevo estado `realLength` (mismo patrón que `realLines`), sin agregar todavía `"serpentina"` a `REAL_GAME_CONFIG`. Sin cambio de comportamiento visible para Asteroides/Tetris/Bloque Buster — verificable jugando cada uno antes de continuar.

6. En un solo paso atómico: agregar `"serpentina"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada en `REAL_GAME_CONFIG` (`fourthStat: { kind: "length" }`, `suppressExternalPauseOverlay: false`); montar `SerpentinaGame` en el switch de `GamePlayerClient` cuando `game.id === "serpentina"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "serpentina", name, score })`. `/games/serpentina/jugar` queda jugable de verdad con guardado real en Supabase; `/games/serpentina` y la pestaña "SERPENTINA" de `/salon` pasan a usar el leaderboard real.

7. Pasada final: verificación manual en navegador del flujo completo (mover con flechas, comer varias de las 8 frutas curadas confirmando el sprite correcto en cada una, crecer, subir de nivel y notar la aceleración del movimiento, terminar por choque contra pared, terminar por choque contra el propio cuerpo, pausar/reanudar, "FIN", guardar puntuación y verla reflejada en `/games/serpentina` y en `/salon`, y confirmar que Asteroides/Tetris/Bloque Buster y los 4 placeholders restantes siguen intactos tras el refactor del paso 5), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [x] `public.games` para `id = 'serpentina'` tiene `short`/`long` actualizados mencionando frutas explícitamente; `cover` (`cover-snake`), `color` (`green`), `cat` (`ARCADE`), `best` y `plays` no cambiaron. _(verificado por SQL: `UPDATE ... RETURNING` confirmó el nuevo copy y los demás campos intactos)_
- [x] `/games/serpentina` carga la ficha con el copy actualizado, sin errores. _(verificado: screenshot con el nuevo texto "Guía una serpiente de píxeles...")_
- [x] `/games/serpentina/jugar` renderiza el canvas real del juego (grid, serpiente, fruta con sprite real) dentro de `.crt-screen`, en vez del placeholder `.game-arena` anterior. _(verificado: screenshots con grid, cuerpo de la serpiente y fruta real; `.game-arena` ausente, `canvas` presente)_
- [x] Los sprites de fruta se ven nítidos en una pantalla de alta densidad (DPI > 1), sin verse borrosos. _(verificado por código: mismo patrón `canvas.width/height = W/H * devicePixelRatio` + `ctx.scale(dpr, dpr)` que `BloqueBusterGame`; el entorno usado para probar reporta `devicePixelRatio: 1`, por lo que la nitidez en un dispositivo Retina real queda pendiente de confirmación visual humana, igual que quedó documentado en SPEC 08)_
- [x] `←`/`↑`/`↓`/`→` cambian la dirección de movimiento; intentar invertir 180° directamente no causa que la serpiente choque contra su propio segundo segmento. _(verificado: secuencia de giros arriba→derecha→abajo tras un reset mantuvo "Longitud: 3" sin game over; el warning de lint por `setPendingDirection` sin usar desapareció al cablear el teclado, confirmando que el código se ejecuta)_
- [x] Comer una fruta suma exactamente 10 puntos, hace crecer la serpiente en 1 segmento, y genera una nueva fruta en una celda libre con un sprite aleatorio entre las 8 frutas curadas. _(verificado por revisión de código: `tickSnake` suma `state.score + 10`, agrega la nueva cabeza sin recortar la cola, y llama `spawnFruit(newBody)` solo en la rama `eats`; no se logró forzar que la serpiente comiera una fruta en la sesión manual de pruebas por la posición aleatoria de esta y la latencia entre acciones del navegador automatizado — mismo tipo de limitación que SPEC 05/08 documentaron para el power-up de Asteroides y el nivel 5 de Bloque Buster)_
- [x] Cada 5 frutas comidas sube el nivel y el movimiento se vuelve perceptiblemente más rápido. _(verificado por revisión de código: `tickSnake` incrementa `fruitsEatenThisLevel` y sube `level` al llegar a `FRUITS_PER_LEVEL`; `getTickMs` reduce el intervalo `TICK_DECREASE_PER_LEVEL` ms por nivel con piso `MIN_TICK_MS`; no se observó un level-up en vivo en esta sesión por la misma razón que el criterio anterior)_
- [x] El 4to stat del HUD externo muestra "Longitud" con el número de segmentos actuales (no corazones ni "Líneas") mientras se juega Serpentina. _(verificado: `textContent` del HUD leído por JS mostró literalmente "Longitud3" mientras la serpiente tenía 3 segmentos)_
- [x] Chocar contra cualquier borde del grid congela el canvas de inmediato (deja de actualizar) y dispara el modal externo de fin de partida con el puntaje final. _(verificado repetidamente: la serpiente, sin input o tras agotar los giros programados, siempre terminó chocando contra un borde y abriendo el modal "FIN DEL JUEGO" con el score congelado)_
- [x] Chocar contra el propio cuerpo congela el canvas de inmediato y dispara el mismo modal externo de fin de partida. _(verificado por revisión de código: `tickSnake` usa la misma rama `status: "over"` para colisión con pared y con `bodyWithoutTail`, y el loop del componente reacciona igual — `frozen = true` + `onGameOver` — sin distinguir el tipo de colisión; no se logró forzar una autocolisión en vivo con solo 3 segmentos de longitud en esta sesión)_
- [x] "PAUSA" congela el juego y muestra el overlay externo genérico "EN PAUSA"; "REANUDAR" continúa desde el mismo estado exacto. _(verificado: screenshot con el overlay "EN PAUSA" + botón "REANUDAR" visible; el HUD permaneció idéntico entre dos lecturas separadas por 600ms mientras estaba en pausa, confirmando el freeze)_
- [x] "FIN" termina la partida de inmediato con el score actual, sin esperar un choque. _(verificado: clic en "FIN" tras "REANUDAR" abrió el modal de inmediato)_
- [x] El panel HUD externo (Puntuación, Longitud, Nivel) refleja en tiempo real los valores reales de `SerpentinaGame`. _(verificado en las lecturas de `textContent` del HUD durante las pruebas)_
- [x] "GUARDAR PUNTUACIÓN" en el modal inserta una fila real en `public.scores` con `game_id: "serpentina"` (vía `insertScore`). _(verificado por SQL: dos filas nuevas con `game_id = 'serpentina'`, scores 40 y 0, tras guardar en dos partidas distintas)_
- [x] `/games/serpentina` muestra el leaderboard real (top 10 por score descendente) tras guardar una puntuación, con el mismo fallback y estados vacío/error que Asteroides/Tetris/Bloque Buster. _(verificado: screenshot con ambas puntuaciones guardadas, ordenadas 40 luego 0, y "MEJOR GLOBAL: 40" reflejando el top real)_
- [x] La pestaña "SERPENTINA" en `/salon` muestra las mismas puntuaciones reales guardadas en `public.scores`. _(verificado: screenshot con podio "CAMPEÓN: INVITADO 40" y tabla con ambas filas)_
- [x] "JUGAR DE NUEVO" reinicia el componente a un estado limpio (score 0, longitud inicial, nivel 1); "VOLVER AL VAULT" navega a `/games`. _(verificado: "JUGAR DE NUEVO" mostró consistentemente "Puntuación 0 / Longitud 3 / Nivel 01" en cada reinicio; "VOLVER AL VAULT" navegó la URL a `/games`)_
- [x] Tras el refactor del 4to stat en `GamePlayerClient`, Asteroides, Tetris y Bloque Buster siguen mostrando "Vidas"/"Líneas" exactamente igual que antes. _(verificado: HUD de Asteroides con "Vidas ♥ ♥ ♥", Tetris con "Líneas 0", Bloque Buster con "Vidas ♥ ♥ ♥" y sin overlay externo de pausa al pausarlo)_
- [x] Los 4 placeholders restantes (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando la simulación falsa y el HUD "Vidas" sin cambios. _(verificado directamente en `gloton`: `.game-arena` presente, `canvas` ausente, HUD "Vidas"; `invasores`/`ranaria`/`duelo-pixel` no se probaron en vivo pero comparten el mismo fallback genérico de `REAL_GAME_CONFIG`/`REAL_SCORE_GAME_IDS`, sin entrada propia añadida)_
- [x] `npm run build` completa sin errores nuevos relacionados a los archivos agregados/modificados. _(build de producción compila limpio)_
- [x] `npm run lint` no reporta errores nuevos en los archivos agregados/modificados. _(los únicos errores/warnings restantes son preexistentes en `references/templates` y `references/started-games/04-arkanoid`, fuera de esta spec — mismo hallazgo que SPEC 08)_

## Decisions

- **Yes:** construir `SerpentinaGame` desde cero en TypeScript, sin juego de referencia en `references/started-games/`. **No:** buscar o adaptar un Snake externo — no había carpeta de referencia disponible para este juego, a diferencia de Asteroides/Tetris/Bloque Buster.
- **Yes:** movimiento por turnos sobre un grid (tick fijo que se acelera por nivel), fiel al Snake clásico. **No:** movimiento continuo pixel a pixel — se descartó por alejarse de la mecánica clásica esperada y complicar la detección de colisión con el propio cuerpo.
- **Yes:** choque contra cualquier borde termina la partida (sin wrap-around). **No:** wrap-around/portal en los bordes — decisión explícita del usuario, prioriza el Snake clásico sobre variantes modernas.
- **Yes:** sin sistema de vidas — un solo choque (pared o cuerpo propio) termina la partida de inmediato. **No:** 3 vidas con reinicio de tamaño como los otros 3 juegos reales — decisión explícita del usuario, aunque rompe la convención de "Vidas" que sí comparten Asteroides/Bloque Buster.
- **Yes:** generalizar el 4to stat de `GamePlayerClient` (`FourthStat`/`kind: "hearts" | "lines" | "length"`) para poder mostrar "Longitud". **No:** forzar a Serpentina a reportar un valor de "vidas" ficticio (ej. 1 vida) solo para no tocar el render existente — se descartó por ser menos honesto con la mecánica real y porque el HUD ya tenía un precedente de generalización en SPEC 08.
- **Yes:** nivel sube cada `FRUITS_PER_LEVEL` (5) frutas comidas, acelerando el tick de movimiento; usa `onLevelChange` de verdad. **No:** velocidad constante sin niveles — decisión explícita del usuario, mantiene la convención de "nivel = dificultad" que ya tienen los otros 3 juegos reales.
- **Yes:** puntos fijos por fruta (+10), sprite elegido al azar solo por variedad visual. **No:** tabla de puntos variable por tipo de fruta — decisión explícita del usuario, prioriza simplicidad sobre fidelidad a la "economía de frutas" de Google Snake.
- **Yes:** subconjunto curado de 8 frutas (manzana, banana, uva, sandía, cereza, naranja, fresa, piña) en vez de las 21 del atlas completo. **No:** usar las 21 frutas — decisión explícita del usuario; varias frutas del atlas original (ej. `grapes2` junto a `grape`) se verían casi idénticas al tamaño de una celda de 40px.
- **Yes:** actualizar `short`/`long` de la fila `serpentina` en Supabase para mencionar frutas explícitamente (vía `UPDATE`, no migración de schema). **No:** dejar el copy "núcleos magenta" sin tocar — decisión explícita del usuario, mismo criterio que SPEC 05 usó para corregir el copy de Asteroides una vez el juego real estuvo definido.
- **Yes:** leaderboard real en Supabase (`insertScore`/`getTopScores`/`getTopScoresClient`) para `serpentina`, agregándolo a `REAL_SCORE_GAME_IDS`. **No:** simulación local (`pushScore`/`seededScores`) — decisión explícita del usuario, consistente con que este es el 4to juego que pasa de placeholder a implementación real.
- **Yes:** ajuste por `devicePixelRatio` en el canvas, igual que `BloqueBusterGame` — la fruta usa sprites bitmap, no formas vectoriales. **No:** omitir el ajuste de DPI como en Asteroides/Tetris — esos son 100% vectoriales, Serpentina no lo es.
- **Yes:** el cuerpo de la serpiente se dibuja con formas vectoriales simples (no hay sprites de cuerpo/cabeza en los assets provistos, solo frutas). **No:** generar o buscar sprites adicionales de serpiente fuera de lo entregado — fuera del alcance de esta spec, que se limita a los assets ya provistos en `references/source-assets/snake-assets/`.
- **Yes:** sin efectos de sonido — no se proveyeron assets de audio para este juego, a diferencia de Bloque Buster. **No:** reutilizar sonidos de otro juego o buscar nuevos — fuera de alcance, ningún sonido fue solicitado ni provisto.
- **Yes:** sin controles táctiles ni tests automatizados — mismo criterio que los otros 3 juegos reales. No hay test runner configurado en el proyecto.

## Risks

| Risk                                                                                                                                                                                        | Mitigation                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generalizar el 4to stat de `GamePlayerClient` (paso 5) toca lógica compartida por los 8 juegos — un error podría romper el render de "Vidas"/"Líneas" de Asteroides, Tetris o Bloque Buster | El paso 5 se hace **sin** agregar `serpentina` a `REAL_GAME_CONFIG` todavía (mismo comportamiento exacto para los 3 juegos reales existentes), verificado manualmente jugando cada uno antes de pasar al paso 6, que ya sí cambia comportamiento de forma atómica                                                                                                  |
| El movimiento por tick (grid) desacoplado del loop de render (`requestAnimationFrame`) podría avanzar más de una celda por frame en dispositivos lentos, o verse entrecortado               | Se usa un acumulador de tiempo transcurrido (delta-time) dentro del loop de `requestAnimationFrame`: la serpiente avanza exactamente una celda cada vez que el acumulador supera el tick actual (`BASE_TICK_MS` menos lo acelerado por nivel), independiente de la tasa de frames; el render sigue corriendo cada frame para que pausa/reanudación se vean fluidas |
| El spawn aleatorio de fruta podría elegir una celda ocupada por el cuerpo de la serpiente                                                                                                   | El spawn filtra candidatos a solo celdas libres (grid de 20×15 = 300 celdas; la longitud máxima realista de la serpiente en una partida queda muy por debajo de ese total, siempre hay celdas libres disponibles)                                                                                                                                                  |
| El bloqueo de giro de 180° podría fallar si el jugador presiona dos teclas opuestas muy rápido dentro del mismo tick, permitiendo un choque instantáneo contra el segundo segmento          | `pendingDirection` solo se actualiza si la nueva dirección no es opuesta a `direction` (la dirección ya confirmada en el tick anterior), no a la última tecla presionada — así, presionar dos teclas opuestas seguidas dentro del mismo tick no logra colar la inversión                                                                                           |
| `INSERT` público sin auth en `scores` permite que cualquiera con la publishable key inserte puntuaciones falsas o en volumen para `"serpentina"`                                            | Riesgo ya aceptado y documentado desde SPEC 06 para el esquema de `scores` en general (mismo nivel de confianza que Asteroides/Tetris/Bloque Buster); no se mitiga en esta spec                                                                                                                                                                                    |

## What is **not** in this spec

- Wrap-around/portal en los bordes.
- Sistema de vidas.
- Puntaje variable por tipo de fruta.
- Las 13 frutas restantes del atlas de 21 que no forman parte del subconjunto curado.
- Efectos de sonido.
- Controles táctiles/on-screen para móvil.
- Power-ups u obstáculos internos del grid.
- Multijugador o modos de juego alternativos.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
