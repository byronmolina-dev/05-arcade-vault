# SPEC 23 — Controles táctiles móviles

> **Status:** Approved
> **Depends on:** SPEC 05 (Asteroides — patrón `keys[code]` continuo), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — patrón `keydown` discreto), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización del HUD en `GamePlayerClient`)
> **Date:** 2026-07-24
> **Objective:** Agregar un overlay de controles táctiles (D-pad + botones de acción, configurado por juego) en la pantalla `/games/[id]/jugar`, para que los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) sean jugables por completo en un teléfono táctil sin teclado.
>
> **Actualización 2026-07-24 (pruebas en dispositivo real):** la implementación original forzaba horizontal con un aviso "GIRÁ TU DISPOSITIVO" + pausa automática en portrait (ver Decisions). Al probar en un teléfono real, el layout de horizontal resultó impráctico (nav/HUD ocupan casi toda la altura disponible) y se comprobó que el `.crt-screen` (aspect-ratio 4/3 fijo, sin cambios) entra con tamaño cómodamente jugable en portrait. Se pivotó a un mecanismo por juego (`blockPortrait` en `REAL_GAME_CONFIG`, `components/GamePlayerClient.tsx`) que permite exigir horizontal o no; los 4 juegos reales terminaron con `blockPortrait: false` (jugables directo en vertical, sin aviso de rotación). El mecanismo de aviso/pausa por orientación se deja implementado y disponible para un juego futuro que sí lo necesite, pero no lo ejercita ninguno de los 4 juegos actuales.

## Scope

**In:**

- Nuevo registro compartido `lib/games/touchControls.ts` (mismo patrón que `lib/games/skins.ts`): define, por `game.id`, qué botones de D-pad y qué botones de acción se muestran y a qué `KeyboardEvent.code` equivale cada uno.
- Nuevo componente `components/games/TouchControls.tsx`: renderiza un D-pad (abajo-izquierda) y, si el juego lo requiere, botones de acción (abajo-derecha) sobre el `.crt-screen`, según la config de `touchControls.ts`. En `pointerdown` dispara `window.dispatchEvent(new KeyboardEvent("keydown", { code }))`; en `pointerup`/`pointercancel`/`pointerleave` dispara el `keyup` correspondiente. No modifica la lógica interna de ningún componente de juego — reutiliza el mismo listener `keydown`/`keyup` en `window` que ya usan los 4 juegos reales.
- Auto-repeat genérico dentro de `TouchControls`: cualquier botón marcado como `discrete` en la config dispara un primer `keydown` al presionar y repite cada ~120ms mientras se mantiene, hasta soltar (usado por los botones de movimiento/soft-drop/rotar/hard-drop de Tetris y por los 4 botones de Serpentina; los demás juegos leen `keys[code]` continuamente y no necesitan repetición).
- Detección de dispositivo táctil: `TouchControls` (y el aviso de orientación) solo se montan si `window.matchMedia("(pointer: coarse)").matches` o `"ontouchstart" in window`, evaluado en un `useEffect` tras montar (mismo patrón que la carga de skin persistida, evita mismatch de hidratación). En mouse/desktop no se renderiza nada nuevo.
- Mapeo de botones por juego (config concreta en `touchControls.ts`):
  - `asteroides`: D-pad con 2 botones (ROTAR IZQ `ArrowLeft`, ROTAR DER `ArrowRight`) + 2 acciones (PROPULSAR `ArrowUp`, DISPARAR `Space`).
  - `tetris`: D-pad con 3 botones (`ArrowLeft`, `ArrowRight`, `ArrowDown` soft-drop, los 3 `discrete`) + 2 acciones (ROTAR `ArrowUp`, HARD DROP `Space`, ambas `discrete`).
  - `bloque-buster`: D-pad con 2 botones (`ArrowLeft`, `ArrowRight`) únicamente, sin cluster de acciones.
  - `serpentina`: D-pad de 4 direcciones (`ArrowUp/Down/Left/Right`, todas `discrete`), sin cluster de acciones.
- Aviso de orientación (mecanismo disponible, no activo hoy): en `GamePlayerClient.tsx`, `RealGameConfig.blockPortrait: boolean` decide por juego si se exige horizontal. Cuando `blockPortrait: true` y se detecta dispositivo táctil en `window.matchMedia("(orientation: portrait)").matches`, se muestra un overlay "GIRÁ TU DISPOSITIVO" (mismo estilo visual que el overlay existente de "EN PAUSA", reutilizando la clase `.crt-content`) y se pausa el juego real automáticamente (`gameRef.current?.pause()`) sin togglear el botón visible PAUSA/REANUDAR; al volver a horizontal, se reanuda automáticamente solo si el jugador no había pausado manualmente antes de rotar. **Tras pruebas en dispositivo real, los 4 juegos reales quedaron con `blockPortrait: false`** (jugables directo en vertical, sin aviso ni pausa por orientación) — ver Decisions.
- Integración en `components/GamePlayerClient.tsx`: montar `<TouchControls gameId={game.id} />` únicamente cuando `game.id` sea uno de los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`); el aviso de orientación se monta para el mismo conjunto de juegos pero solo se activa si `blockPortrait: true` en su config.
- CSS nuevo en `app/globals.css`: clases para el D-pad y los botones de acción (posición absoluta sobre `.crt-screen`, `touch-action: none` para evitar scroll/zoom accidental al tocar), y el overlay de rotación reutilizando la estética del overlay de pausa existente. Ambos clusters (`.touch-dpad`/`.touch-actions`) usan `max-width` (46% cada uno cuando ambos existen, o `.touch-dpad--wide` al 92% cuando el juego no tiene cluster de acciones) + `flex-wrap` para que nunca se superpongan entre sí en una pantalla angosta, comprobado en dispositivo real en Asteroides (D-pad + 2 acciones) y Serpentina (D-pad de 4 sin acciones, las 4 flechas en una sola línea).
- Fix de responsividad general de la pantalla `/jugar` en portrait angosto (necesario para que los controles táctiles sean usables, no solo cosméticos): `.hud-actions` (botones SKIN/PAUSA/FIN/SALIR) y `.crt-bottom` ahora tienen `flex-wrap: wrap` — sin esto, en un teléfono real esa fila se salía del ancho de la pantalla y forzaba scroll horizontal en toda la página.
- Ajuste de velocidad en `components/games/SerpentinaGame.tsx` (`BASE_TICK_MS` 160→190, `MIN_TICK_MS` 60→80), para todos los jugadores (teclado y táctil): en dispositivo real, la velocidad original hacía que la serpiente chocara consigo misma muy rápido al jugar con los botones táctiles (más lentos/imprecisos que el teclado). Es la única excepción a "no tocar la lógica interna de los juegos" en esta spec — decisión explícita del usuario tras probar en dispositivo real (ver Decisions).
- Documentar en `touchControls.ts` (comentario breve) el patrón para que specs futuras (10-22, aún no implementadas) agreguen su propia entrada de config cuando el juego correspondiente se active.

**Out of scope (para futuras specs):**

- Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) — no tienen jugabilidad real, no se les agrega config de `touchControls.ts` en esta spec.
- Los juegos de las specs 10-22 (`duelo-pixel`, `estelas`, `prisma`, `tanques`, `circuito`, etc.) — no están implementados todavía; solo se deja documentado el patrón a seguir cuando se activen.
- Manejo táctil nativo dentro del canvas de cada juego (arrastrar la paleta, swipe para dirección, gestos) — se descarta a favor del enfoque de `KeyboardEvent` sintético, que no toca la lógica interna de los juegos.
- Mejoras de responsividad general del sitio (nav, catálogo, landing, `/salon`) fuera de la pantalla `/games/[id]/jugar` — ya cubiertas por los `@media` existentes en `globals.css`.
- Cambiar el `aspect-ratio` de `.crt-screen` o la resolución interna de canvas de cualquier juego.
- Feedback háptico (vibración) al tocar los botones.
- Personalización del layout de botones (reposicionar, cambiar opacidad, remapear) por parte del usuario.
- Persistir una preferencia de "mostrar/ocultar controles táctiles" — la detección es automática en cada carga, sin guardarse en `localStorage` ni Supabase.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**`lib/games/touchControls.ts`** (nuevo, mismo patrón de registro que `lib/games/skins.ts`):

```ts
export type TouchButtonCode =
  "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space";

export type TouchButtonConfig = {
  code: TouchButtonCode;
  label: string; // texto corto en el botón, p.ej. "◄", "PROPULSAR", "DISPARAR"
  discrete: boolean; // true = auto-repeat cada TOUCH_REPEAT_MS mientras se mantiene (Tetris/Serpentina); false = mantiene keys[code]=true mientras se sostiene (Asteroides/Bloque Buster)
};

export type TouchControlsConfig = {
  dpad: TouchButtonConfig[]; // 2 a 4 botones, cluster abajo-izquierda
  actions: TouchButtonConfig[]; // 0 a 2 botones, cluster abajo-derecha
};

export const TOUCH_REPEAT_MS = 120;

export const TOUCH_CONTROLS_CONFIG: Partial<
  Record<string, TouchControlsConfig>
> = {
  asteroides: {
    dpad: [
      { code: "ArrowLeft", label: "◄", discrete: false },
      { code: "ArrowRight", label: "►", discrete: false },
    ],
    actions: [
      { code: "ArrowUp", label: "PROPULSAR", discrete: false },
      { code: "Space", label: "DISPARAR", discrete: false },
    ],
  },
  tetris: {
    dpad: [
      { code: "ArrowLeft", label: "◄", discrete: true },
      { code: "ArrowRight", label: "►", discrete: true },
      { code: "ArrowDown", label: "▼", discrete: true },
    ],
    actions: [
      { code: "ArrowUp", label: "ROTAR", discrete: true },
      { code: "Space", label: "CAER", discrete: true },
    ],
  },
  "bloque-buster": {
    dpad: [
      { code: "ArrowLeft", label: "◄", discrete: false },
      { code: "ArrowRight", label: "►", discrete: false },
    ],
    actions: [],
  },
  serpentina: {
    dpad: [
      { code: "ArrowUp", label: "▲", discrete: true },
      { code: "ArrowDown", label: "▼", discrete: true },
      { code: "ArrowLeft", label: "◄", discrete: true },
      { code: "ArrowRight", label: "►", discrete: true },
    ],
    actions: [],
  },
};
```

**`components/games/TouchControls.tsx`** (nuevo):

```ts
export type TouchControlsProps = {
  gameId: string;
};
```

Sin estado externo: internamente resuelve `TOUCH_CONTROLS_CONFIG[gameId]`, y si no hay entrada o no es dispositivo táctil, retorna `null`.

**`components/GamePlayerClient.tsx`** — nuevo estado local (no persistido):

```ts
const [isTouchDevice, setIsTouchDevice] = useState(false); // detectado en useEffect tras montar
const [orientationBlocked, setOrientationBlocked] = useState(false); // true = touch + portrait + blockPortrait
```

Y un campo nuevo en `RealGameConfig` (junto a `fourthStat`/`suppressExternalPauseOverlay` ya existentes):

```ts
type RealGameConfig = {
  fourthStat: FourthStat;
  suppressExternalPauseOverlay: boolean;
  blockPortrait: boolean; // true = exige horizontal (aviso + pausa); false = jugable en vertical
};
```

Valor real tras las pruebas en dispositivo: `blockPortrait: false` para los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) — ninguno exige horizontal hoy, pero el campo queda disponible por juego para cuando alguno futuro sí lo necesite.

Convenciones:

- `code` usa los mismos valores de `KeyboardEvent.code` que ya leen los 4 juegos reales (`ArrowUp/Down/Left/Right`, `Space`) — no se introducen códigos nuevos.
- `discrete: false` → el botón mantiene `keys[code] = true` desde `pointerdown` hasta `pointerup`/`pointercancel`/`pointerleave` (mismo efecto que sostener la tecla física).
- `discrete: true` → el botón dispara un primer `keydown` inmediato y repite cada `TOUCH_REPEAT_MS` mientras se sostiene, con un solo `keyup` final al soltar.
- `TOUCH_CONTROLS_CONFIG` sin entrada para un `game.id` (placeholders, juegos futuros no implementados) ⇒ `TouchControls` no renderiza nada para ese juego.
- El efecto de orientación solo corre si `config?.blockPortrait` es `true` (ninguno de los 4 juegos reales hoy). Cuando corre, `orientationBlocked` es independiente del `paused` manual (botón PAUSA/REANUDAR existente): al activarse llama a `gameRef.current?.pause()` sin togglear el estado visible de pausa; al desactivarse, llama a `gameRef.current?.resume()` solo si `paused` (manual) es `false`.
- `.touch-dpad`/`.touch-actions` usan `max-width: 46%` cada uno (o `.touch-dpad--wide` al `92%` cuando `config.actions.length === 0`, aplicada en `TouchControls.tsx`) para que nunca se superpongan entre sí, sin importar el ancho real del dispositivo.

## Implementation plan

1. Crear `lib/games/touchControls.ts`: tipos (`TouchButtonCode`, `TouchButtonConfig`, `TouchControlsConfig`), la constante `TOUCH_REPEAT_MS` y `TOUCH_CONTROLS_CONFIG` con las 4 entradas reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`). Módulo puro sin JSX; compila y puede importarse sin efecto visible en ninguna pantalla.

2. Crear `components/games/TouchControls.tsx` con la detección de dispositivo táctil (`useEffect` + `matchMedia("(pointer: coarse)")` / `"ontouchstart" in window`) y el guard por ausencia de config en `TOUCH_CONTROLS_CONFIG[gameId]`; en ambos casos retorna `null`. Sin render de botones todavía. Compila aislado, no se importa desde ninguna página.

3. Implementar el render de los clusters D-pad (abajo-izquierda) y acciones (abajo-derecha) a partir de `TOUCH_CONTROLS_CONFIG[gameId]`, más las clases CSS nuevas en `app/globals.css` (`.touch-controls`, `.touch-dpad`, `.touch-actions`, `.touch-btn`, con `touch-action: none`). Los botones aún no disparan ningún evento al tocarlos. Sigue sin montarse en ninguna página.

4. Implementar el disparo de `KeyboardEvent` sintéticos en `TouchControls`: `pointerdown` dispara `keydown` inmediato; para `discrete: false` el `keyup` llega en `pointerup`/`pointercancel`/`pointerleave`; para `discrete: true` se repite `keydown` cada `TOUCH_REPEAT_MS` mientras el puntero siga presionado, con un único `keyup` final al soltar. Limpieza de temporizadores en `pointerup`/`pointercancel`/desmontaje. Lógica verificable por revisión de código; la prueba en navegador se hace en el paso 6. Sigue sin montarse.

5. En `components/GamePlayerClient.tsx`: agregar el estado `isTouchDevice` (mismo detector que `TouchControls`) y el overlay "GIRÁ TU DISPOSITIVO" condicionado a `isTouchDevice && matchMedia("(orientation: portrait)").matches`, con el `useEffect` que llama `gameRef.current?.pause()`/`resume()` y el estado `orientationBlocked` (sin togglear el `paused` manual). Aún sin montar `TouchControls`. Verificable rotando el emulador móvil del navegador en cualquiera de los 4 juegos reales: aparece el aviso y el juego se pausa; al volver a horizontal, se reanuda solo si no había pausa manual.

6. En un solo paso atómico: montar `<TouchControls gameId={game.id} />` dentro de `.crt-screen` en `GamePlayerClient` para los 4 juegos reales. `/games/asteroides/jugar`, `/games/tetris/jugar`, `/games/bloque-buster/jugar` y `/games/serpentina/jugar` quedan jugables por completo con botones táctiles en un dispositivo/emulador táctil, sin alterar el comportamiento de teclado existente.

7. Pasada final: verificación manual en el emulador móvil de devtools (y en un teléfono real si es posible) de los 4 juegos reales — el D-pad y las acciones responden, el auto-repeat de Tetris se siente natural, el aviso de rotación aparece/desaparece pausando y reanudando correctamente, el teclado físico sigue funcionando igual que antes, y los 4 placeholders no muestran ningún botón táctil — más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [x] En un dispositivo/emulador táctil, `/games/asteroides/jugar` muestra un D-pad (ROTAR IZQ/DER) y botones de acción (PROPULSAR, DISPARAR) sobre el `.crt-screen`. Verificado en teléfono real.
- [x] En un dispositivo/emulador táctil, `/games/tetris/jugar` muestra un D-pad (◄ ► ▼) y botones de acción (ROTAR, CAER). Verificado en teléfono real.
- [x] En un dispositivo/emulador táctil, `/games/bloque-buster/jugar` muestra un D-pad (◄ ►) sin cluster de acciones. Verificado en teléfono real.
- [x] En un dispositivo/emulador táctil, `/games/serpentina/jugar` muestra un D-pad de 4 direcciones sin cluster de acciones. Verificado en teléfono real.
- [ ] En desktop con mouse (sin touch), ninguno de los 4 juegos reales muestra botones táctiles. _(Pendiente de verificación manual en desktop; el resto de la spec se verificó en teléfono real.)_
- [x] Sostener un botón `discrete: false` (p. ej. PROPULSAR en Asteroides) mantiene la acción activa mientras se sostiene, igual que sostener la tecla física. Verificado en teléfono real.
- [x] Sostener un botón `discrete: true` (p. ej. ◄ en Tetris/Serpentina) repite el movimiento cada `TOUCH_REPEAT_MS` mientras se sostiene, sin necesidad de tocar repetidamente. Verificado en teléfono real.
- [x] Soltar cualquier botón táctil (`pointerup`, `pointercancel` o `pointerleave`) detiene la acción correspondiente sin dejarla "trabada". Verificado en teléfono real.
- [x] El teclado físico sigue controlando los 4 juegos reales exactamente igual que antes de esta spec.
- [x] Con `blockPortrait: false` (los 4 juegos reales hoy), **no** aparece ningún aviso de rotación en portrait — el juego se juega directo en vertical, sin pausa automática. Verificado en dispositivo real para los 4 juegos.
- [ ] _(Mecanismo disponible, sin caso de uso real hoy)_ Si un juego futuro tuviera `blockPortrait: true`, en portrait aparecería el aviso "GIRÁ TU DISPOSITIVO" y se pausaría el juego (sin togglear visualmente PAUSA/REANUDAR); al rotar a horizontal se reanudaría solo si no había pausa manual previa.
- [x] En una pantalla de teléfono angosta, el D-pad y el cluster de acciones nunca se superponen entre sí (verificado en Asteroides: ◄►+PROPULSAR/DISPARAR sin solaparse; y en Serpentina: las 4 flechas en una sola línea con `.touch-dpad--wide`).
- [x] En portrait angosto, `.hud-actions` y `.crt-bottom` no generan overflow/scroll horizontal de la página.
- [x] Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) no muestran botones táctiles ni el aviso de rotación.
- [x] `npm run build` completa sin errores nuevos en los archivos agregados/modificados (`npm run lint` standalone reporta 1 error preexistente más del mismo tipo que ya existía en el código de skins — `react-hooks/set-state-in-effect` —, decisión explícita de no refactorizar para mantener el mismo patrón; no afecta `npm run build`).

## Decisions

- **Yes:** limitar el alcance a los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`). **No:** tocar los 4 placeholders ni los juegos de las specs 10-22 — no tienen jugabilidad real todavía, no hay nada que adaptar; el patrón queda documentado en `touchControls.ts` para cuando se activen.
- **Yes:** botones táctiles que disparan `KeyboardEvent` sintéticos sobre `window` (mismo `code` que ya leen los 4 juegos). **No:** agregar manejo táctil nativo (drag, swipe) dentro de cada componente de juego — la opción elegida no toca la lógica interna de ningún juego, mientras que la nativa hubiera requerido modificar los 4 archivos de juego individualmente.
- **Yes:** mostrar los controles táctiles solo si se detecta `pointer: coarse`/`ontouchstart`. **No:** mostrarlos siempre (incluso en desktop) — evita ruido visual en mouse/teclado y mantiene el `.crt-screen` limpio para la mayoría de los jugadores actuales.
- **Yes:** auto-repeat configurable por botón (`discrete: true/false`) en vez de un único comportamiento global. **No:** forzar auto-repeat en todos los botones — Asteroides/Bloque Buster ya leen `keys[code]` de forma continua (sostener alcanza) y agregarles repetición sería redundante; Tetris/Serpentina reaccionan a `keydown` puntual y sí lo necesitan.
- **Yes:** D-pad abajo-izquierda + acciones abajo-derecha, superpuestos al `.crt-screen`. **No:** una barra de botones debajo del canvas — ocuparía espacio vertical que ya es escaso en móvil junto al aviso de rotación, y el overlay reproduce el esquema estándar de control de juego móvil.
- **Decisión original:** pedir girar a horizontal con aviso + pausa automática cuando el dispositivo táctil está en vertical, sin adaptar el layout para vertical (se asumía que el `.crt-screen`, `aspect-ratio: 4/3` fijo, quedaría "demasiado chico" en portrait).
  **Actualización 2026-07-24 (pruebas en dispositivo real):** esa suposición resultó incorrecta. En un teléfono real, el `.crt-screen` entra con tamaño cómodamente jugable en portrait, y el layout de horizontal resultó impráctico (nav + HUD + `crt-bottom` ocupan casi toda la altura disponible en un teléfono apaisado real; el primer intento de compactarlos con una media query nunca llegó a confirmarse funcionando). **Yes (nueva decisión):** exponer `blockPortrait: boolean` por juego en `RealGameConfig` y dejar los 4 juegos reales con `blockPortrait: false` — jugables directo en vertical, sin aviso ni pausa por orientación. **No:** invertir más tiempo en depurar el layout de horizontal para estos 4 juegos ahora — el mecanismo de aviso/pausa (código de `orientationBlocked` + CSS de landscape compacto) se deja implementado y disponible por si un juego futuro sí necesita forzar horizontal, pero no se sigue debuggeando para los 4 actuales.
- **Yes:** el `orientationBlocked` es independiente del `paused` manual (no togglea el botón visible PAUSA/REANUDAR). **No:** reusar el mismo estado `paused` — mezclarlos causaría que, al salir de vertical, el juego se reanudara aunque el jugador hubiera pausado manualmente a propósito. _(Aplica solo si algún juego futuro usa `blockPortrait: true`.)_
- **Yes:** sin persistencia de la preferencia de controles táctiles (siempre auto-detectado). **No:** guardar en `localStorage` si el usuario prefiere ocultarlos — no se pidió esa funcionalidad y agrega superficie sin necesidad clara.
- **Yes:** `lib/games/touchControls.ts` como registro compartido, análogo a `lib/games/skins.ts`. **No:** hardcodear la config de botones dentro de `TouchControls.tsx` o de `GamePlayerClient.tsx` — el registro separado sigue la convención ya establecida en el proyecto y facilita que specs futuras agreguen su entrada sin tocar el componente.
- **Yes:** los clusters `.touch-dpad`/`.touch-actions` usan `max-width` (46% cada uno, o `.touch-dpad--wide` al 92% sin cluster de acciones) en vez de tamaño intrínseco libre. **No:** dejar que el ancho de cada cluster dependiera solo del contenido — en un teléfono real angosto, "PROPULSAR"/"DISPARAR" (Asteroides) hacían que el D-pad y las acciones se superpusieran visualmente.
- **Yes:** bajar la velocidad de Serpentina (`BASE_TICK_MS`/`MIN_TICK_MS`) para todos los jugadores, tocando la lógica interna de `SerpentinaGame.tsx`. **No:** una velocidad distinta solo para táctil — el usuario, al elegir entre las dos opciones, prefirió el cambio global aunque afecte también a los jugadores de teclado; es la única excepción a "no tocar la lógica interna de los juegos" en esta spec, decidida explícitamente durante las pruebas en dispositivo real.

## Amendments (post-implementation, pruebas en dispositivo real, 2026-07-24)

Tras completar el plan original (pasos 1-7) y probar en un teléfono real (no solo emulador), surgieron ajustes que esta spec no había previsto:

1. **`blockPortrait` por juego** (`RealGameConfig` en `GamePlayerClient.tsx`): el aviso "GIRÁ TU DISPOSITIVO" resultó innecesario — el `.crt-screen` ya entra jugable en portrait en un teléfono real. Los 4 juegos reales quedaron con `blockPortrait: false`. Ver Decisions.
2. **Intento de layout compacto para landscape** (ocultar nav/footer vía clase `av-touch-player` en `<body>`, compactar `.player-hud`/`.crt`/`.crt-screen` bajo `@media (orientation: landscape) and (max-height: 600px) and (pointer: coarse)`): quedó implementado en `app/globals.css` pero **nunca se confirmó que funcionara** en dispositivo real antes de pivotar a portrait. No lo ejercita ningún juego real hoy (los 4 tienen `blockPortrait: false`); queda como base para retomar si algún juego futuro fuerza horizontal.
3. **Fix de superposición de botones táctiles**: `.touch-dpad`/`.touch-actions` pasaron de ancho intrínseco a `max-width: 46%` (o `.touch-dpad--wide` al `92%` sin cluster de acciones) + `flex-wrap`, y `.touch-btn` se achicó (`font-size` 10→8px, `min-width`/`min-height` 52→46px). Sin esto, en un teléfono angosto el D-pad y las acciones de Asteroides se superponían.
4. **Fix de overflow horizontal en portrait**: `.hud-actions` y `.crt-bottom` no tenían `flex-wrap`, y en un teléfono real esa fila se salía del ancho de la pantalla forzando scroll horizontal en toda la página. Se agregó `flex-wrap: wrap` a ambos.
5. **Velocidad de Serpentina**: `BASE_TICK_MS` 160→190 y `MIN_TICK_MS` 60→80 en `SerpentinaGame.tsx`, para todos los jugadores — la velocidad original hacía que la serpiente chocara consigo misma muy rápido jugando con botones táctiles.

## Risks

| Risk                                                                                                                                                              | Mitigation                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un `KeyboardEvent` sintético no dispara los mismos efectos que uno real si algún juego revisa propiedades además de `code` (p. ej. `key`, `repeat`, `isTrusted`). | Se revisan los 4 componentes de juego (ya confirmado por lectura de código): todos solo leen `e.code`; se construye el evento sintético con el `code` exacto y se re-verifica en la prueba manual del paso 7. |
| El auto-repeat de botones `discrete: true` puede sentirse muy rápido/lento o trabarse si el `pointerup` no llega (p. ej. el dedo sale del botón).                 | `TOUCH_REPEAT_MS` ajustable en un solo lugar; se limpia el temporizador también en `pointercancel` y `pointerleave`, no solo en `pointerup`.                                                                  |
| Detectar `pointer: coarse` puede dar falsos positivos/negativos en híbridos (laptops con pantalla táctil, tablets con mouse conectado).                           | Riesgo aceptado: se prioriza el caso común (teléfono táctil); un híbrido con mouse simplemente ve controles táctiles adicionales, que no interfieren con el teclado/mouse.                                    |
| El overlay de rotación puede quedar "pegado" si `orientationchange`/`matchMedia` no dispara el evento en algún navegador móvil.                                   | Se usa `matchMedia("(orientation: portrait)").addEventListener("change", ...)` (estándar, soportado en los navegadores móviles principales) en vez de depender solo de `resize`.                              |
| Los botones táctiles superpuestos al canvas pueden tapar parte de la jugabilidad visible en juegos con elementos cerca de los bordes inferiores.                  | Los clusters se ubican en las esquinas inferiores con tamaño acotado y fondo semitransparente; se ajusta visualmente en la prueba manual del paso 7 si algún juego lo requiere.                               |

## What is **not** in this spec

- Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Los juegos de las specs 10-22, aún no implementados.
- Manejo táctil nativo (drag, swipe, gestos) dentro del canvas de cada juego.
- Mejoras de responsividad general del sitio fuera de la pantalla `/games/[id]/jugar`.
- Cambiar el `aspect-ratio` de `.crt-screen` o la resolución interna de canvas de cualquier juego.
- Feedback háptico (vibración) al tocar los botones.
- Personalización del layout de botones por parte del usuario (reposicionar, opacidad, remapeo).
- Persistencia de una preferencia de "mostrar/ocultar controles táctiles".
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
