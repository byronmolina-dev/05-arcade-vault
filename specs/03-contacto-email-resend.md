# SPEC 03 — Envío de correo del formulario de contacto (Resend)

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-07-18
> **Objective:** Conectar el formulario de contacto de `/about` a un envío de correo real vía Resend, a través de un Route Handler (`app/api/contact/route.ts`), agregando estados de carga y error en la UI sin cambiar el diseño visual existente.

## Scope

**In:**

- Route Handler `app/api/contact/route.ts` (`POST`) que recibe `{ name, email, msg }`, valida los tres campos en servidor (no vacíos, email con formato válido), y usa el SDK de `resend` para enviar un correo con:
  - `from`: dominio de pruebas de Resend (`onboarding@resend.dev`).
  - `to`: dirección tomada de la variable de entorno `CONTACT_TO_EMAIL`.
  - `reply-to`: el email ingresado por el usuario en el formulario.
  - Asunto: `Nuevo mensaje de contacto – {nombre}`.
  - Cuerpo en HTML con estilo básico (nombre, email y mensaje).
- Dependencia `resend` agregada a `package.json`.
- Variables de entorno `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, documentadas en un nuevo `.env.example` (sin valores reales).
- Actualización de `app/about/page.tsx`: el `onSubmit` del formulario pasa de simular el envío en el propio cliente a hacer `fetch("/api/contact")`, agregando:
  - Estado de carga mientras se espera la respuesta (botón deshabilitado con texto de progreso).
  - Estado de error inline dentro del formulario si la respuesta falla (validación de servidor o error de Resend), sin perder los valores ya escritos por el usuario.
  - El mensaje de éxito estilo terminal solo se muestra si el `POST` responde OK.
- Manejo de errores en el Route Handler: si `resend.emails.send` falla o lanza, responder `500` con un mensaje de error genérico (sin filtrar detalles internos de Resend al cliente).

**Out of scope (para futuras specs):**

- Protección anti-spam (honeypot, captcha, rate limiting).
- Persistencia de los mensajes enviados (base de datos, logs estructurados, panel de administración).
- Plantillas de correo con el sistema de diseño completo del proyecto (solo HTML básico).
- Notificaciones de confirmación al usuario que llenó el formulario (correo de "recibimos tu mensaje").
- Verificación de dominio propio en Resend (se usa el dominio de pruebas `onboarding@resend.dev`).
- Tests automatizados.

## Data model

Esta feature no agrega datos a `lib/types.ts` ni a `data/`. Introduce únicamente los tipos locales del Route Handler y el contrato de request/response entre el cliente (`app/about/page.tsx`) y `app/api/contact/route.ts`.

```ts
// app/api/contact/route.ts (local, no exportado)
type ContactRequestBody = { name: string; email: string; msg: string };

type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };
```

Reglas de validación en servidor (400 si fallan):

- `name`, `email`, `msg`: no vacíos tras `trim()`.
- `email`: coincide con un patrón simple de email (`algo@algo.algo`).

**Variables de entorno** (`.env.example`, sin valores reales; `.env.local` real no se versiona):

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y crear `.env.example` con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` vacíos, como documentación de las variables requeridas. No cambia el comportamiento actual de la app.
2. Crear `app/api/contact/route.ts` con el handler `POST`: parsear el body JSON, validar `name`/`email`/`msg` (no vacíos, email con formato válido) respondiendo `400` con `{ ok: false, error }` si falla la validación; instanciar `Resend` con `process.env.RESEND_API_KEY` y llamar `resend.emails.send` con `from` (dominio de pruebas), `to` (`process.env.CONTACT_TO_EMAIL`), `reply-to` (email del formulario), asunto y cuerpo HTML básico; responder `{ ok: true }` en éxito o `500` con `{ ok: false, error }` genérico si `resend.emails.send` falla. Todavía no se invoca desde ningún componente; el resto de la app sigue igual.
3. Actualizar `app/about/page.tsx`: agregar estados `sending` (boolean) y `error` (string | null) junto a los existentes `form`/`sent`/`shake`; cambiar `onSubmit` para, tras pasar la validación de cliente, hacer `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`, mostrando el botón en estado de carga mientras espera, seteando `sent` solo si la respuesta es `ok`, o `error` con el mensaje devuelto si falla. El formulario conserva los valores escritos en caso de error.
4. Pasada final: verificar el caso feliz (correo real recibido en `CONTACT_TO_EMAIL` vía Resend, con reply-to al email ingresado), el caso de validación de cliente (shake con campos vacíos), el caso de validación de servidor (llamando el endpoint con datos inválidos), y el caso de error real de Resend (ej. `RESEND_API_KEY` inválida) mostrando el mensaje de error inline sin perder el texto ya escrito en el formulario.

## Acceptance criteria

- [ ] Enviar el formulario de contacto en `/about` con nombre, email y mensaje válidos hace un `POST` a `/api/contact` y, si Resend responde OK, llega un correo real a la dirección configurada en `CONTACT_TO_EMAIL` con `reply-to` igual al email ingresado.
- [ ] El correo recibido tiene el asunto `Nuevo mensaje de contacto – {nombre}` y un cuerpo HTML con el nombre, email y mensaje enviados.
- [ ] Mientras se espera la respuesta del `fetch`, el botón de envío muestra un estado de carga (deshabilitado + texto de progreso) y no se puede volver a enviar el formulario.
- [ ] Enviar el formulario con algún campo vacío sigue disparando la animación "shake" en cliente, sin llegar a hacer `fetch` a `/api/contact`.
- [ ] Un `POST` directo a `/api/contact` con `name`, `email` o `msg` vacío (o `email` con formato inválido) responde `400` con `{ ok: false, error }`.
- [ ] Un `POST` válido a `/api/contact` responde `200` con `{ ok: true }` cuando Resend confirma el envío.
- [ ] Si `resend.emails.send` falla (ej. `RESEND_API_KEY` inválida o vacía), `/api/contact` responde `500` con `{ ok: false, error }` sin exponer detalles internos de Resend.
- [ ] Si el `fetch` desde `/about` falla o responde con error, se muestra un mensaje de error inline en el formulario, no se muestra el mensaje de éxito estilo terminal, y los valores ya escritos por el usuario se conservan.
- [ ] Tras un envío exitoso, se muestra el mensaje de éxito estilo terminal existente, y "ENVIAR OTRO MENSAJE" vuelve a mostrar el formulario vacío, igual que hoy.
- [ ] `RESEND_API_KEY` y `CONTACT_TO_EMAIL` están documentadas en `.env.example` y no están hardcodeadas en el código.

## Decisions

- **Yes:** Route Handler (`app/api/contact/route.ts`) en vez de Server Action. Mantiene `about/page.tsx` como componente cliente con `fetch`, cambiando menos la estructura actual del formulario que migrar a `action`/`useActionState`.
- **No:** Server Action con `'use server'`. Habría requerido adaptar el formulario a `form action`/`useActionState`, un cambio de estructura mayor sin beneficio adicional para este caso simple.
- **Yes:** dirección destino configurable vía `CONTACT_TO_EMAIL` en variable de entorno. Evita hardcodear un correo real en el código versionado.
- **No:** dirección hardcodeada en el código. Menos flexible y expone el correo real en el repositorio.
- **Yes:** remitente con el dominio de pruebas de Resend (`onboarding@resend.dev`). No hay dominio propio verificado en Resend todavía; permite enviar correos sin configuración adicional de DNS.
- **No:** dominio propio verificado. Fuera de alcance de esta spec — requeriría acceso a DNS del dominio del proyecto.
- **Yes:** validación de campos también en el Route Handler, además de la validación de cliente ya existente. El endpoint queda expuesto públicamente y no debe depender solo de la validación del formulario.
- **No:** confiar solo en la validación de cliente. Cualquiera podría llamar a `/api/contact` directamente con datos vacíos o inválidos.
- **Yes:** cuerpo del correo en HTML con estilo básico. Más legible que texto plano y coherente con que el proyecto ya tiene una identidad visual definida.
- **No:** texto plano simple. Se prefirió HTML por legibilidad, aunque implica un poco más de código en el Route Handler.
- **Yes:** `reply-to` con el email ingresado por el usuario. Permite responder directamente desde el cliente de correo del equipo sin copiar el email del cuerpo del mensaje.
- **No:** omitir `reply-to`. Añadiría fricción innecesaria para responder a quien escribió.
- **Yes:** estados de carga y error inline en el formulario (en vez de éxito/fracaso simple sin loading). Da feedback claro al usuario durante una operación de red real, que antes era instantánea y simulada.
- **No:** mantener el comportamiento simulado anterior (sin loading, sin manejo de error de red). Ya no aplica una vez que el envío es real y puede fallar (red, Resend caído, clave inválida).
- **Yes:** sin protección anti-spam (honeypot/captcha/rate limiting) en esta spec. Mantiene el alcance enfocado en conectar el envío; se evalúa en una spec futura si se detecta abuso real.
- **No:** agregar honeypot ahora. No fue solicitado y añadiría alcance no esencial para conectar el envío de correo.
- **Yes:** `.env.example` con las variables vacías como documentación. Facilita que cualquiera que clone el repo sepa qué variables debe configurar.
- **No:** omitir `.env.example`. Dejaría las variables requeridas sin documentar en el repositorio.

## Risks

| Risk | Mitigation |
|---|---|
| `RESEND_API_KEY` no configurada o inválida en el entorno de despliegue | El Route Handler captura el error de `resend.emails.send` en un `try/catch` y responde `500` con mensaje genérico; el formulario muestra error inline en vez de romper la página. |
| Dominio de pruebas `onboarding@resend.dev` tiene límites de envío y puede terminar en spam del destinatario | Aceptado para esta spec (MVP); migrar a dominio propio verificado queda para una spec futura si se necesita mayor entregabilidad. |
| Llamadas directas a `/api/contact` sin pasar por el formulario (bots, scripts) | Mitigado parcialmente por la validación de servidor (400 en datos inválidos); protección anti-spam adicional (rate limiting, honeypot) queda fuera de alcance de esta spec. |
| Falla de red entre el cliente y `/api/contact` (offline, timeout) | El `fetch` en `about/page.tsx` maneja el `catch` mostrando el mismo estado de error inline que un `500` del servidor. |

## What is **not** in this spec

- Protección anti-spam (honeypot, captcha, rate limiting).
- Persistencia de los mensajes enviados (base de datos, logs, panel de administración).
- Plantillas de correo con el sistema de diseño completo del proyecto.
- Notificaciones de confirmación al usuario que llenó el formulario.
- Verificación de dominio propio en Resend.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.
