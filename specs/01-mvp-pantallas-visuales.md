# SPEC 01 — MVP visual de pantallas (Arcade Vault)

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-07-16
> **Objective:** Migrar a Next.js App Router las 5 pantallas visuales de Arcade Vault (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) definidas en `references/templates/`, con datos mock y sin lógica de juego real.

## Scope

**In:**

- Las 5 pantallas migradas a App Router: Biblioteca (`/`), Detalle (`/juegos/[id]`), Reproductor (`/juegos/[id]/jugar`), Auth (`/auth`), Salón de la Fama (`/salon`).
- Layout compartido con `Nav` (logo, links, contador de créditos estático, botón de sesión) y `Footer`, incluyendo menú móvil hamburguesa.
- Biblioteca: hero, buscador por nombre, filtro por categoría (chips), grid de tarjetas de juego con tilt al hover.
- Detalle: portada, tags, descripción, stats (partidas/mejor/dificultad), leaderboard del juego, botones "Jugar ahora" / "Volver al vault".
- Reproductor: réplica visual completa del template — HUD (jugador/puntuación/vidas/nivel), pausa, arena CRT decorativa (sin lógica de juego real), modal de fin de partida con guardado de puntuación.
- Auth: tabs "Iniciar sesión" / "Crear cuenta", campo de invitado, sin validación de campos, sin botones de login social.
- Salón de la Fama: tabs por juego, podio (top 3), tabla de puntuaciones, fila "tu mejor marca" si hay sesión activa.
- Datos mock: lista de juegos y categorías en JSON estático; generación de puntuaciones (`seededScores`) y lista de jugadores como utilidad TypeScript.
- Persistencia real en `localStorage`: sesión de usuario (`av_user`) y puntuaciones guardadas (`av_scores`).
- Tema visual completo (variables CSS, animaciones neón/CRT, fuentes Press Start 2P / Courier Prime / JetBrains Mono) portado a `app/globals.css`, reemplazando las fuentes Geist actuales. Componentes maquetados con utilidades Tailwind.

**Out of scope (for future specs):**

- Lógica de juego real (canvas, colisiones, controles, física) para cualquiera de los 8 juegos listados.
- Backend/autenticación real, base de datos, o cuentas persistentes fuera del navegador.
- Login social funcional (Google/GitHub) — no se incluyen ni como botones decorativos.
- Sistema de créditos/monedas real (el contador en el Nav queda estático).
- Sonido/audio.
- Tests automatizados (no hay test runner configurado en el proyecto).
- Multijugador o partidas en tiempo real (ej. "Duelo Pixel" a dos jugadores).

## Data model

**`data/games.json`** — catálogo estático de juegos y categorías (migrado de `GAMES`/`CATS` en `data.jsx`):

```json
{
  "categories": ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"],
  "games": [
    {
      "id": "bloque-buster",
      "title": "BLOQUE BUSTER",
      "short": "Rebota la pelota y destruye muros de neón.",
      "long": "Pilota una nave-paleta...",
      "cat": "ARCADE",
      "cover": "cover-bricks",
      "color": "cyan",
      "best": 28450,
      "plays": "12.4K"
    }
  ]
}
```

**`lib/types.ts`** — tipos compartidos:

```ts
type Game = {
  id: string; title: string; short: string; long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; color: "cyan" | "magenta" | "green" | "yellow";
  best: number; plays: string;
};

type ScoreRow = { rank: number; name: string; score: number; date: string };

type User = { name: string };

type ScoreEntry = { game: string; score: number; name: string; at: number };
```

**`lib/scores.ts`** — utilidad de generación de leaderboards mock (migrado de `PLAYERS` + `seededScores` en `data.jsx`):

```ts
const PLAYERS: string[]; // 18 nombres fijos (PX_KAI, NEONFOX, ...)

function seededScores(seed: number, count?: number): ScoreRow[];
// generador pseudoaleatorio determinista (LCG), igual algoritmo que el template
```

**Claves de `localStorage`:**

- `av_user` → `User | null`, serializado como JSON. Se escribe en login/invitado, se borra al cerrar sesión.
- `av_scores` → `ScoreEntry[]`, serializado como JSON. Se hace `push` de una nueva entrada cada vez que se guarda una puntuación en el Reproductor.

Convenciones:

- IDs de juego: slugs en minúscula con guiones (coinciden con `data/games.json`).
- Fechas en `ScoreRow.date`: formato `DD/MM/YYYY`, generadas por `seededScores` (no son fechas reales).
- `seededScores` es determinista por `seed`: mismo seed → mismas filas, para que el detalle y el salón muestren datos estables entre renders.

## Implementation plan

1. Reemplazar fuentes en `app/layout.tsx` por Press Start 2P / Courier Prime / JetBrains Mono (`next/font/google`) y portar a `app/globals.css` el tema del template (variables CSS, animaciones neón/CRT, estilos base) dentro del bloque `@theme inline` de Tailwind v4. El scaffold sigue arrancando sin errores.
2. Crear la capa de datos: `data/games.json`, `lib/types.ts` y `lib/scores.ts` (`PLAYERS` + `seededScores`), migrados de `data.jsx`.
3. Crear `lib/storage.ts` con helpers tipados para leer/escribir/borrar `av_user` y hacer `push` sobre `av_scores` en `localStorage`.
4. Construir el layout compartido: `components/Nav.tsx` (links, contador de créditos estático, botón de sesión, hamburguesa + panel móvil) y `components/Footer.tsx`, integrados en `app/layout.tsx` con manejo de sesión vía `lib/storage.ts`.
5. Construir Biblioteca en `app/page.tsx`: hero, buscador, chips de categoría y `components/GameCard.tsx` (grid con tilt on hover), enlazando a `/juegos/[id]`.
6. Construir Detalle en `app/juegos/[id]/page.tsx`: portada, tags, descripción, stats, leaderboard (`seededScores`), acciones hacia `/juegos/[id]/jugar` y `/`. `id` inválido dispara `notFound()`.
7. Construir Auth en `app/auth/page.tsx`: tabs iniciar sesión/crear cuenta, campos sin validación, botón de invitado; al enviar, guarda `av_user` vía `lib/storage.ts` y redirige a `/`.
8. Construir Reproductor en `app/juegos/[id]/jugar/page.tsx`: HUD, arena CRT decorativa, ticker de puntuación falso, pausa, botón "FIN", modal de fin de partida con guardado de score en `av_scores`, reinicio y vuelta al vault.
9. Construir Salón de la Fama en `app/salon/page.tsx`: tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" cuando hay sesión activa.
10. Pasada final: verificar navegación completa entre las 5 pantallas, responsive/menú móvil, y persistencia de sesión y puntuaciones tras recargar la página.

## Acceptance criteria

- [ ] La app carga en `/` sin errores en consola y muestra la pantalla Biblioteca con el grid de juegos de `data/games.json`.
- [ ] El buscador de Biblioteca filtra el grid por texto del título en tiempo real.
- [ ] Los chips de categoría filtran el grid por `cat`, incluyendo "TODOS".
- [ ] Al hacer clic en una tarjeta o en "JUGAR", navega a `/juegos/[id]` con la información correcta del juego.
- [ ] `/juegos/[id]` muestra portada, tags, descripción, stats y un leaderboard con 10 filas generadas por `seededScores`.
- [ ] Un `id` de juego inexistente en `/juegos/[id]` muestra la página 404 de Next.js.
- [ ] El botón "JUGAR AHORA" navega a `/juegos/[id]/jugar`.
- [ ] En el Reproductor, la puntuación del HUD aumenta automáticamente cada ~220ms mientras no está en pausa ni terminado.
- [ ] El botón "PAUSA"/"REANUDAR" detiene y reanuda el incremento de puntuación, y muestra el overlay "EN PAUSA".
- [ ] El botón "FIN" abre el modal de fin de partida con la puntuación final congelada.
- [ ] Guardar la puntuación en el modal agrega una entrada a `av_scores` en `localStorage` y muestra el mensaje de confirmación.
- [ ] "JUGAR DE NUEVO" reinicia el HUD (puntuación, vidas, nivel) y cierra el modal.
- [ ] En `/auth`, enviar el formulario de "Iniciar sesión" o "Crear cuenta" con cualquier valor (incluso vacío) guarda `av_user` en `localStorage` y redirige a `/`.
- [ ] "JUGAR COMO INVITADO" navega a `/` sin guardar `av_user`.
- [ ] Con sesión activa, el Nav muestra el nombre de usuario en vez del botón "Iniciar Sesión", y permite cerrar sesión (borra `av_user`).
- [ ] `/salon` muestra tabs por cada juego de `data/games.json`, y cambiar de tab actualiza podio y tabla con datos deterministas de `seededScores`.
- [ ] Con sesión activa, `/salon` muestra la fila "TU MEJOR MARCA"; sin sesión, no aparece.
- [ ] En viewport móvil, el botón hamburguesa abre el panel de navegación lateral con los mismos links que el Nav de escritorio.
- [ ] Recargar la página conserva la sesión (`av_user`) y las puntuaciones guardadas (`av_scores`) previamente almacenadas.
- [ ] Las fuentes Press Start 2P / Courier Prime / JetBrains Mono se cargan correctamente y Geist ya no se usa en `app/layout.tsx`.

## Decisions

- **Yes:** rutas en español (`/juegos/[id]`, `/salon`, etc.). Coincide con el idioma del contenido visible y el resto del proyecto.
- **No:** rutas en inglés. Generaría inconsistencia entre URLs y contenido.
- **Yes:** réplica visual completa del Reproductor (ticker de puntuación falso, pausa, modal de fin). Permite revisar el flujo completo de UI sin implementar un juego real.
- **No:** maqueta estática sin interacción en el Reproductor. Dejaría sin validar estados clave (pausa, fin de partida, guardado) que sí forman parte del MVP visual.
- **Yes:** `localStorage` real para sesión y puntuaciones. Da persistencia creíble sin necesidad de backend.
- **No:** estado solo en memoria de React. Se perdería la sesión y las puntuaciones al recargar, lo que contradice el comportamiento del template original.
- **Yes:** datos de juegos como JSON estático (`data/games.json`) + `seededScores`/`PLAYERS` como utilidad TypeScript aparte. El JSON no puede contener una función generadora.
- **No:** todo en un único archivo `lib/data.ts` con arrays y función mezclados. Separar JSON de lógica facilita mantenimiento y es más idiomático en Next.js.
- **Yes:** tema visual (variables CSS, animaciones, fuentes) portado a `app/globals.css`, componentes maquetados con utilidades Tailwind. Evita duplicar un sistema de clases CSS custom paralelo a Tailwind.
- **No:** portar `styles.css` casi tal cual con sus clases (`.av-nav`, `.card`, `.crt`, etc.). Rompería la consistencia del proyecto, que ya usa Tailwind v4 CSS-first.
- **Yes:** reemplazar fuentes Geist por Press Start 2P / Courier Prime / JetBrains Mono. El tema retro/neón depende visualmente de ellas.
- **No:** mantener Geist en paralelo. No se usaría en ninguna pantalla y añadiría peso sin beneficio.
- **Yes:** Auth sin validación de campos, sin botones de login social. Es un MVP visual sin backend; agregar validación o botones decorativos sin función alguna no aporta al objetivo.
- **No:** validación básica de campos requeridos. Añadiría estados de error que no están definidos en el template ni son necesarios para el objetivo visual.
- **Yes:** incluir menú móvil hamburguesa. El template lo define y es necesario para que la app sea usable en pantallas pequeñas.

## Risks

| Risk                                                                 | Mitigation                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `localStorage` no existe en el render de servidor de Next.js (SSR)  | Acceder a `localStorage` solo dentro de componentes cliente (`"use client"`) y en `useEffect`/handlers, nunca en el cuerpo de un Server Component. |
| `localStorage` deshabilitado o lleno (modo privado, cuota excedida) | Envolver lecturas/escrituras en `try/catch` dentro de `lib/storage.ts`, igual que en el template; si falla, la app sigue funcionando sin persistir. |

## What is **not** in this spec

- Lógica de juego real para ninguno de los 8 juegos (canvas, colisiones, controles, física).
- Backend, base de datos o autenticación real.
- Login social funcional (Google/GitHub).
- Sistema de créditos/monedas real.
- Sonido/audio.
- Tests automatizados.
- Multijugador o partidas en tiempo real.

Cada uno de estos, si se implementa, va en su propia spec.
