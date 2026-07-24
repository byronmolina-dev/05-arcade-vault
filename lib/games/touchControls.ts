// Registro de controles táctiles por juego para Arcade Vault.
// Mismo patrón de registro compartido que lib/games/skins.ts: cada entrada
// de TOUCH_CONTROLS_CONFIG describe, para un game.id, qué botones de D-pad
// (abajo-izquierda) y de acciones (abajo-derecha) se muestran en
// components/games/TouchControls.tsx, y a qué KeyboardEvent.code dispara
// cada uno sobre `window` (mismos codes que ya leen los juegos reales).
//
// Cuando se active un placeholder (specs 10-22, aún no implementadas) y
// pase a tener jugabilidad real, agregar aquí su propia entrada con el
// mapeo de botones correspondiente — no hace falta tocar TouchControls.tsx
// ni GamePlayerClient.tsx, solo esta config.

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
  // "classic" (default si se omite) = los dos clusters flotantes originales
  // de esta spec. "gamepad" = el mismo dpad/actions pero renderizados como
  // un panel unico estilo control (D-pad + botones A/B circulares), ver
  // TouchControls.tsx. Reusa exactamente los mismos TouchButtonConfig — solo
  // cambia la presentacion visual, no el mapeo de teclas ni el auto-repeat.
  variant?: "classic" | "gamepad";
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
    variant: "gamepad",
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
