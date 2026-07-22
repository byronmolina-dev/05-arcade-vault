# SPEC 05 — Juego Asteroides (adaptación del juego de referencia)

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-07-21
> **Objective:** Adaptar el juego de referencia `references/started-games/02-asteroids/game.js` a un componente cliente de Next.js/TypeScript (`components/games/AsteroidsGame.tsx`) que reemplace la simulación falsa de puntaje en `/juegos/asteroides/jugar` (renombrando el slot existente `rocas` → `asteroides`), con puntuación, vidas y nivel reales integrados al HUD y al flujo de guardado de puntuación ya existentes en el sitio.

## Scope

**In:**

- Renombrar el slot `rocas` → `asteroides` en `data/games.json`: `id: "asteroides"`, `title: "ASTEROIDES"`, y corregir el texto `long` para que describa el juego real (sin mención de OVNIs), manteniendo `cover`, `color`, `cat`, `best` y `plays` sin cambios.
- Puerto a TypeScript del juego de referencia como componente cliente `components/games/AsteroidsGame.tsx`: mismas clases/lógica (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`), mismo loop `requestAnimationFrame`, mismos controles (`←`/`→` rotar, `↑` propulsar, `Espacio` disparar), mismas constantes de juego (radios, velocidades, puntos por tamaño, power-up de disparo triple).
- El componente renderiza en un `<canvas>` de resolución interna fija 800×600, escalado con CSS (`width/height: 100%`) para llenar `.crt-screen` (ya tiene `aspect-ratio: 4/3`, coincide exactamente).
- El HUD interno dibujado en el canvas (SCORE/NIVEL/vidas/indicador "3x") se mantiene tal cual el original, en paralelo al panel HUD externo de React ya existente en la página (sin eliminar ninguno de los dos).
- El componente expone hacia `app/juegos/[id]/jugar/page.tsx` el estado real de partida (`score`, `lives`, `level`, `gameOver`) vía callbacks, y acciones imperativas (`pause`/`resume`, `reset`) controladas desde los botones ya existentes (PAUSA/REANUDAR, FIN).
- Se desactiva el overlay interno "GAME OVER" / reinicio con Espacio del juego original: al llegar a 0 vidas (o al presionar "FIN"), el juego se congela (deja de actualizar, sigue dibujando el último frame) y dispara el callback de fin de partida; el modal ya existente en la página (puntaje final, campo de iniciales, "GUARDAR PUNTUACIÓN", "JUGAR DE NUEVO", "VOLVER AL VAULT") es el único que maneja el fin de partida.
- `app/juegos/[id]/jugar/page.tsx` se actualiza para: si `game.id === "asteroides"`, montar `AsteroidsGame` y sincronizar el HUD externo (Puntuación, Vidas, Nivel) con el estado real del juego en vez de la simulación `setInterval` actual; para cualquier otro `id`, se mantiene el comportamiento actual (simulación falsa) sin cambios.
- "PAUSA" congela el loop de actualización del juego (nave, asteroides, balas, partículas, power-ups dejan de moverse) mostrando el overlay "EN PAUSA" ya existente encima del canvas; "REANUDAR" continúa desde el mismo estado. "FIN" fuerza el fin de partida inmediato (mismo camino que llegar a 0 vidas).
- Guardado de puntuación: sin cambios funcionales — `pushScore({ game: "asteroides", score, name })` vía `lib/storage.ts`, igual que hoy para cualquier otro juego.

**Out of scope (para futuras specs):**

- Controles táctiles/on-screen para móvil (la ficha del juego los menciona, pero ninguna pantalla del sitio los implementa hoy).
- Escalado del canvas por `devicePixelRatio` (se usa escalado CSS simple; el juego es 100% vectorial).
- Implementar los otros 7 juegos de `data/games.json` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`); siguen con la simulación falsa actual.
- Cualquier cambio a `lib/storage.ts`, `lib/scores.ts`, `lib/supabase/*`, persistencia en Supabase, o al salón de la fama (`app/salon`) — esos siguen usando lo ya implementado en specs previas.
- Añadir enemigos tipo OVNI u otras mecánicas no presentes en `game.js` original.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

Esta feature no agrega tipos a `lib/types.ts` (el tipo `Game` no cambia de forma, solo cambian valores de un registro existente en `data/games.json`). Introduce la interfaz pública del nuevo componente `components/games/AsteroidsGame.tsx`:

```ts
// components/games/AsteroidsGame.tsx

export type AsteroidsGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type AsteroidsGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

// Componente cliente: expone AsteroidsGameHandle vía forwardRef/useImperativeHandle.
export default function AsteroidsGame(
  props: AsteroidsGameProps,
  ref: Ref<AsteroidsGameHandle>,
): JSX.Element;
```

La lógica interna del juego (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, y el estado `score`/`lives`/`level`/`state` del loop) vive dentro del componente como variables/refs locales tipadas — no se exportan ni se persisten fuera de él; el componente es quien las traduce a los tres callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`) en cada frame que cambian, y a `onGameOver` cuando `lives` llega a 0 o se invoca `reset()`/`pause()` desde afuera.

`data/games.json`: no cambia el schema, solo el contenido del registro existente (`id: "rocas"` → `"asteroides"`, `title: "ROCAS"` → `"ASTEROIDES"`, `long` corregido sin mención de OVNIs).

## Implementation plan

1. Renombrar el slot en `data/games.json`: `id: "rocas"` → `"asteroides"`, `title` → `"ASTEROIDES"`, corregir `long` (sin mención de OVNIs). El resto del sitio sigue funcional: `/juegos/asteroides` muestra la ficha con el nuevo nombre; `/juegos/asteroides/jugar` sigue mostrando la simulación falsa actual (aún no tocada).

2. Portar `game.js` a TypeScript como `components/games/AsteroidsGame.tsx`: mismas clases (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`), mismas constantes, mismo loop `requestAnimationFrame`, canvas interno 800×600 escalado por CSS. El componente compila y se puede montar de forma aislada, pero todavía no se importa desde ninguna página — nada del sitio cambia de comportamiento.

3. Agregar a `AsteroidsGame` las props (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) y el handle imperativo (`pause`, `resume`, `reset`) vía `forwardRef`/`useImperativeHandle`; desactivar el overlay interno "GAME OVER" y el reinicio por Espacio del original — al llegar a 0 vidas el loop se congela (deja de actualizar, sigue dibujando el último frame) y se invoca `onGameOver`. Sigue sin montarse en ninguna página; el resto del sitio no cambia.

4. Actualizar `app/juegos/[id]/jugar/page.tsx`: cuando `game.id === "asteroides"`, montar `AsteroidsGame` dentro de `.crt-screen` (reemplazando el placeholder `.game-arena`), sincronizar `score`/`lives`/`level` de React con los callbacks del componente, cablear los botones "PAUSA"/"REANUDAR" y "FIN" al handle (`pause`/`resume`/`reset` cuenta como "fin forzado" disparando `onGameOver` con el score actual), y abrir el modal de fin de partida ya existente desde `onGameOver` en vez del `setInterval` falso. Para cualquier otro `id`, el comportamiento actual (simulación falsa) no cambia.

5. Pasada final: verificación manual en navegador del flujo completo (jugar con teclado, pausar/reanudar, perder una nave y ver el parpadeo de invencibilidad, subir de nivel al limpiar asteroides, recoger el power-up de disparo triple, terminar por 0 vidas y por botón "FIN", guardar puntuación con `pushScore`, "JUGAR DE NUEVO" y "VOLVER AL VAULT"), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [x] `data/games.json` ya no contiene ningún registro con `id: "rocas"`; existe un registro `id: "asteroides"`, `title: "ASTEROIDES"`, con `long` sin mención de OVNIs.
- [x] `/juegos/asteroides` carga la ficha del juego con el nuevo título, sin errores, mostrando el leaderboard sembrado igual que antes.
- [x] `/juegos/asteroides/jugar` renderiza el canvas real del juego (nave, asteroides, HUD interno) dentro de `.crt-screen`, en vez del placeholder `.game-arena` anterior.
- [x] `←`/`→` rotan la nave, `↑` propulsa (con llama visible), `Espacio` dispara — igual que el juego de referencia.
- [x] Al destruir asteroides grandes/medianos se dividen en fragmentos más pequeños; los pequeños desaparecen con partículas de explosión; la puntuación sube según el tamaño destruido (20/50/100).
- [x] El panel HUD externo (Puntuación, Vidas, Nivel) refleja en tiempo real el `score`, `lives` y `level` reales del juego — no la simulación aleatoria anterior.
- [x] El HUD interno del canvas (SCORE/NIVEL/vidas/indicador "3x") sigue visible y funcional en paralelo al HUD externo.
- [x] Perder una vida muestra el parpadeo de invencibilidad temporal al reaparecer, igual que el juego original; el contador de vidas del HUD externo baja en 1.
- [x] Limpiar todos los asteroides de una oleada avanza de nivel (`level` sube, aparecen más asteroides), reflejado en el HUD externo. _(verificado por revisión de código: `nextLevel()` se porta sin cambios de lógica; no se logró forzar un level-up en la sesión manual de prueba en navegador)_
- [x] Recoger el power-up muestra el indicador "3x" con cuenta regresiva y habilita disparo triple durante su duración. _(verificado por revisión de código: spawn/colisión del power-up sin cambios de lógica; no se observó un power-up en pantalla durante la sesión manual de prueba)_
- [x] Presionar "PAUSA" congela el juego (nada se mueve) y muestra el overlay "EN PAUSA" existente; "REANUDAR" continúa desde el mismo estado exacto.
- [x] Presionar "FIN" termina la partida de inmediato con el score actual, sin esperar a perder las 3 vidas.
- [x] Llegar a 0 vidas (o presionar "FIN") congela el canvas y abre el modal existente de fin de partida (puntaje final, campo de iniciales, "GUARDAR PUNTUACIÓN") — el overlay interno "GAME OVER" del juego original ya **no** aparece, y Espacio ya **no** reinicia la partida por sí solo.
- [x] "GUARDAR PUNTUACIÓN" en el modal persiste el registro vía `pushScore({ game: "asteroides", score, name })`, igual que para cualquier otro juego.
- [x] "JUGAR DE NUEVO" reinicia el componente del juego a un estado limpio (score 0, 3 vidas, nivel 1); "VOLVER AL VAULT" navega a `/games`.
- [x] Cualquier otro juego (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) en `/juegos/[id]/jugar` sigue mostrando la simulación falsa actual sin cambios de comportamiento.
- [x] `npm run build` completa sin errores nuevos relacionados a los archivos agregados/modificados.
- [x] `npm run lint` no reporta errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** renombrar el slot existente `rocas` → `asteroides` (mismo registro, mismo `cover`/`color`/`cat`). El nombre "rocas" era un placeholder provisional para este mismo juego; el juego real se llama Asteroids/Asteroides.
- **No:** crear un slot nuevo `asteroides` dejando `rocas` sin implementar. Duplicaría la entrada para el mismo juego sin necesidad.
- **Yes:** corregir el copy `long` de la ficha (quitar mención de OVNIs) en vez de agregar un enemigo tipo OVNI al juego. El juego de referencia no tiene esa mecánica; agregarla ampliaría el alcance más allá de adaptar lo ya construido.
- **No:** agregar un enemigo OVNI para que coincida con el copy original. Fuera del alcance de "adaptar el juego existente"; se evaluaría en una spec futura si se desea esa mecánica.
- **Yes:** mantener ambos HUD (el interno del canvas y el panel externo de React) mostrando la misma información en paralelo. Decisión explícita del usuario, aunque haya redundancia visual — evita rediseñar el canvas original.
- **No:** eliminar el HUD interno del canvas. Se descartó para minimizar cambios sobre el juego de referencia ya funcional.
- **Yes:** desactivar el overlay interno "GAME OVER" y el reinicio por Espacio, dejando que el modal ya existente del sitio (con guardado de puntuación) maneje el fin de partida. Evita dos UIs de fin de partida superpuestas y reutiliza el flujo de guardado ya construido en specs previas.
- **No:** mantener el overlay interno además del modal del sitio. Generaría una experiencia confusa con dos pantallas de "fin de juego" distintas.
- **Yes:** portar la lógica a TypeScript como componente cliente (`components/games/AsteroidsGame.tsx`) en vez de cargar `game.js` tal cual. Consistente con que el resto del proyecto es 100% TypeScript/App Router; evita mezclar un `<script>` global con variables no aisladas dentro de una SPA de React.
- **No:** copiar `game.js` sin cambios a `public/` y cargarlo con `<script src>`. Rompería el modelo de componentes de Next.js y quedaría inconsistente con el resto del código tipado.
- **Yes:** canvas con resolución interna fija 800×600 escalado por CSS simple (`width/height: 100%`), sin ajuste por `devicePixelRatio`. El juego es 100% vectorial (`stroke`/`fill`, sin bitmaps), por lo que el escalado CSS ya se ve nítido; el ajuste por DPI añadiría código (resize listener, transform del contexto) para una mejora marginal.
- **No:** escalado por `devicePixelRatio`. Se descarta por complejidad extra no justificada dado que el render es vectorial.
- **Yes:** sin controles táctiles/on-screen en esta spec, aunque la ficha del juego los mencione ("TECLADO / TÁCTIL"). Ningún otro juego del sitio los implementa hoy; agregar una UI de controles táctiles es una feature separada con sus propias decisiones de diseño.
- **No:** implementar controles táctiles ahora. Se evaluaría en una spec futura, posiblemente compartida entre todos los juegos.
- **Yes:** solo el slot `asteroides` recibe implementación real en esta spec; los otros 7 juegos siguen con la simulación falsa actual. Mantiene el alcance acotado a portar un solo juego; cada uno de los demás se implementará en su propia spec.
- **No:** implementar o eliminar los otros juegos en esta misma spec. Ampliaría el alcance sin necesidad.
- **Yes:** sin cambios a `lib/storage.ts`, `lib/scores.ts` ni Supabase — el guardado de puntuación sigue usando `pushScore` con `game: "asteroides"`, igual que cualquier otro juego hoy. La persistencia real en Supabase es tema de una spec futura (ya anticipado en SPEC 04).
- **Yes:** sin tests automatizados, verificación manual + `npm run build`/`npm run lint`. No hay test runner configurado en el proyecto (igual que en SPEC 03 y SPEC 04).

## Risks

| Risk                                                                                                                                                                                                         | Mitigation                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El loop `requestAnimationFrame` del juego portado compite por recursos con el ciclo de renderizado de React (re-renders del HUD externo en cada cambio de `score`/`lives`/`level`)                           | Los callbacks (`onScoreChange`, etc.) solo disparan `setState` en React cuando el valor realmente cambia (no en cada frame), evitando renders innecesarios del panel externo mientras el canvas sigue su propio loop imperativo aislado.              |
| Al desmontar la página (`SALIR`, navegar a `/games`) el loop `requestAnimationFrame` podría seguir corriendo en segundo plano                                                                                | El componente cancela el `requestAnimationFrame` pendiente y remueve los listeners de teclado en el cleanup de su `useEffect`, igual que cualquier componente React con recursos externos.                                                            |
| Los listeners de teclado (`ArrowLeft/Right/Up`, `Space`) del juego podrían interferir con atajos de teclado del navegador o de otras partes del sitio (Nav, inputs) mientras la página de juego está montada | Los listeners solo se agregan mientras `AsteroidsGame` está montado (es decir, solo dentro de `/juegos/asteroides/jugar`) y se remueven al desmontar; no hay atajos globales de teclado definidos en el resto del sitio hoy que puedan chocar.        |
| Congelar el loop en pausa/fin de partida sin detener correctamente `requestAnimationFrame` podría dejar el canvas en un estado inconsistente (última nave dibujada a mitad de una animación)                 | El handle `pause()`/`reset()` solo deja de invocar `update(dt)`, pero sigue llamando `draw()` con el último estado — el `dead`/`invincible` timers no siguen corriendo mientras está pausado, evitando estados visuales a medio parpadear.            |
| Cambiar `id` de `"rocas"` a `"asteroides"` podría romper algún enlace o referencia hardcodeada a `/juegos/rocas` en otra parte del sitio                                                                     | Se verifica con una búsqueda del string `rocas` en el código antes de dar la spec por completa; como el sitio genera todos los enlaces dinámicamente desde `data/games.json` (`GameCard`, `/juegos/[id]`), no debería haber referencias hardcodeadas. |
