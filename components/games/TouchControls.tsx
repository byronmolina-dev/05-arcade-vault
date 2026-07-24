"use client";

import { useEffect, useState } from "react";
import { TOUCH_CONTROLS_CONFIG } from "@/lib/games/touchControls";

export type TouchControlsProps = {
  gameId: string;
};

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

  if (!config || !isTouchDevice) return null;

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {config.dpad.map((btn) => (
          <button
            key={btn.code}
            type="button"
            className="touch-btn"
            aria-label={btn.label}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {config.actions.length > 0 && (
        <div className="touch-actions">
          {config.actions.map((btn) => (
            <button
              key={btn.code}
              type="button"
              className="touch-btn"
              aria-label={btn.label}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
