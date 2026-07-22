# SPEC 06 — Leaderboard y catálogo de juegos reales (Supabase)

> **Status:** Implemented
> **Depends on:** SPEC 04 (Conexión con Supabase), SPEC 05 (Juego Asteroides)
> **Date:** 2026-07-22
> **Objective:** Reemplazar `data/games.json` y el guardado local de puntuaciones de Asteroides por dos tablas reales en Supabase (`games` y `scores`), para que el catálogo de juegos (`/games`, `/games/[id]`) y el leaderboard de Asteroides (ficha del juego y pestaña correspondiente de `/salon`) dejen de depender de datos estáticos o simulados, sin tocar autenticación ni los otros 7 juegos.

## Scope

**In:**

- Migración SQL en Supabase (vía `mcp__supabase__apply_migration`) que crea:
  - Tabla `games` (id, title, short, long, cat, cover, color, best, plays) — poblada con un `INSERT` que replica los 8 registros actuales de `data/games.json`.
  - Tabla `scores` (id uuid, game_id text FK → games.id, name text, score integer, created_at timestamptz) — vacía al crearse.
  - RLS habilitado en ambas tablas: `SELECT` público en `games` y `scores`; `INSERT` público en `scores` (sin `UPDATE`/`DELETE` públicos); `games` sin `INSERT`/`UPDATE`/`DELETE` público (el catálogo no se edita desde el cliente).
- `data/games.json` se elimina del repo una vez la tabla `games` está poblada y todo el código lee desde Supabase.
- `lib/supabase/games.ts` (nuevo): helpers server-side (`getGames()`, `getGameById(id)`) que hacen `SELECT` a la tabla `games` usando `lib/supabase/server.ts`.
- `lib/supabase/scores.ts` (nuevo): helpers para la tabla `scores` — `getTopScores(gameId, limit)` (server, usado por la ficha del juego) y `insertScore({ gameId, name, score })` (client, usado solo por el flujo de Asteroides vía `lib/supabase/client.ts`).
- `app/games/page.tsx` pasa a Server Component: hace `getGames()` en el servidor y pasa el arreglo a un nuevo Client Component `components/GamesBrowser.tsx` que conserva la búsqueda/filtro por categoría (`useState`/`useMemo`) ya existente. Las categorías (`TODOS`/`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`) quedan hardcodeadas en código (no se agregan a la tabla `games`), ya que corresponden 1:1 al union type `Game["cat"]`.
- `app/games/[id]/page.tsx` (ya es Server Component) cambia `games.find(...)` por `getGameById(id)` y, si `id === "asteroides"`, obtiene el leaderboard con `getTopScores("asteroides", 10)` en vez de `seededScores(...)`; para cualquier otro `id`, sigue usando `seededScores(...)` exactamente como hoy. El "Mejor global" (`stat-strip`) para asteroides muestra `MAX(score)` real de `scores` si existe al menos una fila, o el valor estático `game.best` como fallback si la tabla está vacía; para los otros 7 juegos sigue mostrando siempre `game.best` estático.
- `app/games/[id]/jugar/page.tsx` pasa a ser un Server Component async que resuelve el juego con `getGameById(id)` (o `notFound()`), y renderiza la lógica actual (hooks, estado, `AsteroidsGame`, modal) movida a un nuevo Client Component `components/GamePlayerClient.tsx` que recibe `game: Game` como prop. Cuando `game.id === "asteroides"`, "GUARDAR PUNTUACIÓN" llama a `insertScore({ gameId: "asteroides", name, score })` (Supabase) en vez de `pushScore` a localStorage; para los otros 7 juegos, "GUARDAR PUNTUACIÓN" sigue llamando a `pushScore` de `lib/storage.ts` exactamente igual que hoy.
- `app/salon/page.tsx` pasa a ser un Server Component async que obtiene la lista de juegos con `getGames()` y la pasa a un nuevo Client Component `components/SalonClient.tsx` que conserva el estado de pestaña (`tab`) ya existente. Cuando la pestaña activa es `"asteroides"`, las filas de la tabla y el podio se obtienen client-side con `getTopScoresClient("asteroides", 12)` (usando `lib/supabase/client.ts`); para cualquier otra pestaña, sigue usando `seededScores(...)` igual que hoy. El bloque "TU MEJOR MARCA" (basado en `getUser()`) no cambia de comportamiento.
- Estado vacío: si `scores` no tiene filas para `"asteroides"` (nadie ha guardado puntuación aún) o si la consulta a Supabase falla, se muestra un mensaje simple ("Aún no hay puntuaciones guardadas." / "No se pudo cargar el leaderboard.") en el lugar de la tabla/podio, sin datos falsos de respaldo. Si `getGames()` falla al cargar el catálogo (`/games`, `/games/[id]`, `/salon`), se muestra un mensaje de error a nivel de página.

**Out of scope (para futuras specs):**

- Supabase Auth real (`app/auth`, `lib/storage.ts` `getUser`/`setUser`/`clearUser` no cambian). El guardado de puntuación en `scores` es anónimo (sin `user_id`), identificado solo por el campo `name` que el jugador escribe en el modal, igual que hoy con `pushScore`.
- Leaderboard real para los otros 7 juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`): siguen con `seededScores()` y `pushScore` a localStorage sin cambios, tanto en su ficha (`/games/[id]`) como en `/salon` y en `/games/[id]/jugar`.
- Contador `plays` real (incrementar partidas jugadas): se migra el valor de texto actual (ej. `"15.6K"`) tal cual a la tabla `games`, pero no se incrementa automáticamente.
- Edición/administración del catálogo de juegos (no hay UI ni endpoint para crear/editar/borrar juegos; la tabla `games` solo se puebla una vez, vía la migración SQL inicial).
- Paginación del leaderboard, filtros por fecha, o límites de tasa (rate limiting) en `insertScore`.
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

**Tabla `games`** (Supabase, `public.games`):

```sql
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  best integer not null,
  plays text not null
);

alter table public.games enable row level security;

create policy "games_public_read" on public.games
  for select using (true);
```

Poblada con un `INSERT` único (migración) que replica los 8 registros exactos hoy en `data/games.json` (mismos `id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`).

**Tabla `scores`** (Supabase, `public.scores`):

```sql
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "scores_public_read" on public.scores
  for select using (true);

create policy "scores_public_insert" on public.scores
  for insert with check (true);
```

Vacía al crearse; solo recibe filas reales cuando `game_id = 'asteroides'` (el resto de flujos de guardado siguen usando `lib/storage.ts` con localStorage, sin tocar esta tabla).

**Tipos TypeScript** (`lib/types.ts` no cambia de forma; `Game` y `ScoreRow` ya describen exactamente estas dos tablas). Nuevas funciones:

```ts
// lib/supabase/games.ts (server)
export async function getGames(): Promise<Game[]>;
export async function getGameById(id: string): Promise<Game | null>;

// lib/supabase/scores.ts
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>; // server
export async function insertScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void>; // client
export async function getTopScoresClient(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>; // client, usado por SalonClient
```

`ScoreRow` (`{ rank, name, score, date }`) se arma en estos helpers a partir de las filas ordenadas por `score` descendente (`rank` = posición 1-based; `date` = `created_at` formateado `DD/MM/AAAA`).

## Implementation plan

1. Migración SQL (`mcp__supabase__apply_migration`): crear tablas `games` y `scores` con las policies RLS descritas en el modelo de datos, y poblar `games` con un `INSERT` que replica los 8 registros actuales de `data/games.json`. El sitio no cambia: sigue leyendo `data/games.json` como hoy; la base de datos queda lista para consumirse en los pasos siguientes.
2. Crear `lib/supabase/games.ts` con `getGames()` y `getGameById(id)`. No se importan todavía desde ninguna página; el sitio sigue sin cambios de comportamiento.
3. Crear `lib/supabase/scores.ts` con `getTopScores(gameId, limit)`, `insertScore(entry)` y `getTopScoresClient(gameId, limit)`. Tampoco se usan aún; sin cambios de comportamiento.
4. Migrar `app/games/page.tsx` a Server Component (`getGames()`) + nuevo `components/GamesBrowser.tsx` (Client Component con la búsqueda/filtro ya existente). `/games` ahora lee el catálogo desde Supabase; el resto de páginas (`/games/[id]`, `/games/[id]/jugar`, `/salon`) sigue importando `data/games.json` directamente, sin cambios.
5. Migrar `app/games/[id]/page.tsx`: reemplazar `games.find(...)` por `getGameById(id)`; cuando `id === "asteroides"`, usar `getTopScores("asteroides", 10)` con el fallback de `best` (`MAX(score)` si hay filas, si no `game.best` estático) y el estado vacío/error; para cualquier otro `id`, sigue usando `seededScores(...)` sin cambios. `/games/[id]/jugar` y `/salon` siguen sin cambios.
6. Migrar `app/games/[id]/jugar/page.tsx`: extraer la lógica actual (hooks, estado, render de `AsteroidsGame`, modal de fin de partida) a `components/GamePlayerClient.tsx`, que recibe `game: Game` como prop; `page.tsx` pasa a Server Component async que resuelve el juego con `getGameById(id)` (o `notFound()`) y renderiza `GamePlayerClient`. Cuando `game.id === "asteroides"`, "GUARDAR PUNTUACIÓN" llama a `insertScore(...)`; para los otros 7 juegos sigue llamando a `pushScore` de `lib/storage.ts` sin cambios. `/salon` sigue sin cambios.
7. Migrar `app/salon/page.tsx`: extraer la lógica actual (pestañas, podio, tabla, bloque "TU MEJOR MARCA") a `components/SalonClient.tsx`, que recibe `games: Game[]` como prop; `page.tsx` pasa a Server Component async que resuelve la lista con `getGames()`. Dentro de `SalonClient`, cuando la pestaña activa es `"asteroides"`, usar `getTopScoresClient("asteroides", 12)` con estado vacío/error; para cualquier otra pestaña, sigue usando `seededScores(...)` sin cambios.
8. Eliminar `data/games.json` (ya no queda ningún import directo en el código) y confirmar que no hay referencias residuales al archivo.
9. Pasada final: verificación manual en navegador (`/games` carga el catálogo desde Supabase con búsqueda/filtro funcionando, `/games/asteroides` muestra estado vacío del leaderboard antes de la primera partida guardada, jugar y guardar una puntuación en asteroides hace que aparezca en la ficha del juego y en la pestaña "ASTEROIDES" de `/salon`, los otros 7 juegos siguen funcionando exactamente igual que antes con `localStorage`/`seededScores`), más `npm run build` y `npm run lint` sin errores nuevos.

## Acceptance criteria

- [x] En Supabase existen las tablas `public.games` (8 filas, una por juego) y `public.scores` (vacía tras la migración), ambas con RLS habilitado.
- [x] `public.games` permite `SELECT` público y no permite `INSERT`/`UPDATE`/`DELETE` desde el cliente (verificado con el policy check de Supabase / `get_advisors`).
- [x] `public.scores` permite `SELECT` e `INSERT` público, y no permite `UPDATE`/`DELETE` desde el cliente.
- [x] `data/games.json` ya no existe en el repo y no hay ningún `import` restante que lo referencie.
- [x] `/games` carga la lista de los 8 juegos desde Supabase (no desde JSON estático); la búsqueda por nombre y el filtro por categoría siguen funcionando igual que antes.
- [x] `/games/asteroides` (antes de guardar cualquier puntuación) muestra un estado vacío en el leaderboard ("Aún no hay puntuaciones guardadas." o equivalente) en vez de una tabla con datos falsos.
- [x] Jugar una partida de Asteroides y presionar "GUARDAR PUNTUACIÓN" inserta una fila real en `public.scores` con `game_id: "asteroides"`.
- [x] Después de guardar una puntuación de Asteroides, `/games/asteroides` muestra esa fila en el leaderboard (top 10 por score descendente), y el "Mejor global" refleja el `MAX(score)` real.
- [x] La pestaña "ASTEROIDES" en `/salon` muestra las mismas puntuaciones reales guardadas en `public.scores` (podio + tabla), no datos generados por `seededScores`.
- [x] Las otras 7 pestañas en `/salon` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando datos de `seededScores()` sin cambios.
- [x] Las fichas de los otros 7 juegos en `/games/[id]` siguen mostrando el leaderboard de `seededScores()` sin cambios, y su "Mejor global" sigue siendo el valor estático `game.best`.
- [x] Jugar y "GUARDAR PUNTUACIÓN" en cualquiera de los otros 7 juegos sigue guardando en `localStorage` vía `pushScore` (no en Supabase), igual que antes.
- [x] Si se simula una falla de red hacia Supabase (o la tabla `scores` está vacía), `/games/asteroides` y la pestaña "ASTEROIDES" de `/salon` muestran un mensaje de error/estado vacío, sin quedar en blanco ni lanzar una excepción no controlada.
- [x] `npm run build` completa sin errores nuevos relacionados a los archivos agregados/modificados.
- [x] `npm run lint` no reporta errores nuevos en los archivos agregados/modificados.

## Decisions

- **Yes:** migrar el catálogo de `data/games.json` a una tabla `games` en Supabase. El usuario lo pidió explícitamente ("tabla de juegos"); unifica el catálogo con la misma base de datos que ya se conectó en SPEC 04.
- **No:** mantener `data/games.json` como fallback si Supabase falla. Se descartó para no tener dos fuentes de verdad del catálogo; en su lugar se muestra un estado de error simple.
- **Yes:** el leaderboard real (tabla `scores`) aplica solo a `"asteroides"`, el único juego con lógica real hoy. Decisión explícita del usuario para acotar el alcance.
- **No:** hacer que los otros 7 juegos también escriban/lean de Supabase. Sus puntuaciones son de una simulación falsa (`setInterval` aleatorio); guardarlas de verdad no aportaría un leaderboard significativo todavía.
- **Yes:** sin Supabase Auth real en esta spec; el guardado de puntuación de Asteroides en `scores` es anónimo (columna `name` de texto libre, sin `user_id`). Decisión explícita del usuario — consistente con que SPEC 04 ya había diferido auth real a una spec futura.
- **No:** implementar login/signup real ahora. Se evaluará en una spec futura dedicada a auth, que entonces podría agregar `user_id` a `scores`.
- **Yes:** RLS con `SELECT` e `INSERT` públicos en `scores` (sin `UPDATE`/`DELETE` público). Decisión explícita del usuario — es el único esquema que deja "GUARDAR PUNTUACIÓN" funcional sin auth real; el riesgo de spam de inserts se documenta en Risks.
- **No:** bloquear `INSERT` público hasta tener auth real. Dejaría el botón "GUARDAR PUNTUACIÓN" de Asteroides sin funcionar, contradiciendo el objetivo de la spec.
- **Yes:** el campo `best` de Asteroides se calcula como `MAX(score)` real sobre `scores` (con fallback al valor estático si la tabla aún no tiene filas). Decisión explícita del usuario para que "Mejor global" refleje el leaderboard real una vez existan datos.
- **No:** recalcular/persistir `best` como columna denormalizada actualizada por trigger. Se descarta por complejidad extra no justificada; calcularlo en la consulta (`MAX`) es suficiente para el volumen esperado.
- **Yes:** el campo `plays` se migra tal cual (texto estático) a la tabla `games`, sin volverse un contador real. Decisión explícita del usuario — fuera de alcance de esta spec.
- **Yes:** `/games`, `/games/[id]` y `/games/[id]/jugar` pasan a resolver el catálogo con Server Components (`getGames()`/`getGameById()` en el servidor), pasando los datos como prop a Client Components que conservan la interactividad existente (`GamesBrowser`, `GamePlayerClient`). Decisión explícita del usuario — evita exponer lógica de fetching en el cliente para datos que no cambian por sesión.
- **No:** hacer fetch 100% client-side del catálogo en las tres páginas. Se descartó por agregar un estado de carga innecesario en páginas que hoy renderizan de inmediato con datos estáticos.
- **Yes:** en `/salon`, la lista de juegos (para las pestañas) se resuelve server-side (`getGames()`), pero el leaderboard de la pestaña activa se resuelve client-side (`getTopScoresClient`) porque cambia de forma interactiva al cambiar de pestaña sin recargar la página — mismo patrón que ya usa hoy con `seededScores` dentro de un `useMemo`.
- **Yes:** las categorías de filtro (`TODOS`/`ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS`) quedan hardcodeadas en código, no se agregan como fila/tabla en Supabase. Corresponden 1:1 al union type `Game["cat"]`; convertirlas en datos agregaría una tabla extra sin necesidad real.
- **No:** crear una tabla `categories` en Supabase. Se descarta por ser un enum fijo que ya vive en el tipo TypeScript.
- **Yes:** sin edición/administración del catálogo (no hay UI para crear/editar juegos); la tabla `games` se puebla una única vez vía la migración SQL. Consistente con que el catálogo de 8 juegos es fijo hoy.
- **Yes:** sin tests automatizados, verificación manual + `npm run build`/`npm run lint`. No hay test runner configurado (igual que en SPEC 03, 04 y 05).

## Risks

| Risk                                                                                                                                                                                                                                                                                | Mitigation                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSERT` público sin auth en `scores` permite que cualquiera con la publishable key inserte puntuaciones falsas o en volumen (spam) para "asteroides"                                                                                                                               | Aceptado explícitamente por el usuario para esta spec (sin auth); mismo nivel de confianza que hoy con `localStorage` (cualquiera puede editarlo desde DevTools), pero ahora visible para todos. Se documenta como riesgo conocido, a mitigar en una futura spec de auth/rate limiting. |
| Migrar `app/games/page.tsx`, `app/games/[id]/jugar/page.tsx` y `app/salon/page.tsx` de Client Component a Server Component + Client Component separado podría romper el estado/interactividad existente (búsqueda, pestañas, hooks del juego) si la extracción de props se hace mal | Cada página se migra en su propio paso del plan (4, 6, 7), verificando manualmente en navegador que la interactividad (búsqueda, filtro, pestañas, pausa/reanudar, guardar puntuación) sigue funcionando antes de pasar al siguiente paso.                                              |
| Eliminar `data/games.json` antes de que todas las páginas lean de Supabase dejaría partes del sitio rotas (import inexistente)                                                                                                                                                      | El archivo se elimina en el último paso del plan (8), después de migrar las cuatro páginas que lo importaban (4, 5, 6, 7); se verifica con una búsqueda del string `games.json` en el código antes de eliminarlo.                                                                       |
| La tabla `games` vacía o con error de red dejaría `/games`, `/games/[id]` y `/salon` sin contenido                                                                                                                                                                                  | Se define un estado de error explícito a nivel de página (mensaje simple) para este caso, en vez de una pantalla en blanco o una excepción no controlada.                                                                                                                               |
| Cambiar `best` de valor estático a `MAX(score)` real para asteroides podría mostrar un número menor al `best` histórico mostrado antes (41200) si nadie ha superado esa marca todavía                                                                                               | Aceptado: mientras `scores` no tenga una fila con score > 41200 (o esté vacía), se sigue mostrando el valor estático `game.best` como fallback, tal como se definió en el modelo de datos.                                                                                              |

## What is **not** in this spec

- Supabase Auth real (`app/auth`, `lib/storage.ts`).
- Leaderboard real para los otros 7 juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Contador `plays` real (se migra como texto estático).
- Edición/administración del catálogo de juegos.
- Paginación, filtros por fecha o rate limiting en el guardado de puntuaciones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
