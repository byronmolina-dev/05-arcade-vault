# SPEC 02 — Home y About (Arcade Vault)

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-07-18
> **Objective:** Migrar a Next.js App Router las pantallas Home (`/`) y Acerca de (`/about`) definidas en `references/templates/home-about/`, reubicando la Biblioteca actual a `/games` y actualizando el Nav compartido para reflejar la nueva estructura de rutas.

## Scope

**In:**

- Página **Home** en `app/page.tsx` (reemplaza el contenido actual), migrada de `home.jsx`: hero con eyebrow/título/CTAs y siluetas SVG decorativas flotantes (`FloatingSilhouettes`), sección "¿Por qué Arcade Vault?" (grid de 4 features con iconos), sección "Juegos disponibles ahora" (mini-rail con los primeros 6 juegos de `data/games.json`), sección de stats, sección "Actividad en vivo" (ticker de últimas puntuaciones + top 5 jugadores, con los mismos datos mock hardcodeados del template), sección de precios (plan único gratis + FAQ), y CTA final.
- Página **Biblioteca** reubicada de `app/page.tsx` a `app/games/page.tsx` (ruta `/games`), sin cambios de comportamiento respecto a lo implementado en SPEC 01.
- Página **Acerca de** en `app/about/page.tsx` (ruta `/about`), migrada de `about.jsx`: hero de misión, fila de highlights (3 tarjetas), banner divisor animado, y formulario de contacto (nombre/email/mensaje) con validación de campos requeridos (animación "shake" si falta alguno) y mensaje de éxito estilo terminal al enviar, sin backend real.
- `components/Nav.tsx` actualizado: nuevo link "Inicio" → `/`, el link existente pasa a "Biblioteca" → `/games`, nuevo link "Acerca de" → `/about`, en desktop y en el panel móvil. Lógica de estado activo: `/` activo solo en Home; `/games` activo en `/games` y en `/juegos/*` (detalle y reproductor), igual que hoy.
- Hook reutilizable de scroll-reveal (`.reveal` / `.in` vía `IntersectionObserver`), usado por las secciones de Home y About.
- Estilos: portar a `app/globals.css` las clases necesarias de `references/templates/home-about/styles.css` (secciones `home-*`, `feature-*`, `mini-*`, `activity-*`, `ticker`/`top-list`, `pricing-*`, `about-*`, `contact-*`, `highlight-*`, `.reveal`/`.in`), siguiendo la misma convención de SPEC 01 (clases propias en `globals.css`, no reescritura a utilidades Tailwind).
- Actualizar cualquier enlace interno que hoy apunte a `/` asumiendo que es la Biblioteca (por ejemplo dentro del propio Nav o de otras pantallas) para que apunte a `/games` cuando corresponda.

**Out of scope (for future specs):**

- Envío real del formulario de contacto (sin email, sin backend, sin persistencia de mensajes enviados) — queda como animación decorativa de éxito, sin efecto real.
- Actividad en vivo real/en tiempo real (el ticker y el top de jugadores siguen siendo datos mock hardcodeados, no se conectan a `lib/scores.ts` ni a ninguna fuente dinámica).
- Sistema de créditos/monedas real (el contador en el Nav sigue estático, como en SPEC 01).
- Botones de login social.
- Metadata/SEO por página (títulos, descripciones) más allá de lo ya definido en `app/layout.tsx`.
- Tests automatizados.

## Data model

Esta feature no introduce estructuras de datos nuevas en `lib/types.ts` ni nuevos archivos JSON en `data/`. El contenido mock específico de Home y About (features, actividad en vivo, top jugadores, FAQ, highlights) se mantiene como constantes locales tipadas dentro de cada archivo de página, igual que en `home.jsx`/`about.jsx` — no se exporta ni se reutiliza en otras pantallas.

Ejemplo ilustrativo (forma, no reutilizable fuera del archivo):

```ts
// app/page.tsx (local, no exportado)
type ActivityTick = { player: string; game: string; score: number; time: string; color: "cyan" | "magenta" | "green" | "yellow" };
type TopPlayer = { rank: number; player: string; score: number };
```

La única pieza de datos reutilizada entre pantallas es `data/games.json` (ya existente desde SPEC 01), de donde Home toma los primeros 6 juegos para la sección "Juegos disponibles ahora".

## Implementation plan

1. Crear el hook reutilizable `lib/useReveal.ts` (usa `IntersectionObserver` para agregar la clase `.in` a elementos `.reveal` cuando entran en el viewport). Aún no se usa en ninguna pantalla; el sistema sigue funcionando igual.
2. Portar a `app/globals.css` las clases CSS necesarias para Home (`home-hero`, `home-silos`/`silo`, `feature-grid`/`feature-card`/`ft-icon`, `mini-rail`/`mini-card`, `home-stats`/`stat-block`, `activity-grid`/`activity-card`/`ticker`/`tick-row`/`top-list`/`top-row`, `pricing-grid`/`price-card`/`pricing-faq`/`faq-item`, `home-final`, `.reveal`/`.in`) desde `references/templates/home-about/styles.css`. Sin uso todavía, no cambia el render actual.
3. Mover el contenido actual de `app/page.tsx` a `app/games/page.tsx` (ruta `/games`) sin cambios funcionales, y reemplazar `app/page.tsx` con la página Home migrada de `home.jsx` (hero + siluetas, features, mini-rail de juegos vía nuevo `components/MiniGameCard.tsx`, stats, actividad en vivo con datos mock, pricing, CTA final), usando el hook y los estilos de los pasos 1-2. Al terminar, `/` muestra Home y `/games` muestra la Biblioteca.
4. Actualizar `components/Nav.tsx`: agregar link "Inicio" → `/`, renombrar el link existente a "Biblioteca" → `/games`, y ajustar `isActive` para que `/` sea exclusivo de Home y `/games` cubra `/games` + `/juegos/*`, tanto en el nav de escritorio como en el panel móvil.
5. Portar a `app/globals.css` las clases CSS necesarias para About (`about-hero`, `highlight-row`/`highlight`, `about-divider`/`div-pixels`, `contact-grid`/`contact-form`/`field`, `terminal-success`, etc.) desde el mismo `styles.css`.
6. Construir `app/about/page.tsx` (ruta `/about`), migrada de `about.jsx`: hero de misión, fila de highlights, banner divisor, y formulario de contacto con validación de campos requeridos (shake si falta alguno) y mensaje de éxito estilo terminal, usando el hook de reveal del paso 1.
7. Agregar el link "Acerca de" → `/about` en `components/Nav.tsx` (desktop y panel móvil).
8. Pasada final: verificar navegación completa entre Home, Biblioteca, Detalle, Reproductor, Auth, Salón y About; estados activos del Nav; responsive/menú móvil; y que ningún enlace interno quede apuntando incorrectamente a `/` como si fuera la Biblioteca.

## Acceptance criteria

- [x] `/` carga sin errores en consola y muestra la pantalla Home (hero con siluetas flotantes, features, mini-rail de juegos, stats, actividad en vivo, pricing, CTA final).
- [x] `/games` carga sin errores y muestra la Biblioteca (buscador, chips de categoría, grid de juegos) exactamente igual que antes de mover la ruta.
- [x] `/about` carga sin errores y muestra el hero de misión, la fila de highlights, el banner divisor y el formulario de contacto.
- [x] En Home, el botón "▶ EXPLORAR JUEGOS" navega a `/games`.
- [x] En Home, los botones "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [x] En Home, la sección "Juegos disponibles ahora" muestra los primeros 6 juegos de `data/games.json` y cada tarjeta navega a `/juegos/[id]` del juego correspondiente.
- [x] En Home, el botón "VER TODOS LOS JUEGOS →" navega a `/games`.
- [x] En Home, el botón "VER SALÓN →" navega a `/salon`.
- [x] En Home, las secciones marcadas `reveal` aparecen con la animación de entrada al hacer scroll hasta ellas (se les agrega la clase `.in` al entrar en el viewport).
- [x] En About, enviar el formulario de contacto con algún campo vacío dispara la animación "shake" y no muestra el mensaje de éxito.
- [x] En About, enviar el formulario con los tres campos completos muestra el mensaje de éxito estilo terminal con el nombre ingresado, y "ENVIAR OTRO MENSAJE" vuelve a mostrar el formulario vacío.
- [x] El Nav muestra los links "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de", en ese orden, en escritorio y en el panel móvil.
- [x] El link "Inicio" está activo únicamente en `/`; el link "Biblioteca" está activo en `/games` y en cualquier ruta `/juegos/*`.
- [x] El logo del Nav navega a `/`.
- [x] En viewport móvil, el botón hamburguesa abre el panel con los 4 links de navegación más la opción de sesión.

## Decisions

- **Yes:** Home vive en `/`, la Biblioteca se mueve a `/games`. Coincide con la intención del template (Home y Biblioteca son pantallas separadas) y fue pedido explícitamente.
- **No:** dejar Home en una ruta distinta y mantener Biblioteca en `/`. Dejaría `/` sin ser la landing real, contradiciendo el pedido.
- **Yes:** ruta `/games` en inglés para Biblioteca. Decisión explícita del usuario.
- **Yes:** ruta `/about` en inglés para About, por consistencia con `/games`.
- **No:** usar `/biblioteca` y `/acerca-de` en español. Se descartó a favor de las rutas en inglés ya decididas.
- **Yes:** incluir About en esta misma spec junto con Home. Comparten el patrón de animación `reveal` y se pidió agruparlos.
- **Yes:** contenido de "Actividad en vivo" (ticker + top jugadores) hardcodeado tal cual el template, sin conectar a `lib/scores.ts`. Es contenido decorativo de landing page, no necesita ser real.
- **No:** generar esa actividad con `seededScores`/`PLAYERS`. No fue pedido y acoplaría el Home a datos de partidas sin necesidad.
- **Yes:** hook reutilizable `lib/useReveal.ts` para el scroll-reveal, en vez de duplicar `IntersectionObserver` en Home y About.
- **Yes:** formulario de contacto de About sin backend real (solo validación de campos y animación de éxito estilo terminal). Consistente con el resto del proyecto, que es un MVP visual sin backend (ver SPEC 01).
- **No:** enviar el mensaje a un servicio real de email/formularios. Fuera de alcance de un MVP visual sin backend.
- **Yes:** contenido mock de Home/About (features, actividad, top jugadores, FAQ, highlights) como constantes locales tipadas dentro de cada página, sin crear `data/home.json`. No se reutiliza en otras pantallas.
- **No:** crear `data/home.json` para ese contenido. No hay necesidad de reutilización ni de edición fuera del código.

## What is **not** in this spec

- Envío real del formulario de contacto (email, backend, persistencia de mensajes).
- Actividad en vivo real/en tiempo real (el ticker y el top de jugadores siguen siendo mock).
- Sistema de créditos/monedas real.
- Botones de login social.
- Metadata/SEO por página más allá de lo ya definido en `app/layout.tsx`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
