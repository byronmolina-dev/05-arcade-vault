# SPEC 08 — Juego Bloque Buster (Arkanoid)

> **Status:** Approved
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides — patrón de componente de juego real), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Juego Tetris — segundo juego real, generalizó `REAL_SCORE_GAME_IDS`)
> **Date:** 2026-07-22
> **Objective:** Portar el Arkanoid de referencia (`references/started-games/04-arkanoid/game.js`) a `components/games/BloqueBusterGame.tsx`, activando el placeholder `bloque-buster` con jugabilidad real (sprites, sonido, control por mouse/teclado, selector de nivel en pausa) y leaderboard real en Supabase, generalizando además `GamePlayerClient` a un registro por `game.id` ahora que serán tres juegos reales en paralelo.

## Scope

**In:**

- Sin migración SQL: la fila `bloque-buster` en `public.games` ya existe con `title`, `short`, `long`, `cat: "ARCADE"`, `cover: "cover-bricks"`, `color: "cyan"`, `best`, `plays` correctos y sin menciones a mecánicas inexistentes — no hace falta tocarla.
- Copiar los assets del juego de referencia a `public/games/bloque-buster/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`) para que el componente los sirva vía Next.js.
- Puerto a TypeScript del juego de referencia como componente cliente `components/games/BloqueBusterGame.tsx`: paleta, pelota, colisiones AABB con bloques, 5 niveles (`LEVELS` con sus patrones y multiplicador de velocidad), 3 vidas, puntuación (+10 por bloque), animación de explosión (4 frames por sprite), y el helper de spritesheet (`loadSpritesheet`/`drawSprite`/`drawFrame`) portado.
- Canvas único de resolución interna 800×600, con **ajuste por `devicePixelRatio`** (backing store escalado + `ctx.scale`) para nitidez de los sprites en pantallas de alta densidad — primer juego portado que lo usa (Asteroides/Tetris, al ser vectoriales, no lo necesitan y no se tocan).
- Controles: paleta controlable con `←`/`→` **y** con el mouse (posición absoluta sobre el canvas, con el mismo cálculo de escala `getBoundingClientRect` que el original), ambos activos en simultáneo igual que en la referencia.
- Efectos de sonido de rebote y rotura de bloque, portados tal cual (clones de `Audio` por reproducción, mismo patrón que el original).
- Overlay interno de pausa **con selector de nivel (botones 1–5)** se conserva, dibujado en el propio canvas. Se activa/desactiva vía el mismo handle imperativo (`pause()`/`resume()`) que ya usan Asteroides/Tetris — no hay un atajo de teclado interno (`P`/`Escape`) nuevo, la pausa solo se dispara desde el botón externo PAUSA.
- `GamePlayerClient.tsx`: cuando `game.id === "bloque-buster"` y `paused === true`, **no** renderiza su overlay genérico "EN PAUSA" (fondo oscuro + texto) — deja que el overlay interno del canvas (con los botones de nivel) sea la única UI de pausa visible. Para los otros 7 juegos, el overlay externo sigue exactamente igual que hoy.
- Overlay interno de "GAME OVER"/victoria del original **desactivado**: al perder (0 vidas), al completar el nivel 5 (todos los bloques rotos), o al presionar "FIN", el loop se congela (último frame visible, sin más actualizaciones) e invoca `onGameOver(finalScore)` — completar el juego termina la partida exactamente igual que perder, mismo modal externo de `GamePlayerClient`.
- `BloqueBusterGame` expone el mismo shape que `AsteroidsGame`: props `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`, y handle `{ pause(); resume(); reset(); }` — no necesita un callback nuevo tipo `onLinesChange` (Arkanoid tiene vidas, no líneas).
- Refactor de `GamePlayerClient.tsx`: reemplaza los flags ad hoc (`isAsteroids`/`isTetris`) y los refs separados por **un registro único indexado por `game.id`** (componente a montar, ref del handle, label del 4º stat del HUD externo — "Vidas" para Asteroides/bloque-buster, "Líneas" para Tetris — y si ese juego suprime el overlay externo de pausa). El guardado de puntuación (`insertScore` vs `pushScore`) sigue decidiéndose con `REAL_SCORE_GAME_IDS` como hoy, sin cambios de comportamiento para Asteroides ni Tetris.
- `lib/types.ts`: agregar `"bloque-buster"` a `REAL_SCORE_GAME_IDS`. Como `app/games/[id]/page.tsx` y `SalonClient.tsx` ya leen de esa constante (generalizados en SPEC 07), no requieren más cambios que este — usan automáticamente `getTopScores("bloque-buster", 10)` / `getTopScoresClient("bloque-buster", 12)`.
- "GUARDAR PUNTUACIÓN" para `bloque-buster` llama a `insertScore({ gameId: "bloque-buster", name, score })` (Supabase), igual que Asteroides y Tetris.

**Out of scope (para futuras specs):**

- Controles táctiles/on-screen para móvil.
- Cambiar el `aspect-ratio` de `.crt-screen` (clase compartida por todos los juegos).
- Agregar `devicePixelRatio` scaling retroactivamente a `AsteroidsGame`/`TetrisGame` (siguen vectoriales, sin necesidad).
- Implementar los 5 placeholders restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Auth real o `scores.user_id` — el guardado sigue siendo anónimo (campo `name` libre), igual que Asteroides/Tetris.
- Tests automatizados (no hay test runner configurado).

## Data model

**`lib/types.ts`** — extiende la constante ya existente:

```ts
export const REAL_SCORE_GAME_IDS = [
  "asteroides",
  "tetris",
  "bloque-buster",
] as const;
```

**Assets** (nuevos, copiados desde `references/started-games/04-arkanoid/assets/`):

```
public/games/bloque-buster/spritesheet-breakout.png
public/games/bloque-buster/sounds/ball-bounce.mp3
public/games/bloque-buster/sounds/break-sound.mp3
```

**`components/games/BloqueBusterGame.tsx`** (nuevo, mismo patrón que `AsteroidsGame.tsx`):

```ts
export type BloqueBusterGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type BloqueBusterGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export default function BloqueBusterGame(
  props: BloqueBusterGameProps,
  ref: Ref<BloqueBusterGameHandle>,
): JSX.Element;
```

El estado (`paddle`, `ball`, `blocks[]`, `explosions[]`, `lives`, `score`, `currentLevel`, `gameState: "playing" | "paused" | "gameover" | "win"`, teclas presionadas) vive local al componente, igual que en `TetrisGame`. `LEVELS` (los 5 patrones de `levels.js`) y las constantes de sprites/explosiones (`SPRITES`, `EXPLOSION_FRAMES`) se portan como constantes internas del mismo archivo — no se crea un módulo aparte, mismo criterio que los otros dos juegos (todo autocontenido en el componente).

**`components/GamePlayerClient.tsx`** — refactor del mount/HUD ad hoc a un registro:

```ts
type GameHandle = { pause(): void; resume(): void; reset(): void };
// Los tres handles (AsteroidsGameHandle, TetrisGameHandle, BloqueBusterGameHandle)
// ya comparten esta forma exacta, así que un solo ref genérico reemplaza a
// asteroidsRef/tetrisRef sueltos:
const gameRef = useRef<GameHandle>(null);

type RealGameConfig = {
  fourthStatLabel: string; // "Vidas" | "Líneas"
  suppressExternalPauseOverlay: boolean;
};

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  asteroides: { fourthStatLabel: "Vidas", suppressExternalPauseOverlay: false },
  tetris: { fourthStatLabel: "Líneas", suppressExternalPauseOverlay: false },
  "bloque-buster": {
    fourthStatLabel: "Vidas",
    suppressExternalPauseOverlay: true,
  },
};
```

El HUD (label del 4º stat) y la decisión de mostrar/ocultar el overlay externo "EN PAUSA" salen de `REAL_GAME_CONFIG[game.id]` (con fallback a `"Vidas"` + overlay visible para los placeholders, que no están en el registro). El JSX que decide **qué componente montar** (`AsteroidsGame` / `TetrisGame` / `BloqueBusterGame` / `.game-arena` placeholder) sigue siendo un `switch`/`if` explícito por `game.id` — no se fuerza una abstracción que borre las props distintas de cada juego (`onLinesChange` vs `onLivesChange`), pero todos comparten `ref={gameRef}` en vez de un ref por juego.

## Implementation plan

1. Copiar los assets del juego de referencia a `public/games/bloque-buster/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`). Sin cambios de comportamiento — nada los importa todavía.
2. Portar a `components/games/BloqueBusterGame.tsx` el **estado y la física** del juego: `paddle`, `ball`, `blocks[]` (con `LEVELS` portado de `levels.js`), colisiones AABB, 3 vidas, puntuación (+10/bloque), y el avance de nivel (incluida la condición de completar el nivel 5). Compila de forma aislada; todavía no se importa desde ninguna página.
3. Agregar a `BloqueBusterGame` la **carga de assets y el render en canvas**: `loadSpritesheet`/`drawSprite`/`drawFrame` portados, apuntando a `/games/bloque-buster/spritesheet-breakout.png`; ajuste por `devicePixelRatio` (backing store escalado + `ctx.scale`); dibujo de bloques, paleta, pelota, explosiones (4 frames) y HUD interno (score/nivel/vidas) tal como el original. Sigue sin montarse en ninguna página.
4. Agregar **controles y ciclo de pausa/fin**: mouse (`getBoundingClientRect` + escala) y `←`/`→` para la paleta; sonidos de rebote/rotura; overlay interno de pausa con selector de nivel (botones 1–5, clic solo activo mientras `paused`); props (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) y handle imperativo (`pause`/`resume`/`reset`) vía `forwardRef`/`useImperativeHandle`. Al perder (0 vidas), completar el nivel 5, o pausar/reanudar/resetear desde el handle externo, el loop reacciona en consecuencia; se desactiva el overlay interno "GAME OVER"/"¡Completaste el juego!" del original — al perder o ganar, el loop se congela e invoca `onGameOver(finalScore)`. Sigue sin montarse en ninguna página.
5. Refactor de `components/GamePlayerClient.tsx`: introducir el tipo `GameHandle` genérico (reemplaza `asteroidsRef`/`tetrisRef` sueltos por un único `gameRef`) y el registro `REAL_GAME_CONFIG` (por ahora solo con `asteroides`/`tetris`, mismos valores que el comportamiento actual). Sin cambio de comportamiento visible — es una reestructuración interna verificable comparando el render antes/después para Asteroides y Tetris.
6. En un solo paso atómico: agregar `"bloque-buster"` a `REAL_SCORE_GAME_IDS` (`lib/types.ts`) y su entrada a `REAL_GAME_CONFIG` (`fourthStatLabel: "Vidas"`, `suppressExternalPauseOverlay: true`); montar `BloqueBusterGame` en el switch de `GamePlayerClient` cuando `game.id === "bloque-buster"`, cableando PAUSA/REANUDAR/FIN al `gameRef` y "GUARDAR PUNTUACIÓN" a `insertScore({ gameId: "bloque-buster", name, score })`. `/games/bloque-buster/jugar` queda jugable de verdad con guardado real en Supabase; `/games/bloque-buster` y la pestaña "BLOQUE BUSTER" de `/salon` pasan a usar `getTopScores`/`getTopScoresClient` reales (generalizados desde SPEC 07).
7. Pasada final: verificación manual en navegador (mover con mouse y teclado, romper bloques con sonido y explosión, perder vidas, pausar/reanudar mostrando el overlay interno con selector de nivel y sin el overlay externo genérico, saltar de nivel desde la pausa, completar el nivel 5 y terminar la partida, "FIN", guardar puntuación y verla en `/games/bloque-buster` y en `/salon`, y confirmar que Asteroides/Tetris/los 5 placeholders restantes siguen intactos tras el refactor del paso 5), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] `/games/bloque-buster/jugar` renderiza el canvas real del juego (paleta, pelota, bloques con sprites) dentro de `.crt-screen`, en vez del placeholder `.game-arena` anterior.
- [ ] `←`/`→` mueven la paleta; mover el mouse sobre el canvas también mueve la paleta a la posición del cursor (escalada correctamente aunque el canvas esté estirado por CSS) — ambos métodos funcionan en la misma partida.
- [ ] Rebotar la pelota contra pared/paleta reproduce el sonido de rebote; romper un bloque reproduce el sonido de rotura y su animación de explosión (4 frames), y suma 10 puntos.
- [ ] Los sprites (paleta, pelota, bloques) se ven nítidos en una pantalla de alta densidad (DPI > 1), sin verse borrosos.
- [ ] Perder la pelota (cae fuera del área) resta una vida y reposiciona la pelota; al llegar a 0 vidas, el canvas se congela (deja de actualizar) y se dispara el modal externo de fin de partida.
- [ ] Romper todos los bloques de un nivel avanza al siguiente (con su patrón y velocidad de pelota correspondiente); completar el nivel 5 congela el canvas y dispara el mismo modal externo de fin de partida que al perder (no un overlay de "victoria" aparte).
- [ ] "PAUSA" (botón externo) congela el juego y muestra el overlay interno del canvas (con los botones de salto de nivel 1–5) — **sin** que aparezca el overlay genérico "EN PAUSA" que sí se sigue mostrando para Asteroides, Tetris y los 5 placeholders.
- [ ] Con el juego en pausa, hacer clic en un botón de nivel (1–5) salta a ese nivel y reanuda la partida.
- [ ] "REANUDAR" (botón externo) continúa la partida desde el mismo estado exacto en el que se pausó.
- [ ] "FIN" termina la partida de inmediato con el score actual, sin esperar a perder todas las vidas ni completar el nivel 5.
- [ ] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real los valores reales de `BloqueBusterGame` — no la simulación aleatoria anterior.
- [ ] "GUARDAR PUNTUACIÓN" en el modal inserta una fila real en `public.scores` con `game_id: "bloque-buster"` (vía `insertScore`).
- [ ] `/games/bloque-buster` muestra el leaderboard real (top 10 por score descendente) tras guardar una puntuación, con el mismo fallback de "Mejor global" y los mismos estados vacío/error que Asteroides/Tetris.
- [ ] La pestaña "BLOQUE BUSTER" en `/salon` muestra las mismas puntuaciones reales guardadas en `public.scores` (podio + tabla).
- [ ] "JUGAR DE NUEVO" reinicia el componente a un estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [ ] Tras el refactor de `GamePlayerClient`, Asteroides y Tetris siguen funcionando exactamente igual que antes (HUD, overlay externo "EN PAUSA", pausa/reanudar, guardado de puntuación) — verificado jugando una partida corta de cada uno.
- [ ] Los 5 placeholders restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando la simulación falsa y el HUD "Vidas" sin cambios.
- [ ] `npm run build` completa sin errores nuevos relacionados a los archivos agregados/modificados.
- [ ] `npm run lint` no reporta errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** activar el placeholder existente `bloque-buster` (mismo registro, mismo `cover`/`color`/`cat`/copy) sin migración SQL — el copy actual ya describe el juego real. **No:** crear un slot nuevo dejando `bloque-buster` sin usar; se descartó por duplicar la entrada del mismo juego.
- **Yes:** nombrar el componente `BloqueBusterGame.tsx`, coincidiendo con `id`/`title`, sin la disonancia que tiene Asteroides con `cover-rocas`.
- **Yes:** mantener control simultáneo por mouse y teclado (`←`/`→`), fiel al original. **No:** limitarlo a teclado por consistencia con Asteroides/Tetris — decisión explícita del usuario de priorizar fidelidad al original sobre uniformidad entre juegos.
- **Yes:** portar los efectos de sonido (rebote/rotura) — primer juego portado con audio. **No:** omitirlos para mantener "silencio" consistente con Asteroides/Tetris — se descartó, decisión explícita del usuario.
- **Yes:** conservar el selector de nivel en pausa (botones 1–5) dibujado en el canvas interno, resolviendo el conflicto visual en vez de eliminar la mecánica. **No:** descartar la mecánica para evitar el conflicto — se descartó por decisión explícita del usuario.
- **Yes:** suprimir el overlay externo genérico "EN PAUSA" de `GamePlayerClient` solo para `bloque-buster` (vía `REAL_GAME_CONFIG.suppressExternalPauseOverlay`), dejando el overlay interno como única UI de pausa para este juego. **No:** mantener ambos overlays superpuestos — taparía los botones de nivel, mala UX.
- **Yes:** agregar ajuste por `devicePixelRatio` solo en `BloqueBusterGame` — primer juego portado con sprites bitmap, donde el blur es perceptible. **No:** aplicarlo retroactivamente a `AsteroidsGame`/`TetrisGame` — son vectoriales, no lo necesitan, y está fuera del alcance de esta spec.
- **Yes:** completar el nivel 5 termina la partida (dispara `onGameOver`, mismo modal que perder). **No:** loop infinito volviendo a nivel 1, ni un overlay de "victoria" separado sin `onGameOver` — ambos se descartaron por decisión explícita del usuario, priorizando que todo fin de partida pase por el mismo flujo.
- **Yes:** leaderboard real en Supabase para `bloque-buster` (`insertScore`/`getTopScores`/`getTopScoresClient`), igual que Asteroides y Tetris. **No:** simulación local (`pushScore`/`seededScores`) — se descartó, decisión explícita del usuario.
- **Yes:** generalizar `GamePlayerClient` a un registro (`GameHandle` genérico + `REAL_GAME_CONFIG`) ahora que hay 3 juegos reales en paralelo — decisión explícita del usuario, resuelve el punto que SPEC 07 había dejado pendiente ("se revisará si un tercer juego real lo justifica"). **No:** agregar un tercer flag/ref ad hoc (`isBloqueBuster` + `bloqueBusterRef`) — se descartó por perpetuar un patrón ya señalado como revisable.
- **Yes:** el `switch`/`if` que decide **qué componente montar** sigue siendo explícito por `game.id` (no una tabla que instancie componentes dinámicamente), porque cada juego real tiene props distintas (`onLinesChange` solo en Tetris, `onLivesChange` en Asteroides/bloque-buster). **No:** forzar un shape de props unificado entre los tres juegos (ej. que todos acepten ambos callbacks aunque no apliquen) — se descartó por introducir props falsas, mismo criterio que ya usa la skill `add-game`.
- **Yes:** assets binarios en `public/games/bloque-buster/` (primera carpeta por-juego en `public/`, ya que Asteroides/Tetris no traen assets binarios). **No:** un directorio plano en `public/` (ej. `public/spritesheet-breakout.png`) — se descartó para evitar colisiones de nombres si un futuro juego trae otro spritesheet.
- **Yes:** sin controles táctiles ni tests automatizados — mismo criterio que Asteroides/Tetris. No hay test runner configurado en el proyecto.

## Risks

| Risk                                                                                                                                                                                            | Mitigation                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El refactor de `GamePlayerClient` (paso 5) toca la lógica compartida por los 8 juegos — un error ahí podría romper el HUD, pausa o guardado de Asteroides/Tetris o de los placeholders          | El paso 5 se hace **sin** agregar `bloque-buster` al registro todavía (mismo comportamiento exacto que hoy para los 7 juegos existentes), verificado manualmente jugando Asteroides y Tetris antes de pasar al paso 6, que ya sí cambia comportamiento de forma atómica                                                                      |
| Los sonidos (`Audio.cloneNode().play()`) pueden bloquearse por las políticas de autoplay del navegador si se disparan sin interacción previa del usuario                                        | El primer sonido solo ocurre tras que el jugador ya interactuó con la página (mover la paleta), lo que normalmente satisface el requisito de gesto del navegador; se verifica manualmente en el paso 7. Riesgo residual aceptado: si algún navegador igual lo bloquea, el juego sigue siendo jugable sin sonido, sin excepción no controlada |
| Un `devicePixelRatio` scaling mal implementado podría desalinear las coordenadas del mouse (calculadas sobre el tamaño CSS del canvas) con el tamaño físico del backing store escalado          | La conversión de coordenadas de mouse sigue basándose en `getBoundingClientRect()` (tamaño CSS) contra la resolución lógica interna (800×600), no contra el tamaño físico del backing store — se verifica manualmente moviendo el mouse hasta los bordes del canvas en el paso 7                                                             |
| Suprimir el overlay externo "EN PAUSA" solo para `bloque-buster` agrega una rama condicional más al render de `GamePlayerClient` — riesgo de que la supresión se aplique por error a otro juego | La condición se resuelve vía `REAL_GAME_CONFIG[game.id]?.suppressExternalPauseOverlay`, con `false` como fallback para cualquier id no listado (Asteroides, Tetris, los 5 placeholders) — verificado manualmente para los 8 juegos en el paso 7                                                                                              |
| `INSERT` público sin auth en `scores` permite que cualquiera con la publishable key inserte puntuaciones falsas o en volumen para `"bloque-buster"`                                             | Riesgo ya aceptado y documentado en SPEC 06 para el esquema de `scores` en general (mismo nivel de confianza que Asteroides/Tetris); no se mitiga en esta spec                                                                                                                                                                               |

## What is **not** in this spec

- Controles táctiles/on-screen para móvil.
- Cambiar el `aspect-ratio` de `.crt-screen`.
- `devicePixelRatio` scaling retroactivo en `AsteroidsGame`/`TetrisGame`.
- Implementar los 5 placeholders restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Auth real o `scores.user_id`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
