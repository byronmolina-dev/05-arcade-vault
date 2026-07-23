# Sugerencias de juegos — Arcade Vault

Memoria del agente `game-planner`. Se LEE antes de proponer (para no repetir) y se le AGREGA
una entrada por candidato. No borres entradas: actualiza su **Estado**.

Estados: `propuesto` · `en-spec` · `aceptado` · `rechazado` · `implementado` · `descartado`

<!-- Plantilla de entrada:
## <id-sugerido> — <TÍTULO>
- **Fecha:** YYYY-MM-DD
- **Estado:** propuesto
- **Categoría:** ARCADE|PUZZLE|SHOOTER|VERSUS  ·  **Color:** cyan|magenta|green|yellow
- **Origen:** placeholder existente (`gloton`) | juego nuevo
- **Mecánica (1 frase):** ...
- **Por qué encaja:** (criterios: balance / factibilidad / placeholder-first / novedad)
- **Factibilidad:** canvas 2D + rAF, un componente; riesgos ...
- **Spec:** specs/NN-....md (Borrador) | pendiente
-->

## duelo-pixel — DUELO PIXEL

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** VERSUS · **Color:** cyan
- **Origen:** placeholder existente (`duelo-pixel`)
- **Mecánica (1 frase):** Duelo 1v1 de naves-píxel enfrentadas en los bordes de una arena: mueves en vertical y disparas horizontal contra una IA que persigue y esquiva, por rondas de dificultad creciente.
- **Por qué encaja:** balance → VERSUS es la categoría más flaca (1 sola fila, y es placeholder), mientras ARCADE está saturado (4); placeholder-first → activa una fila que ya existe en `public.games`, sin migración de schema; novedad → es el primer VERSUS jugable y no repite ninguna mecánica de los 4 juegos reales (rebote, caída de piezas, grid de serpiente, vuelo con inercia); factibilidad → canvas 2D + rAF, un solo componente, oponente por IA local (sin multiplayer en red).
- **Factibilidad:** canvas 2D + rAF, un componente `DueloPixelGame.tsx`; el "versus" se resuelve con IA local (no networking, no física 3D, no assets pesados). Riesgo: la IA debe sentirse justa y escalar por ronda sin volverse imposible — se acota con parámetros de dificultad por nivel. Reutiliza el 4to stat `hearts` ya existente en `GamePlayerClient` (vidas = derrotas permitidas) y `onLevelChange` (ronda).
- **Spec:** specs/10-juego-duelo-pixel.md (Borrador)

## invasores — INVASORES

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** SHOOTER · **Color:** green
- **Origen:** placeholder existente (`invasores`)
- **Mecánica (1 frase):** Space Invaders clásico: una batería en la base barre horizontal y dispara a una formación de invasores que desciende por oleadas, con búnkeres destructibles.
- **Por qué encaja:** placeholder-first → fila ya existente en `public.games`, sin migración; novedad → mecánica de formación descendente distinta a Asteroides (vuelo libre con inercia); factibilidad → canvas 2D + rAF, un componente, patrón idéntico a los juegos reales. Contra: balance → SHOOTER ya tiene un juego real (Asteroides), así que cede prioridad frente a VERSUS que está más vacío; por eso queda como candidato secundario, no principal.
- **Factibilidad:** canvas 2D + rAF, un componente `InvasoresGame.tsx`; puntaje muy apto para leaderboard (puntos por invasor + oleadas). Riesgo bajo: mecánica muy conocida y contenida.
- **Spec:** specs/13-juego-invasores.md (Borrador)

## gloton — GLOTÓN

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** ARCADE · **Color:** yellow
- **Origen:** placeholder existente (`gloton`)
- **Mecánica (1 frase):** Comelón estilo laberinto: devora todos los pellets de un laberinto fijo esquivando perseguidores, con píldoras de poder que invierten la caza (comer fantasmas asustados por puntos escalados) y niveles que aceleran a los enemigos.
- **Por qué encaja:** placeholder-first → fila ya existente en `public.games` (`cover-glot`, `yellow`, `ARCADE`), sin migración de schema; novedad → laberinto + IA perseguidora + inversión de roles por píldora, mecánica que no repite Bloque Buster (rebote), Serpentina (serpiente en grilla abierta), Asteroides, Tetris ni `duelo-pixel`/`invasores`; balance → es un tercer ARCADE (categoría saturada), pero su categoría está fija en la fila y reasignarla exigiría migración, contradiciendo el placeholder-first; el hueco de VERSUS ya lo cubre `duelo-pixel`; factibilidad → canvas 2D + rAF, un componente, IA local sin networking ni assets.
- **Factibilidad:** canvas 2D + rAF, un componente `GlotonGame.tsx`; render 100% vectorial (glotón=arco, fantasmas=cápsulas, pellets=puntos), movimiento por grid con acumulador de tiempo (patrón SPEC 09), reutiliza el 4to stat `hearts` (3 vidas) y `onLevelChange`. Riesgos: IA greedy debe sentirse justa (se acota por nivel), y el `MAZE` a mano debe validarse para que no queden pellets inaccesibles. Puntaje acumulativo apto para leaderboard real en Supabase.
- **Spec:** specs/11-juego-gloton.md (Borrador)

## ranaria — RANARIA

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** ARCADE · **Color:** green
- **Origen:** placeholder existente (`ranaria`)
- **Mecánica (1 frase):** Frogger clásico en grid: una rana salta por celdas esquivando carriles de coches en la autopista y montándose en troncos a la deriva en el río, hasta llenar los 5 nenúfares antes de que se acabe el tiempo.
- **Por qué encaja:** placeholder-first → fila ya existente en `public.games` (ARCADE/green/`cover-rana`), sin migración de schema ni id nuevo; balance → ARCADE está saturado, pero aplica la excepción de "otro ARCADE con mecánica claramente distinta": cruzar carriles montándose en plataformas móviles no se solapa con Bloque Buster (paleta/pelota) ni Serpentina (grid de serpiente); novedad → única mecánica del catálogo con avance vertical hacia una meta sorteando tráfico lateral, distinta también de `duelo-pixel` (VERSUS 1v1) e `invasores` (shooter de formación); factibilidad → canvas 2D + rAF, un componente, reutiliza el 4to stat `hearts` sin generalizar el HUD.
- **Factibilidad:** canvas 2D + rAF, un componente `RanariaGame.tsx` con grid 20×15; render 100% vectorial (sin assets provistos). Reutiliza vidas (corazones) ya soportadas desde SPEC 05/09, `onLivesChange`/`onLevelChange`/`onScoreChange`/`onGameOver` estándar, y `insertScore` para leaderboard real. Riesgo bajo: ajustar el solape "montarse en tronco" y el clamp de velocidad por nivel, ambos afinables en prueba manual.
- **Spec:** specs/12-juego-ranaria.md (Borrador)

## defensa-orbital — DEFENSA ORBITAL

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** SHOOTER · **Color:** magenta
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Missile Command clásico: apuntas una mira con el ratón y disparas contra-misiles que estallan en un radio para interceptar misiles enemigos que caen sobre tus cúpulas, por oleadas de dificultad creciente.
- **Por qué encaja:** balance → SHOOTER solo tiene 1 juego real (Asteroides) y 1 en spec-borrador (Invasores), así que suma variedad sin saturar ARCADE (4); novedad → mecánica **defensiva** con explosiones de área y apuntado por mira, claramente distinta de Asteroides (vuelo libre con inercia y wrap-around) y de Invasores (formación descendente disparando hacia arriba desde una batería que barre); factibilidad → canvas 2D + rAF, un solo componente, sin networking, física 3D ni assets pesados (render 100% vectorial: cúpulas, misiles con estela, explosiones como círculos que crecen y decrecen); competible → puntaje acumulativo por misil interceptado + bonus por oleada y por cúpula sobreviviente, apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `DefensaOrbitalGame.tsx`; input por ratón (mousemove = mira, click = disparo), primer juego del catálogo con apuntado por ratón — no rompe el patrón (el canvas ya recibe eventos), solo añade variedad de input. Reutiliza el patrón de sub-entidades en arrays (misiles jugador, misiles enemigos, explosiones) con actualización por delta-time. Riesgos: (1) el radio/tiempo de la explosión debe sentirse justo para interceptar varios misiles — afinable por constantes; (2) el 4to stat del HUD debe generalizarse para mostrar "Cúpulas" (número de domos vivos, no corazones ni "Líneas"/"Longitud"), mismo tipo de generalización que hizo SPEC 09 para "Longitud". Como es id nuevo: requiere INSERT de la fila en `public.games` y una clase `.cover-defensa` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/16-juego-defensa-orbital.md (Borrador)

## prisma — PRISMA

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** PUZZLE · **Color:** cyan
- **Origen:** juego nuevo (id nuevo, no placeholder)
- **Mecánica (1 frase):** Match-3 sobre tablero 8×8: intercambia dos gemas adyacentes para alinear 3+ del mismo color, las gemas eliminadas caen por gravedad y encadenan cascadas que suben el multiplicador, contra un temporizador que drena más rápido cada nivel.
- **Por qué encaja:** balance → PUZZLE es de las categorías más flacas (solo Tetris real); factibilidad → canvas 2D + rAF, un componente, 100% vectorial (5 tipos de gema con la paleta CRT), sin assets ni backend nuevo más allá de una fila en `public.games`; novedad → intercambio de gemas + cascadas por gravedad no se solapa con Tetris (caída de tetrominós y line-clear), ni con Bloque Buster/Serpentina/Asteroides/`duelo-pixel`/`invasores`/`gloton`/`ranaria`; el puntaje acumulativo con combos es muy apto para leaderboard real y encaja con la estética neón.
- **Factibilidad:** canvas 2D + rAF, un componente `PrismaGame.tsx`; tablero 8×8 de gemas vectoriales, resolución interna del tablero como en los demás juegos. Riesgos: (1) evitar auto-matches al generar el tablero y al reponer gemas — se resuelve rechazando spawns que formen 3 en línea; (2) el temporizador usa acumulador delta-time (mismo patrón/risgo ya documentado en SPEC 09); (3) detección de deadlock (sin swaps válidos) → reshuffle automático para no bloquear la partida. Reutiliza `onScoreChange`/`onLevelChange`/`onGameOver` estándar y agrega un 4to stat "Tiempo" generalizando `FourthStat` (introducido en SPEC 09). Leaderboard real vía `insertScore`.
- **Spec:** specs/15-juego-prisma.md (Borrador)

## estelas — ESTELAS

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** VERSUS · **Color:** magenta
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Motos de luz estilo Tron: dos motos que nunca frenan dejan una estela sólida en una arena de neón, y pierde la ronda quien choque primero contra un borde, su propia estela o la del rival; el "versus" es contra una IA local por rondas de dificultad creciente.
- **Por qué encaja:** balance → VERSUS es de las categorías más flacas (solo `duelo-pixel`, en spec-borrador), así que suma un segundo VERSUS con mecánica distinta sin tocar la saturada ARCADE (4); novedad → estela permanente + acorralamiento (se gana sin disparar) no se solapa con `duelo-pixel` (duelo de disparos horizontal) ni con Serpentina (comer fruta en grid abierto, sin muros permanentes ni oponente), y la estética "motos de neón que pintan muros de luz en una rejilla" calza perfecto con el look CRT/neón (`.crt-screen`, cyan↔magenta); factibilidad → canvas 2D + rAF, un solo componente, IA local (sin networking, física 3D ni assets pesados); competible → puntaje por rondas ganadas (+100/ronda), individual y apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `EstelasGame.tsx`; grid 80×40 (celda 10px) con matriz `occupied`, movimiento por tick con acumulador delta-time (patrón SPEC 09), render 100% vectorial (motos + estelas), reutiliza el 4to stat `hearts` (3 vidas = choques permitidos) y `onLevelChange`/`onScoreChange`/`onLivesChange`/`onGameOver`. Riesgos: (1) la IA debe sentirse justa — se acota con `AiTuning` (`lookahead` + `cutBias`) escalado por ronda con clamp; (2) tick con piso `MIN_TICK_MS` para no volverse imposible; (3) bloqueo de giro 180° igual que Serpentina. Como es id nuevo: requiere INSERT de la fila en `public.games` y una clase `.cover-estelas` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/14-juego-estelas.md (Borrador)

## torre-neon — TORRE NEÓN

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** ARCADE · **Color:** magenta
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Rebote vertical ascendente estilo Doodle Jump: la nave-píxel cae por gravedad y rebota sola al aterrizar; el jugador solo la mueve en horizontal (con wrap-around) para caer sobre plataformas neón procedurales que suben sin fin, aprovechando resortes y plataformas móviles, hasta caer al vacío.
- **Por qué encaja:** balance → ARCADE está saturado (4), pero el lote pide cubrirlo con una mecánica CLARAMENTE distinta de las 4 previas; gravedad continua + auto-salto + scroll vertical procedural no aparece en Bloque Buster (rebote de paleta), Serpentina (grid de serpiente), Gloton (laberinto Pac-Man) ni Ranaria (cruce de carriles Frogger), ni en ningún spec 05-13; novedad → único juego del catálogo con física de plataformas y ascenso infinito; factibilidad → canvas 2D + rAF, un componente, render 100% vectorial, sin networking/3D/assets; competible → puntaje = altura máxima (10 pts/metro) + bono de resorte, muy apto para leaderboard real.
- **Factibilidad:** canvas 2D + rAF, un componente `TorreNeonGame.tsx` (480×640 vertical, `devicePixelRatio` como Bloque Buster/Serpentina). Reutiliza la generalización `FourthStat` de SPEC 09 añadiendo el kind `"height"` (label "Altura", metros). Riesgos: (1) tunneling de la nave a través de plataformas delgadas a bajo framerate → colisión por barrido/sub-stepping; (2) evitar "muros imposibles" fijando `GAP_MAX` por debajo del alcance del rebote base. Como es id nuevo: requiere INSERT de la fila en `public.games` (`cover-torre`, `magenta`, `ARCADE`) y una clase `.cover-torre` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/17-juego-torre-neon.md (Borrador)

## fusion — FUSIÓN

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** PUZZLE · **Color:** yellow
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Deslizamiento-fusión estilo 2048 sobre tablero 4×4: desliza todas las fichas de energía en una de 4 direcciones, dos fichas del mismo valor se fusionan doblando su potencia, cada movimiento aparece una ficha nueva, y la partida termina cuando el tablero se llena sin ninguna fusión posible.
- **Por qué encaja:** balance → PUZZLE es de las categorías más flacas (solo Tetris real; Prisma es borrador de lote 1), así que suma variedad sin tocar la saturada ARCADE (4); novedad → el deslizamiento-fusión (mover todo el tablero + merge por duplicación) es turn-based, sin piezas que caen ni line-clear (Tetris) y sin intercambio de gemas adyacentes ni cascadas por gravedad (Prisma, spec 15), así que no se solapa con ninguna mecánica del catálogo ni de las 7 sugerencias previas (`duelo-pixel`/`invasores`/`gloton`/`ranaria`/`defensa-orbital`/`estelas`/`torre-neon`); estética → fichas numéricas que brillan y suben de tier calzan con el look CRT/neón (`.crt-screen`); competible → puntaje acumulativo endless (suma del valor de cada fusión), muy apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `FusionGame.tsx`; tablero 4×4 (fichas 120px, 480×480 centrado en canvas interno 800×600) con ajuste `devicePixelRatio` (patrón Bloque Buster/Serpentina/Prisma) para que el texto de las fichas se vea nítido; render 100% vectorial (fichas redondeadas con número, color por tier), input por teclado (`←↑↓→`), sin networking, física 3D ni assets. Reutiliza `onScoreChange`/`onLevelChange`/`onGameOver` estándar, añade `onMaxTileChange` y generaliza el 4to stat `FourthStat` (SPEC 09) con `{ kind: "max" }` → label "Máximo" = ficha más alta. Riesgos: (1) el "nivel" no modula dificultad (juego turn-based sin timer) sino que es un tier de progreso ligado al máximo alcanzado — se documenta como decisión; (2) detección de fin (tablero lleno + sin fusiones adyacentes en ninguna dirección) debe ser exacta para no cerrar la partida con movimientos aún posibles. Como es id nuevo: requiere INSERT de la fila en `public.games` (`cover-fusion`, `yellow`, `PUZZLE`) y una clase `.cover-fusion` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/19-juego-fusion.md (Borrador)

## caza-neon — CAZA NEÓN

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** SHOOTER · **Color:** cyan
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Matamarcianos de scroll vertical estilo Raiden/1942: pilotas una nave-caza que avanza por un campo estelar que hace scroll hacia abajo, mueves en las 4 direcciones dentro del área de juego, disparas en ráfaga automática hacia arriba y esquivas las balas de oleadas de enemigos que entran volando en patrones, con un jefe cada varias oleadas.
- **Por qué encaja:** balance → mi categoría asignada del lote es SHOOTER y este es el arquetipo canónico de shooter arcade que aún falta (con este, SHOOTER queda en 4, igual que ARCADE); novedad → scroll vertical continuo + esquive de balas enemigas (bullet-hell ligero) + enemigos que entran y salen volando en patrones + jefe, mecánica claramente distinta de Asteroides (vuelo libre con inercia, rotación y wrap), de Invasores (formación estática que marcha en bloque de lado a lado con búnkeres) y de Defensa Orbital (defensivo, apuntado con ratón y explosiones de área); input por teclado que refuerza el contraste con el ratón de Defensa Orbital; factibilidad → canvas 2D + rAF, un solo componente, render 100% vectorial (nave, enemigos, balas, estelas y campo estelar como puntos), sin networking, física 3D ni assets; competible → puntaje acumulativo por enemigo destruido + bonus de fin de oleada + bonus por jefe, muy apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `CazaNeonGame.tsx` (resolución interna vertical 480×640 con ajuste por `devicePixelRatio`, mismo patrón que Bloque Buster/Serpentina/Torre Neón). Reutiliza el 4to stat `hearts` ya soportado (3 vidas, sin generalizar el HUD) y los callbacks estándar `onScoreChange`/`onLivesChange`/`onLevelChange`(oleada)/`onGameOver`. Patrón de sub-entidades en arrays (balas jugador, enemigos, balas enemigas) con actualización por delta-time, como Defensa Orbital. Riesgos: (1) la densidad de balas debe ser esquivable — se acota con cadencia y velocidad de bala por oleada más una breve invulnerabilidad tras cada golpe; (2) evitar tunneling de balas rápidas contra la nave a bajo framerate → colisión por AABB con margen y sub-stepping si hace falta; (3) el jefe debe tener HP y patrón contenidos para no eternizar la partida. Como es id nuevo: requiere INSERT de la fila en `public.games` (`cover-caza`, `cyan`, `SHOOTER`) y una clase `.cover-caza` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/20-juego-caza-neon.md (Borrador)

## raqueta — RAQUETA

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** VERSUS · **Color:** green
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Pong de neón 1v1: mueves una paleta en vertical contra una IA rival en el borde opuesto y golpeas una pelota que rebota entre ambos, sumando punto cada vez que la IA falla y perdiendo vida cada vez que fallas tú, con la pelota y la IA acelerando por nivel.
- **Por qué encaja:** balance → VERSUS es la categoría más flaca (solo `duelo-pixel` y `estelas`, ambos en spec-borrador), así que suma un tercer VERSUS con mecánica distinta sin tocar la saturada ARCADE (4); novedad → duelo de paletas con pelota que viaja en ambos sentidos y cualquiera de los dos lados puede conceder el punto, claramente distinto de `duelo-pixel` (duelo de disparos horizontal) y de `estelas` (estela permanente + acorralamiento sin disparos), y también de `bloque-buster` (breakout de UNA sola paleta que rompe muros, sin rival); la estética de dos paletas y una pelota de neón sobre fondo negro con línea central punteada es el arquetipo CRT/arcade; factibilidad → canvas 2D + rAF, un solo componente, IA local (sin networking, física 3D ni assets); competible → puntaje acumulativo por punto ganado a la IA, individual y apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `RaquetaGame.tsx` (render 100% vectorial: dos paletas, pelota, línea central, fondo negro), física simple de rebote continuo pixel-a-pixel con velocidad en px/frame (patrón Bloque Buster, SPEC 08) — no necesita grid ni acumulador de tick. Reutiliza el 4to stat `hearts` (3 vidas = fallos permitidos) y `onLevelChange`/`onScoreChange`/`onLivesChange`/`onGameOver`. Riesgos: (1) la IA de la paleta debe sentirse justa — se acota con velocidad de seguimiento y "zona muerta" de reacción escaladas por nivel con clamp, para que sea batible pero no trivial; (2) evitar rebotes casi horizontales que hagan eterna la pelota → clamp del ángulo mínimo vertical y speed-up progresivo por golpe. Como es id nuevo: requiere INSERT de la fila en `public.games` y una clase `.cover-raqueta` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/18-juego-raqueta.md (Borrador)

## circuito — CIRCUITO

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** PUZZLE · **Color:** green
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Enrutamiento de flujo estilo Pipe Mania sobre una grilla: desde una fuente de energía, colocas y rotas piezas de conducto tomadas de una cola para tender el camino más largo posible antes de que el flujo (que avanza celda a celda tras una cuenta atrás) alcance el final del trazado y se derrame; el flujo acelera por nivel.
- **Por qué encaja:** balance → PUZZLE es de las categorías más flacas (solo Tetris real; `prisma` y `fusion` son borradores de lotes previos), así que suma variedad sin tocar la saturada ARCADE (4); novedad → el enrutamiento de conductos en tiempo real (planificar un trazado bajo presión de un flujo que avanza) es una mecánica de tercer tipo dentro de PUZZLE, sin solaparse con Tetris (caída de tetrominós + line-clear), con `prisma` (intercambio de gemas adyacentes + cascadas) ni con `fusion` (deslizamiento-fusión 2048 turn-based); estética → tubos de neón que se encienden al pasar la energía calzan de lleno con el look CRT/circuito (`.crt-screen`, flujo verde eléctrico); competible → puntaje acumulativo por conducto atravesado + bonos por cruces y por rachas largas, endless con dificultad por nivel, muy apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `CircuitoGame.tsx`; grilla 12×9 de celdas 48px (576×432) centrada en canvas interno 800×600 con ajuste `devicePixelRatio` (patrón Bloque Buster/Serpentina/Prisma), render 100% vectorial (conductos como segmentos redondeados, flujo como relleno que avanza dentro del tubo, cursor y cola de próximas piezas), input por teclado (`←↑↓→` mueven cursor, `R`/rotación de la pieza en mano, `Espacio`/`Enter` coloca) y puntero (clic en celda para colocar). El avance del flujo usa acumulador delta-time (patrón SPEC 09), desacoplado del render. Reutiliza `onScoreChange`/`onLevelChange`/`onGameOver` estándar, agrega `onPipesChange` (nuevo callback, mismo naming `on<Cosa>Change`) y generaliza el 4to stat `FourthStat` (SPEC 09/15) con `{ kind: "pipes" }` → label "Tubos" = conductos atravesados por el flujo. Sin concepto de vidas (no `onLivesChange`). Riesgos: (1) detección de conexión entre celdas (mapa de aperturas por lado de cada pieza y orientación) debe ser exacta para no cortar o alargar el flujo indebidamente — se acota con una tabla de conectividad por tipo+rotación; (2) el ritmo del flujo vs. la cuenta atrás inicial debe dar tiempo a planificar sin volverse trivial — afinable por constantes de velocidad y delay por nivel con clamp; (3) piezas "cruce" atravesables dos veces necesitan marcar por-lado qué segmento ya se llenó para el bono. Como es id nuevo: requiere INSERT de la fila en `public.games` (`cover-circuito`, `green`, `PUZZLE`) y una clase `.cover-circuito` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/22-juego-circuito.md (Borrador)

## tanques — TANQUES

- **Fecha:** 2026-07-23
- **Estado:** en-spec
- **Categoría:** VERSUS · **Color:** yellow
- **Origen:** juego nuevo (id nuevo, no placeholder — los 4 placeholders ya están tomados en specs 10-13)
- **Mecánica (1 frase):** Duelo de tanques estilo Combat/Atari 1v1 en una arena de neón con muros: cada tanque avanza y rota en 2D, dispara proyectiles que rebotan en las paredes, y gana la ronda quien acierte primero al rival, contra una IA local por rondas de dificultad creciente.
- **Por qué encaja:** balance → VERSUS es la categoría más flaca (`duelo-pixel`, `estelas`, `raqueta`, todos en spec-borrador), así que este sería el 4to VERSUS y dejaría la categoría a la par de ARCADE (4) y SHOOTER (4), sin tocar la saturada ARCADE; novedad → navegación 2D libre con rotación en una arena de muros + proyectiles que ricochetean en las paredes es una mecánica claramente distinta de `duelo-pixel` (posiciones fijas en los bordes, disparo horizontal directo, sin muros ni movimiento 2D), de `estelas` (sin disparos, se gana por acorralamiento con estela permanente) y de `raqueta` (paletas + pelota, sin disparos ni desplazamiento libre); la estética de dos tanques vectoriales y balas que rebotan en muros de neón sobre fondo negro calza con el look CRT/arcade (`.crt-screen`); factibilidad → canvas 2D + rAF, un solo componente, IA local (sin networking, física 3D ni assets pesados); competible → puntaje acumulativo por ronda ganada (+100/ronda), individual y apto para leaderboard real en Supabase.
- **Factibilidad:** canvas 2D + rAF, un componente `TanquesGame.tsx` (render 100% vectorial: dos tanques como cuerpo + cañón, muros como rectángulos, balas como puntos con estela corta), física continua px/frame (patrón Bloque Buster, SPEC 08) — rotación por ángulo, avance en la dirección del cañón, rebote de bala por reflexión de eje contra muros/bordes. Reutiliza el 4to stat `hearts` (3 vidas = impactos recibidos permitidos) y `onLevelChange`(ronda)/`onScoreChange`/`onLivesChange`/`onGameOver`. Riesgos: (1) la IA debe sentirse justa — se acota con parámetros por ronda (agresividad de persecución, precisión de puntería, cadencia de disparo) con clamp; (2) las balas con rebote deben expirar (límite de rebotes o TTL) para no saturar la arena; (3) colisión bala↔tanque/muro por AABB con posible sub-stepping para evitar tunneling de balas rápidas. Como es id nuevo: requiere INSERT de la fila en `public.games` (`cover-tanques`, `yellow`, `VERSUS`) y una clase `.cover-tanques` en `globals.css`, documentados como pasos pendientes del spec (el planner no ejecuta migraciones).
- **Spec:** specs/21-juego-tanques.md (Borrador)
