// Sistema de skins de color para los juegos de Arcade Vault.
// Cada juego formaliza sus colores hardcoded en 3 paletas: clasico (default,
// = look actual sin regresion), retro (monocromatico fosforo CRT) y neon
// (alta saturacion reutilizando las variables de app/globals.css + glow).
//
// Convenciones (mantener consistentes entre juegos):
//  - `clasico` siempre es el default y reproduce el look actual del juego.
//  - `retro` usa un solo hue (ambar/verde fosforo) sobre fondo casi negro.
//  - `neon` reutiliza --cyan/--magenta/--yellow/--green y activa glow.

export type SkinId = "clasico" | "retro" | "neon";

export const SKIN_IDS: SkinId[] = ["clasico", "retro", "neon"];

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  retro: "RETRO",
  neon: "NEÓN",
};

// Ids de juegos que ya pasaron por el sistema de skins (el selector en
// GamePlayerClient solo se muestra para estos). Agregar aqui cada juego nuevo.
export const SKINNED_GAME_IDS: string[] = ["tetris", "asteroides"];

// ===== Tetris =====
// Roles de color identificados en components/games/TetrisGame.tsx:
//  - bg: fondo del canvas (`#000`)
//  - grid: lineas de cuadricula (`rgba(255,255,255,0.08)`)
//  - pieces: los 8 colores de tetromino (indice 1..8, 0 = null)
//  - blockHighlight: brillo superior de cada bloque (`rgba(255,255,255,0.12)`)
//  - panelLine: divisor del panel + recuadro NEXT (`rgba(255,255,255,0.15)`)
//  - hudLabel: etiquetas del HUD interno (`rgba(255,255,255,0.5)`)
//  - hud: valores del HUD interno (`#fff`)
//  - glow: activa ctx.shadowBlur en la pieza activa (solo neon)
export type TetrisPalette = {
  bg: string;
  grid: string;
  blockHighlight: string;
  panelLine: string;
  hudLabel: string;
  hud: string;
  glow: boolean;
  // indice 1..8 mapea a I, O, T, S, Z, J, L, N; 0 = null (celda vacia)
  pieces: readonly (string | null)[];
};

export const TETRIS_SKINS: Record<SkinId, TetrisPalette> = {
  // Look actual del juego, formalizado. Cero regresion visual.
  clasico: {
    bg: "#000",
    grid: "rgba(255,255,255,0.08)",
    blockHighlight: "rgba(255,255,255,0.12)",
    panelLine: "rgba(255,255,255,0.15)",
    hudLabel: "rgba(255,255,255,0.5)",
    hud: "#fff",
    glow: false,
    pieces: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca (gris metalico)
    ],
  },
  // Monocromatico ambar fosforo CRT sobre fondo casi negro calido.
  // Las piezas varian solo en brillo del mismo hue (~40deg) para seguir
  // siendo distinguibles sin romper el look de un solo tono.
  retro: {
    bg: "#0a0600",
    grid: "rgba(255,176,0,0.10)",
    blockHighlight: "rgba(255,224,150,0.18)",
    panelLine: "rgba(255,176,0,0.22)",
    hudLabel: "rgba(255,176,0,0.55)",
    hud: "#ffcf70", // ambar claro, alto contraste sobre fondo casi negro
    glow: false,
    pieces: [
      null,
      "#ffcf70", // I
      "#ffb000", // O
      "#ffa030", // T
      "#e89000", // S
      "#ffc050", // Z
      "#d17e00", // J
      "#ffdf90", // L
      "#b56b00", // N
    ],
  },
  // Alta saturacion. Reutiliza --cyan/--magenta/--yellow/--green de
  // app/globals.css para I/O/T/S; anade neones brillantes para Z/J/L/N
  // (el sitio solo define 4 variables y Tetris necesita 8 piezas).
  // glow: true -> shadowBlur solo en la pieza activa (no en toda la grilla).
  neon: {
    bg: "#05050a",
    grid: "rgba(0,245,255,0.10)",
    blockHighlight: "rgba(255,255,255,0.18)",
    panelLine: "rgba(0,245,255,0.25)",
    hudLabel: "rgba(0,245,255,0.6)",
    hud: "#00f5ff", // cyan, alto contraste sobre fondo casi negro
    glow: true,
    pieces: [
      null,
      "#00f5ff", // I - --cyan
      "#f5ff00", // O - --yellow
      "#ff006e", // T - --magenta
      "#00ff88", // S - --green
      "#ff2d55", // Z - rojo neon
      "#2d7bff", // J - azul neon
      "#ff9500", // L - naranja neon
      "#c724ff", // N - violeta neon
    ],
  },
};

// ===== Asteroides =====
// Roles de color identificados en components/games/AsteroidsGame.tsx:
//  - bg: fondo del canvas (`#000`)
//  - ship: silueta de la nave (`#fff`, stroke) [primary]
//  - thrust: llama del propulsor (`rgba(255,130,0,0.85)`, stroke)
//  - bullet: disparos (`#fff`, fill) [accent]
//  - asteroid: contorno de los asteroides (`#fff`, stroke) [secondary]
//  - powerup: rombo + etiqueta "3x" del power-up (`#0ff`) [accent]
//  - particle: canales "r,g,b" de las particulas de explosion (blanco con
//    alpha variable, `rgba(255,255,255,alpha)`); se compone con el alpha vivo
//  - hud: texto del HUD interno + iconos de vida (`#fff`)
//  - hudAccent: indicador "3x  Ns" del HUD interno (`#0ff`)
//  - glow: activa ctx.shadowBlur en nave/disparos/power-up (solo neon)
export type AsteroidsPalette = {
  bg: string;
  ship: string;
  thrust: string;
  bullet: string;
  asteroid: string;
  powerup: string;
  particle: string; // solo canales "r,g,b"; el alpha lo pone el componente
  hud: string;
  hudAccent: string;
  glow: boolean;
};

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  // Look actual del juego, formalizado. Cero regresion visual (todo blanco
  // sobre negro, power-up y su indicador HUD en cyan, llama naranja).
  clasico: {
    bg: "#000",
    ship: "#fff",
    thrust: "rgba(255,130,0,0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerup: "#0ff",
    particle: "255,255,255",
    hud: "#fff",
    hudAccent: "#0ff",
    glow: false,
  },
  // Monocromatico verde fosforo estilo monitor vectorial de arcade viejo
  // (el Asteroids original corria en un CRT vectorial verdoso). Un solo hue:
  // la nave/disparos mas brillantes, asteroides mas apagados, power-up el mas
  // claro para que resalte sin salirse del tono.
  retro: {
    bg: "#000600",
    ship: "#66ff66",
    thrust: "rgba(140,255,140,0.85)",
    bullet: "#c6ffc6",
    asteroid: "#33c944",
    powerup: "#d6ffd6",
    particle: "140,255,140",
    hud: "#66ff66", // verde fosforo claro, alto contraste sobre fondo casi negro
    hudAccent: "#d6ffd6",
    glow: false,
  },
  // Alta saturacion reutilizando las variables de app/globals.css:
  // nave --cyan, disparos --yellow, asteroides --magenta (hostil), power-up
  // --green. glow: true -> shadowBlur solo en nave/disparos/power-up (los
  // elementos activos, pocos en pantalla), no en asteroides ni particulas.
  neon: {
    bg: "#05050a",
    ship: "#00f5ff", // --cyan
    thrust: "rgba(255,0,110,0.9)", // --magenta
    bullet: "#f5ff00", // --yellow
    asteroid: "#ff006e", // --magenta
    powerup: "#00ff88", // --green
    particle: "255,45,85", // rojo neon para las explosiones
    hud: "#00f5ff", // cyan, alto contraste sobre fondo casi negro
    hudAccent: "#00ff88",
    glow: true,
  },
};
