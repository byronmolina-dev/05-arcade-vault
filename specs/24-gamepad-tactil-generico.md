# SPEC 24 — Gamepad táctil genérico

> **Status:** Draft
> **Depends on:** SPEC 07 (Tetris — patrón `keydown` discreto), SPEC 23 (Controles táctiles móviles — registro `TOUCH_CONTROLS_CONFIG`, componente `TouchControls`, y la variante `"gamepad"` creada específicamente para Tetris)
> **Date:** 2026-07-24
> **Objective:** Generalizar la variante visual `"gamepad"` de los controles táctiles (creada en SPEC 23 solo para Tetris) para que pueda aplicarse a cualquier juego real actual o futuro con distintas combinaciones de D-pad/acciones, sin decidir en esta spec a qué juego se le asigna — esa elección se indica explícitamente al momento de ejecutar `/spec-impl`.

## Scope

**In:**

- Revertir los botones de acción del gamepad de Tetris (`components/games/TouchControls.tsx`, componente `GamepadControls`) de los iconos ⟳ (rotar) / ⤓ (caer) a las letras literales **B** / **A** (texto plano, coincidiendo con `references/gamepad-assets/gamepad.html`). El `aria-label` sigue usando el `label` real del botón (ROTAR, CAER, etc.) para accesibilidad — solo cambia el glifo visible.
- Nueva variante de layout para el D-pad dentro de `GamepadControls`: **fila compacta** (2 botones lado a lado, sin cruz ni hub decorativo) cuando `config.dpad` tiene exactamente 2 botones y son `ArrowLeft`/`ArrowRight` (sin verticales). El layout en **cruz con hub** (ya implementado para Tetris) se mantiene sin cambios para 3 o 4 direcciones.
- CSS nuevo en `app/globals.css` para la fila compacta (reutilizando el estilo visual de `.dp` — fondo oscuro, sombra, glow cyan al presionar — solo cambia el arreglo espacial).
- Documentar en `lib/games/touchControls.ts` (comentario) la regla de selección de layout de D-pad (cruz vs fila) y el orden fijo de acciones (`actions[0]` → botón B, `actions[1]` → botón A), para que cualquier juego futuro que active `variant: "gamepad"` herede el comportamiento correcto sin tocar el componente.
- Verificación de que Tetris sigue funcionando exactamente igual (mismo mapeo de teclas, mismo auto-repeat, mismo layout en cruz) salvo el cambio visual de icono→letra en A/B.
- Un paso final explícito, **a completar recién al ejecutar `/spec-impl`**: elegir el `game.id` real (existente o futuro) al que se le agrega `variant: "gamepad"` en `TOUCH_CONTROLS_CONFIG`, y verificar en emulador/dispositivo táctil que controla ese juego correctamente.

**Out of scope (para futuras specs):**

- Decidir en esta spec a qué juego se le aplica el gamepad — se difiere explícitamente.
- Los 4 placeholders (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) — no tienen jugabilidad real ni entrada en `TOUCH_CONTROLS_CONFIG` hoy.
- Soporte para más de 2 botones de acción (A/B es el máximo fijo) o para D-pads verticales-only (arriba/abajo sin izquierda/derecha) — no existe ningún juego real con ese caso hoy; si surge, se extiende en spec futura.
- Un campo `slot`/`icon` configurable por botón — el orden fijo por posición en el array y las letras/flechas fijas cubren los casos actuales.
- Cambiar la ubicación del panel (debajo de `.crt-screen`, centrado, `max-width` acotado) — ya generalizada en `GamePlayerClient.tsx` desde SPEC 23, no se toca.
- Tests automatizados (no hay test runner configurado).

## Data model

No se agregan campos nuevos a los tipos exportados de `lib/games/touchControls.ts` (`TouchButtonConfig`, `TouchControlsConfig` quedan igual) — la regla de layout se **deriva automáticamente** del contenido de `config.dpad`, sin exponer ninguna prop nueva a `TouchControls`/`GamePlayerClient`. Solo se agregan comentarios documentando la regla.

**`components/games/TouchControls.tsx`** (cambios en `GamepadControls`, mismo componente creado en SPEC 23):

```ts
// Layout del D-pad: "fila compacta" si son exactamente 2 botones y ambos
// son ArrowLeft/ArrowRight (sin verticales) — evita una cruz con dos
// brazos vacíos en juegos de solo izquierda/derecha (hoy: Asteroides,
// Bloque Buster). Cualquier otra combinación (3 o 4 direcciones, como
// Tetris) usa la cruz con hub central ya existente.
const isRowLayout =
  dpad.length === 2 &&
  dpad.every((btn) => btn.code === "ArrowLeft" || btn.code === "ArrowRight");
```

- Modo cruz (sin cambios de comportamiento): igual que hoy, `DPAD_SLOTS` mapeado por `code`, con `.dp-hub` central.
- Modo fila (nuevo): los botones de `config.dpad` se renderizan en orden dentro de `.gp-dpad.gp-dpad--row`, cada uno con clase `dp` simple (sin `dp-up/down/left/right`, sin `.dp-hub`), en flexbox horizontal.
- Botones de acción (`.ab.b` / `.ab.a`): el contenido pasa de `<span className="ab-icon">⟳</span>` / `⤓` a texto literal `B` / `A`. El `aria-label` sigue siendo `btn.label` (ROTAR, CAER, PROPULSAR, etc.) — no cambia el mapeo de teclas ni el auto-repeat, solo el glifo visible.
- Orden posición/color ya existente se mantiene: `actions[0]` → botón B (izquierda, cyan), `actions[1]` → botón A (derecha, magenta).

**`app/globals.css`**: nuevas reglas `.gp-dpad--row` (flex, sin alto/ancho fijo de 92px, sin posicionamiento absoluto de los `.dp` internos) — no se modifican las reglas existentes del modo cruz.

## Implementation plan

1. En `components/games/TouchControls.tsx` (`GamepadControls`): reemplazar los iconos ⟳/⤓ de los botones A/B por las letras literales `B`/`A` (texto plano), manteniendo el `aria-label` real de cada botón. Sin tocar el D-pad todavía. Verificable visualmente en Tetris: los botones circulares ahora muestran "B" y "A" en vez de los iconos, y la funcionalidad (rotar/hard drop) sigue igual que antes.

2. Agregar el layout de fila compacta al D-pad: la regla `isRowLayout` (`dpad.length === 2` y ambos `ArrowLeft`/`ArrowRight`), el render alternativo sin cruz/hub, y las clases CSS `.gp-dpad--row` nuevas en `app/globals.css`. Tetris no activa este camino (su D-pad tiene 3 botones: izquierda/derecha/abajo), así que su cruz sigue exactamente igual — se verifica por revisión de código y, opcionalmente, forzando una config de prueba temporal de 2 botones para confirmar visualmente el layout en fila antes de aplicarlo a un juego real.

3. Documentar en `lib/games/touchControls.ts` (comentario junto a `TouchControlsConfig`) la regla de selección de layout (cruz vs fila) y el orden fijo de acciones (primera entrada = B, segunda = A), para que quede claro al agregar la entrada de un juego futuro sin tener que releer el componente.

4. Pasada de verificación: `npm run build` + `npm run lint` sin errores nuevos, y prueba manual en emulador/dispositivo táctil de `/games/tetris/jugar` confirmando que no hay regresión — D-pad en cruz, botones B/A con letras, mismo mapeo de teclas, mismo auto-repeat, panel debajo de `.crt-screen` sin tapar el tablero.

5. **Paso final, a completar explícitamente al ejecutar `/spec-impl`** (no en esta spec): elegir el `game.id` real (existente o futuro) al que se le agrega `variant: "gamepad"` en `TOUCH_CONTROLS_CONFIG`, según la cantidad/tipo de direcciones y acciones que tenga ese juego. Verificar en emulador/dispositivo táctil que el layout correspondiente (cruz o fila, resuelto automáticamente) controla el juego sin romper el teclado físico.

## Acceptance criteria

- [ ] Los botones de acción del gamepad (en cualquier juego con `variant: "gamepad"`) muestran las letras literales `B` (izquierda, cyan) y `A` (derecha, magenta) — no iconos contextuales por función.
- [ ] En Tetris, el `aria-label` de cada botón de acción sigue anunciando su función real (ROTAR, CAER), aunque el glifo visible sea la letra fija.
- [ ] Un D-pad con 3 o 4 direcciones (como Tetris hoy) sigue mostrando la cruz con hub central, sin ningún cambio de comportamiento respecto a la implementación actual.
- [ ] Un D-pad con exactamente 2 direcciones, ambas `ArrowLeft`/`ArrowRight`, muestra el layout de fila compacta (sin cruz ni hub).
- [ ] Un juego sin `actions` (columna A/B vacía) no reserva espacio para esa columna — igual que el comportamiento actual.
- [ ] El orden de `actions` en la config determina posición/color (primera=B/cyan/izquierda, segunda=A/magenta/derecha) sin necesidad de ningún campo adicional en `TouchButtonConfig`.
- [ ] Tetris sigue jugándose exactamente igual que antes de esta spec (mismo mapeo de teclas, mismo auto-repeat, mismo panel debajo de `.crt-screen`) salvo el cambio visual de icono→letra en A/B.
- [ ] Esta spec no aplica `variant: "gamepad"` a ningún juego nuevo por sí misma — el `game.id` elegido se indica explícitamente al ejecutar `/spec-impl`.
- [ ] `npm run build` y `npm run lint` completan sin errores nuevos.

## Decisions

- **Yes:** el mecanismo de gamepad queda genérico para cualquier juego real, actual o futuro. **No:** restringirlo a los 3 juegos reales que faltan hoy (`asteroides`, `bloque-buster`, `serpentina`) — el usuario prefiere elegir el juego en el momento, sin atarse a una lista fija ni anticipar juegos que todavía no existen.
- **Yes:** los botones de acción muestran siempre las letras literales `B`/`A`, coincidiendo con `references/gamepad-assets/gamepad.html`. **No:** iconos contextuales por función (como ⟳/⤓, la primera versión implementada en Tetris) — el usuario prefiere consistencia visual del gamepad físico por sobre iconografía semántica que cambiaría de un juego a otro.
- **Yes:** layout de fila compacta (sin cruz/hub) cuando el D-pad tiene exactamente 2 direcciones horizontales. **No:** forzar siempre la cruz con hub central — se ve disperso/con espacio vacío en un D-pad de solo 2 botones.
- **Yes:** orden fijo array→posición (`actions[0]`→B, `actions[1]`→A), sin campo de configuración nuevo. **No:** un campo `slot` explícito por botón — mantiene `TouchButtonConfig` simple; quien escribe la config de un juego ya controla el orden directamente con el orden del array.
- **Yes:** diferir explícitamente "a qué juego se aplica" al momento de `/spec-impl`. **No:** elegir un juego por default en esta spec — el usuario fue explícito en que él decide cuál en cada implementación.
- No se identificaron riesgos adicionales a los ya documentados en SPEC 23 (el riesgo de eventos sintéticos, auto-repeat, detección de `pointer: coarse`, etc. ya está cubierto ahí y no cambia con esta generalización) — se omite la sección de Risks.
