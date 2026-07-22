# SPEC 04 — Conexión con Supabase

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-07-21
> **Objective:** Conectar la aplicación Next.js al proyecto de Supabase existente agregando los paquetes oficiales (`@supabase/supabase-js`, `@supabase/ssr`), helpers de cliente para browser y server, y las variables de entorno documentadas en `.env.template`, sin implementar todavía auth, persistencia de puntuaciones ni salón de la fama real.

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr` agregadas a `package.json`.
- `lib/supabase/client.ts`: helper que crea un cliente Supabase de browser (`createBrowserClient`) para Client Components.
- `lib/supabase/server.ts`: helper que crea un cliente Supabase de servidor (`createServerClient`) para Server Components y Route Handlers, usando cookies de `next/headers`.
- `.env.template` actualizado con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (vacías, como ya existe para `RESEND_API_KEY`).
- `.env.local` (no versionado) con los valores reales del proyecto Supabase ya conectado (project_ref `uvhzgmgfowxejvirvuhq`), para permitir el smoke check.
- Verificación manual (build + smoke check) de que la conexión funciona.

**Out of scope (para futuras specs):**

- Supabase Auth real (reemplazar `app/auth`, `lib/storage.ts` `getUser`/`setUser`/`clearUser`).
- Persistencia de puntuaciones en una tabla (reemplazar `pushScore`/`getScores`).
- Salón de la fama real (reemplazar `seededScores` en `app/salon`).
- `middleware.ts` de refresco de sesión (no aplica sin auth real todavía).
- Cualquier tabla, migración o esquema en la base de datos Supabase.
- Tests automatizados.

## Data model

Esta spec no agrega tipos a `lib/types.ts` ni tablas a Supabase (el proyecto queda vacío, sin migraciones — confirmado vía MCP). Introduce únicamente dos helpers de creación de cliente:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient;

// lib/supabase/server.ts (usa cookies() de next/headers, async en Next 16)
export async function createClient(): Promise<SupabaseClient>;
```

**Variables de entorno** (`.env.template`, vacías; `.env.local` real no se versiona):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Implementation plan

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install`). No cambia el comportamiento actual de la app.
2. Agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` a `.env.template`, y sus valores reales (obtenidos del proyecto Supabase ya conectado vía MCP, project_ref `uvhzgmgfowxejvirvuhq`) a `.env.local` (no versionado).
3. Crear `lib/supabase/client.ts` con `createClient()` usando `createBrowserClient` de `@supabase/ssr`, leyendo las dos variables `NEXT_PUBLIC_*`. Aún no se importa desde ningún componente.
4. Crear `lib/supabase/server.ts` con `createClient()` async usando `createServerClient` de `@supabase/ssr`, leyendo cookies vía `await cookies()` de `next/headers`. Aún no se importa desde ningún Server Component ni Route Handler.
5. Pasada final: `npm run build` y `npm run lint` pasan sin errores nuevos; smoke check manual descartable (ej. script temporal o Route Handler temporal que se elimina después) confirma que `createClient().auth.getSession()` no lanza excepción contra el proyecto real, y luego se elimina cualquier archivo temporal usado solo para la prueba.

## Acceptance criteria

- [x] `@supabase/supabase-js` y `@supabase/ssr` aparecen en las dependencias de `package.json`.
- [x] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están documentadas (vacías) en `.env.template` y no están hardcodeadas en ningún archivo versionado. (Nombre ajustado de `ANON_KEY` a `PUBLISHABLE_KEY`: el proyecto Supabase real ya usa el formato nuevo de claves públicas `sb_publishable_...`, no un JWT legacy de anon key.)
- [x] `lib/supabase/client.ts` exporta `createClient()` y compila sin errores de TypeScript.
- [x] `lib/supabase/server.ts` exporta `createClient()` async y compila sin errores de TypeScript.
- [x] `npm run build` completa sin errores nuevos relacionados a los archivos agregados.
- [x] `npm run lint` no reporta errores nuevos en los archivos agregados.
- [x] Un smoke check manual confirma que `createClient().auth.getSession()` (browser o server) no lanza excepción usando las credenciales reales de `.env.local` contra el proyecto Supabase ya conectado.
- [x] Ninguna pantalla existente (`/auth`, `/salon`, `/juegos/[id]/jugar`, Nav) cambia de comportamiento: siguen usando `lib/storage.ts` como hoy.

## Decisions

- **Yes:** `@supabase/ssr` + `@supabase/supabase-js`. Es el paquete oficial recomendado por Supabase para Next.js App Router (cookies, Server Components, Route Handlers), preparando el terreno para auth real en una spec futura.
- **No:** solo `@supabase/supabase-js` en el navegador. Perdería soporte de sesión vía cookies en servidor, necesario para las specs futuras de auth.
- **Yes:** dos helpers separados (`client.ts` / `server.ts`) en `lib/supabase/`. Sigue el patrón oficial de Supabase para App Router y evita mezclar el cliente de browser con el de servidor.
- **Yes:** variables de entorno documentadas en `.env.template` (no en `.env.example`). Es el único archivo que el `.gitignore` actual excluye explícitamente; ya se usa así para `SUPABASE_DB_PASSWORD`.
- **No:** documentar también en `.env.example`. Quedaría duplicado y `.env.example` no es el archivo que el `.gitignore` trata como fuente de verdad.
- **Yes:** sin `middleware.ts` de refresco de sesión en esta spec. No hay ninguna pantalla de login real todavía; se agrega junto con la spec de auth.
- **No:** agregar middleware ahora. Añadiría complejidad sin beneficio hasta que exista auth real.
- **Yes:** sin tocar `/auth`, `/salon`, `/juegos/[id]/jugar` ni `lib/storage.ts` en esta spec. Pedido explícito del usuario: solo conexión, otras implementaciones van en specs futuras.
- **No:** reemplazar auth/scores/salón en esta misma spec. Se descartó explícitamente para mantener el alcance acotado a la conexión.
- **Yes:** sin tablas ni migraciones en el proyecto Supabase en esta spec. El proyecto queda vacío (confirmado vía MCP); el esquema se diseñará en la spec de persistencia de puntuaciones.
- **Yes:** verificación vía build + smoke check manual descartable, sin test runner (no hay ninguno configurado en el proyecto).

## Risks

| Risk                                                                                                                                  | Mitigation                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` ausentes en el entorno de despliegue                                                            | Documentadas en `.env.template`; sin ellas `createClient()` fallaría al primer uso real (auth/queries), pero como esta spec no las invoca desde ninguna pantalla, no rompe el build actual. |
| `.env.local` con secretos reales (`RESEND_API_KEY`, `SUPABASE_DB_PASSWORD`, y ahora las claves de Supabase) se sube por error al repo | Ya está cubierto por `.gitignore` (`.env*` con excepción explícita solo de `.env.template`); esta spec no cambia esa regla.                                                                 |
| Proyecto Supabase vacío hoy (sin tablas ni RLS) — la anon key pública no protege datos que aún no existen                             | Aceptado: el diseño de tablas y políticas RLS se hace en la spec de persistencia de puntuaciones, antes de guardar cualquier dato real.                                                     |

## What is **not** in this spec

- Supabase Auth real (`/auth`, `lib/storage.ts`).
- Persistencia de puntuaciones (`pushScore`/`getScores`).
- Salón de la fama real (`app/salon`, `seededScores`).
- `middleware.ts` de sesión.
- Tablas, migraciones o esquema en Supabase.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
