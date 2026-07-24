# SPEC 23 — Controles táctiles móviles

> **Status:** Approved
> **Depends on:** SPEC 05 (Asteroides — patrón `keys[code]` continuo), SPEC 06 (Leaderboard y catálogo de juegos reales), SPEC 07 (Tetris — patrón `keydown` discreto), SPEC 08 (Bloque Buster — patrón `GameHandle`/`REAL_GAME_CONFIG` en `GamePlayerClient`), SPEC 09 (Serpentina — generalización del HUD en `GamePlayerClient`)
> **Date:** 2026-07-24
> **Objective:** Agregar un overlay de controles táctiles (D-pad + botones de acción, configurado por juego) y un aviso de "girá tu dispositivo" en la pantalla `/games/[id]/jugar`, para que los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`) sean jugables por completo en un teléfono táctil sin teclado.

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
- Aviso de orientación: en `GamePlayerClient.tsx`, cuando se detecta dispositivo táctil y `window.matchMedia("(orientation: portrait)").matches`, se muestra un overlay "GIRÁ TU DISPOSITIVO" (mismo estilo visual que el overlay existente de "EN PAUSA") y se pausa el juego real automáticamente (`gameRef.current?.pause()`) sin togglear el botón visible PAUSA/REANUDAR. Al volver a horizontal, se reanuda automáticamente (`gameRef.current?.resume()`) solo si el jugador no había pausado manualmente antes de rotar.
- Integración en `components/GamePlayerClient.tsx`: montar `<TouchControls gameId={game.id} />` únicamente cuando `game.id` sea uno de los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`); montar el aviso de orientación en el mismo conjunto de juegos.
- CSS nuevo en `app/globals.css`: clases para el D-pad y los botones de acción (posición absoluta sobre `.crt-screen`, `touch-action: none` para evitar scroll/zoom accidental al tocar), y el overlay de rotación reutilizando la estética del overlay de pausa existente.
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
const [orientationBlocked, setOrientationBlocked] = useState(false); // true = táctil + portrait
```

Convenciones:

- `code` usa los mismos valores de `KeyboardEvent.code` que ya leen los 4 juegos reales (`ArrowUp/Down/Left/Right`, `Space`) — no se introducen códigos nuevos.
- `discrete: false` → el botón mantiene `keys[code] = true` desde `pointerdown` hasta `pointerup`/`pointercancel`/`pointerleave` (mismo efecto que sostener la tecla física).
- `discrete: true` → el botón dispara un primer `keydown` inmediato y repite cada `TOUCH_REPEAT_MS` mientras se sostiene, con un solo `keyup` final al soltar.
- `TOUCH_CONTROLS_CONFIG` sin entrada para un `game.id` (placeholders, juegos futuros no implementados) ⇒ `TouchControls` no renderiza nada para ese juego.
- `orientationBlocked` es independiente del `paused` manual (botón PAUSA/REANUDAR existente): al activarse llama a `gameRef.current?.pause()` sin togglear el estado visible de pausa; al desactivarse, llama a `gameRef.current?.resume()` solo si `paused` (manual) es `false`.

## Implementation plan

1. Crear `lib/games/touchControls.ts`: tipos (`TouchButtonCode`, `TouchButtonConfig`, `TouchControlsConfig`), la constante `TOUCH_REPEAT_MS` y `TOUCH_CONTROLS_CONFIG` con las 4 entradas reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`). Módulo puro sin JSX; compila y puede importarse sin efecto visible en ninguna pantalla.

2. Crear `components/games/TouchControls.tsx` con la detección de dispositivo táctil (`useEffect` + `matchMedia("(pointer: coarse)")` / `"ontouchstart" in window`) y el guard por ausencia de config en `TOUCH_CONTROLS_CONFIG[gameId]`; en ambos casos retorna `null`. Sin render de botones todavía. Compila aislado, no se importa desde ninguna página.

3. Implementar el render de los clusters D-pad (abajo-izquierda) y acciones (abajo-derecha) a partir de `TOUCH_CONTROLS_CONFIG[gameId]`, más las clases CSS nuevas en `app/globals.css` (`.touch-controls`, `.touch-dpad`, `.touch-actions`, `.touch-btn`, con `touch-action: none`). Los botones aún no disparan ningún evento al tocarlos. Sigue sin montarse en ninguna página.

4. Implementar el disparo de `KeyboardEvent` sintéticos en `TouchControls`: `pointerdown` dispara `keydown` inmediato; para `discrete: false` el `keyup` llega en `pointerup`/`pointercancel`/`pointerleave`; para `discrete: true` se repite `keydown` cada `TOUCH_REPEAT_MS` mientras el puntero siga presionado, con un único `keyup` final al soltar. Limpieza de temporizadores en `pointerup`/`pointercancel`/desmontaje. Lógica verificable por revisión de código; la prueba en navegador se hace en el paso 6. Sigue sin montarse.

5. En `components/GamePlayerClient.tsx`: agregar el estado `isTouchDevice` (mismo detector que `TouchControls`) y el overlay "GIRÁ TU DISPOSITIVO" condicionado a `isTouchDevice && matchMedia("(orientation: portrait)").matches`, con el `useEffect` que llama `gameRef.current?.pause()`/`resume()` y el estado `orientationBlocked` (sin togglear el `paused` manual). Aún sin montar `TouchControls`. Verificable rotando el emulador móvil del navegador en cualquiera de los 4 juegos reales: aparece el aviso y el juego se pausa; al volver a horizontal, se reanuda solo si no había pausa manual.

6. En un solo paso atómico: montar `<TouchControls gameId={game.id} />` dentro de `.crt-screen` en `GamePlayerClient` para los 4 juegos reales. `/games/asteroides/jugar`, `/games/tetris/jugar`, `/games/bloque-buster/jugar` y `/games/serpentina/jugar` quedan jugables por completo con botones táctiles en un dispositivo/emulador táctil, sin alterar el comportamiento de teclado existente.

7. Pasada final: verificación manual en el emulador móvil de devtools (y en un teléfono real si es posible) de los 4 juegos reales — el D-pad y las acciones responden, el auto-repeat de Tetris se siente natural, el aviso de rotación aparece/desaparece pausando y reanudando correctamente, el teclado físico sigue funcionando igual que antes, y los 4 placeholders no muestran ningún botón táctil — más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [ ] En un dispositivo/emulador táctil, `/games/asteroides/jugar` muestra un D-pad (ROTAR IZQ/DER) y botones de acción (PROPULSAR, DISPARAR) sobre el `.crt-screen`.
- [ ] En un dispositivo/emulador táctil, `/games/tetris/jugar` muestra un D-pad (◄ ► ▼) y botones de acción (ROTAR, CAER).
- [ ] En un dispositivo/emulador táctil, `/games/bloque-buster/jugar` muestra un D-pad (◄ ►) sin cluster de acciones.
- [ ] En un dispositivo/emulador táctil, `/games/serpentina/jugar` muestra un D-pad de 4 direcciones sin cluster de acciones.
- [ ] En desktop con mouse (sin touch), ninguno de los 4 juegos reales muestra botones táctiles.
- [ ] Sostener un botón `discrete: false` (p. ej. PROPULSAR en Asteroides) mantiene la acción activa mientras se sostiene, igual que sostener la tecla física.
- [ ] Sostener un botón `discrete: true` (p. ej. ◄ en Tetris) repite el movimiento cada `TOUCH_REPEAT_MS` mientras se sostiene, sin necesidad de tocar repetidamente.
- [ ] Soltar cualquier botón táctil (`pointerup`, `pointercancel` o `pointerleave`) detiene la acción correspondiente sin dejarla "trabada".
- [ ] El teclado físico sigue controlando los 4 juegos reales exactamente igual que antes de esta spec.
- [ ] En un dispositivo/emulador táctil en orientación vertical, aparece el aviso "GIRÁ TU DISPOSITIVO" y el juego se pausa (sin togglear visualmente el botón PAUSA/REANUDAR).
- [ ] Al rotar a horizontal, el aviso desaparece y el juego se reanuda automáticamente, salvo que el jugador ya hubiera pausado manualmente antes de rotar (en ese caso permanece en pausa).
- [ ] Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) no muestran botones táctiles ni el aviso de rotación.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** limitar el alcance a los 4 juegos reales (`asteroides`, `tetris`, `bloque-buster`, `serpentina`). **No:** tocar los 4 placeholders ni los juegos de las specs 10-22 — no tienen jugabilidad real todavía, no hay nada que adaptar; el patrón queda documentado en `touchControls.ts` para cuando se activen.
- **Yes:** botones táctiles que disparan `KeyboardEvent` sintéticos sobre `window` (mismo `code` que ya leen los 4 juegos). **No:** agregar manejo táctil nativo (drag, swipe) dentro de cada componente de juego — la opción elegida no toca la lógica interna de ningún juego, mientras que la nativa hubiera requerido modificar los 4 archivos de juego individualmente.
- **Yes:** mostrar los controles táctiles solo si se detecta `pointer: coarse`/`ontouchstart`. **No:** mostrarlos siempre (incluso en desktop) — evita ruido visual en mouse/teclado y mantiene el `.crt-screen` limpio para la mayoría de los jugadores actuales.
- **Yes:** auto-repeat configurable por botón (`discrete: true/false`) en vez de un único comportamiento global. **No:** forzar auto-repeat en todos los botones — Asteroides/Bloque Buster ya leen `keys[code]` de forma continua (sostener alcanza) y agregarles repetición sería redundante; Tetris/Serpentina reaccionan a `keydown` puntual y sí lo necesitan.
- **Yes:** D-pad abajo-izquierda + acciones abajo-derecha, superpuestos al `.crt-screen`. **No:** una barra de botones debajo del canvas — ocuparía espacio vertical que ya es escaso en móvil junto al aviso de rotación, y el overlay reproduce el esquema estándar de control de juego móvil.
- **Yes:** pedir girar a horizontal con aviso + pausa automática cuando el dispositivo táctil está en vertical. **No:** adaptar el layout para funcionar también en vertical — el `.crt-screen` es `aspect-ratio: 4/3` fijo (decisión ya tomada en specs anteriores, no se toca aquí); en vertical el canvas y los controles quedarían demasiado chicos para jugar cómodo.
- **Yes:** el `orientationBlocked` es independiente del `paused` manual (no togglea el botón visible PAUSA/REANUDAR). **No:** reusar el mismo estado `paused` — mezclarlos causaría que, al salir de vertical, el juego se reanudara aunque el jugador hubiera pausado manualmente a propósito.
- **Yes:** sin persistencia de la preferencia de controles táctiles (siempre auto-detectado). **No:** guardar en `localStorage` si el usuario prefiere ocultarlos — no se pidió esa funcionalidad y agrega superficie sin necesidad clara.
- **Yes:** `lib/games/touchControls.ts` como registro compartido, análogo a `lib/games/skins.ts`. **No:** hardcodear la config de botones dentro de `TouchControls.tsx` o de `GamePlayerClient.tsx` — el registro separado sigue la convención ya establecida en el proyecto y facilita que specs futuras agreguen su entrada sin tocar el componente.

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
