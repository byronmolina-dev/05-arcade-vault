"use client";

import { useEffect, useRef, useState } from "react";
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

  const renderButton = (btn: TouchButtonConfig) => (
    <button
      key={btn.code}
      type="button"
      className="touch-btn"
      aria-label={btn.label}
      onPointerDown={(e) => {
        e.preventDefault();
        handlePress(btn);
      }}
      onPointerUp={() => handleRelease(btn)}
      onPointerCancel={() => handleRelease(btn)}
      onPointerLeave={() => handleRelease(btn)}
    >
      {btn.label}
    </button>
  );

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
