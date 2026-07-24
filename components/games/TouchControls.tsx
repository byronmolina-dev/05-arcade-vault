"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  TOUCH_CONTROLS_CONFIG,
  TOUCH_REPEAT_MS,
  type TouchButtonConfig,
} from "@/lib/games/touchControls";

export type TouchControlsProps = {
  gameId: string;
};

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

export default function TouchControls({ gameId }: TouchControlsProps) {
  const config = TOUCH_CONTROLS_CONFIG[gameId];

  // Deteccion tras montar (evita mismatch de hidratacion: matchMedia/
  // ontouchstart no existen en SSR). Mismo patron que la carga de skin
  // persistida en GamePlayerClient.
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const touch = "ontouchstart" in window;
    setIsTouchDevice(coarse || touch);
  }, []);

  // Timers de auto-repeat para botones `discrete: true`, uno por code activo.
  const repeatTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  useEffect(() => {
    const timers = repeatTimers.current;
    return () => {
      timers.forEach((id) => clearInterval(id));
      timers.clear();
    };
  }, []);

  const handlePress = (btn: TouchButtonConfig) => {
    dispatchKey("keydown", btn.code);
    if (btn.discrete) {
      const id = setInterval(
        () => dispatchKey("keydown", btn.code),
        TOUCH_REPEAT_MS,
      );
      repeatTimers.current.set(btn.code, id);
    }
  };

  const handleRelease = (btn: TouchButtonConfig) => {
    const id = repeatTimers.current.get(btn.code);
    if (id !== undefined) {
      clearInterval(id);
      repeatTimers.current.delete(btn.code);
    }
    dispatchKey("keyup", btn.code);
  };

  if (!config || !isTouchDevice) return null;

  const pointerHandlers = (btn: TouchButtonConfig) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      handlePress(btn);
    },
    onPointerUp: () => handleRelease(btn),
    onPointerCancel: () => handleRelease(btn),
    onPointerLeave: () => handleRelease(btn),
  });

  const renderButton = (btn: TouchButtonConfig) => (
    <button
      key={btn.code}
      type="button"
      className="touch-btn"
      aria-label={btn.label}
      {...pointerHandlers(btn)}
    >
      {btn.label}
    </button>
  );

  if (config.variant === "gamepad") {
    return (
      <GamepadControls
        dpad={config.dpad}
        actions={config.actions}
        pointerHandlers={pointerHandlers}
      />
    );
  }

  // Sin cluster de acciones (bloque-buster, serpentina): el D-pad puede
  // usar mucho mas ancho sin riesgo de superponerse con nada a la derecha,
  // asi que los 4 botones de direccion entran en una sola linea.
  const dpadClassName =
    config.actions.length === 0 ? "touch-dpad touch-dpad--wide" : "touch-dpad";

  return (
    <div className="touch-controls">
      <div className={dpadClassName}>{config.dpad.map(renderButton)}</div>
      {config.actions.length > 0 && (
        <div className="touch-actions">{config.actions.map(renderButton)}</div>
      )}
    </div>
  );
}

// Variante "gamepad" (Tetris): un unico panel estilo control, inspirado en
// references/gamepad-assets/gamepad.html — mismos TouchButtonConfig que la
// variante clasica (mismo code/discrete/auto-repeat), solo cambia el
// render: D-pad en forma de cruz con hub central + botones de accion
// circulares B/A (cyan/magenta) en vez de los rectangulos flotantes.
const DPAD_SLOTS = ["up", "right", "down", "left"] as const;
type DpadSlot = (typeof DPAD_SLOTS)[number];
const SLOT_CODE: Record<DpadSlot, TouchButtonConfig["code"]> = {
  up: "ArrowUp",
  right: "ArrowRight",
  down: "ArrowDown",
  left: "ArrowLeft",
};
const DPAD_ARROW_PATH: Record<DpadSlot, string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};

function GamepadControls({
  dpad,
  actions,
  pointerHandlers,
}: {
  dpad: TouchButtonConfig[];
  actions: TouchButtonConfig[];
  pointerHandlers: (btn: TouchButtonConfig) => {
    onPointerDown: (e: PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
  };
}) {
  const findDpadButton = (slot: DpadSlot) =>
    dpad.find((btn) => btn.code === SLOT_CODE[slot]);

  // Primera accion => boton B (izquierda, cyan); segunda => boton A
  // (derecha, magenta). Para Tetris: ROTAR en B, CAER (hard drop) en A.
  const [btnB, btnA] = actions;

  return (
    <div className="touch-gamepad-dock">
      <div className="gp" role="group" aria-label="Gamepad">
        <div className="gp-body">
          <div className="gp-dpad">
            {DPAD_SLOTS.map((slot) => {
              const btn = findDpadButton(slot);
              if (!btn) return null;
              return (
                <button
                  key={slot}
                  type="button"
                  className={`dp dp-${slot}`}
                  aria-label={btn.label}
                  {...pointerHandlers(btn)}
                >
                  <svg className="dp-arrow" viewBox="0 0 24 24">
                    <path d={DPAD_ARROW_PATH[slot]} fill="currentColor" />
                  </svg>
                </button>
              );
            })}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
          <div className="gp-actions">
            {btnB && (
              <button
                type="button"
                className="ab b"
                aria-label={btnB.label}
                {...pointerHandlers(btnB)}
              >
                <span className="ab-ring" />
                <span className="ab-icon">⟳</span>
              </button>
            )}
            {btnA && (
              <button
                type="button"
                className="ab a"
                aria-label={btnA.label}
                {...pointerHandlers(btnA)}
              >
                <span className="ab-ring" />
                <span className="ab-icon">⤓</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
