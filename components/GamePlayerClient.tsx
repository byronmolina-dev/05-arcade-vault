"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getUser, pushScore, subscribeToUser } from "@/lib/storage";
import { insertScore } from "@/lib/supabase/scoresClient";
import { REAL_SCORE_GAME_IDS, type Game } from "@/lib/types";
import {
  SKINNED_GAME_IDS,
  SKIN_IDS,
  SKIN_LABELS,
  type SkinId,
} from "@/lib/games/skins";
import AsteroidsGame from "@/components/games/AsteroidsGame";
import TetrisGame from "@/components/games/TetrisGame";
import BloqueBusterGame from "@/components/games/BloqueBusterGame";
import SerpentinaGame from "@/components/games/SerpentinaGame";
import TouchControls from "@/components/games/TouchControls";

const LIVES = 3;

type GameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

type FourthStat =
  | { kind: "hearts" } // Asteroides, Bloque Buster
  | { kind: "lines" } // Tetris
  | { kind: "length" }; // Serpentina — valor numérico, sin corazones

type RealGameConfig = {
  fourthStat: FourthStat;
  suppressExternalPauseOverlay: boolean;
};

const FOURTH_STAT_LABEL: Record<FourthStat["kind"], string> = {
  hearts: "Vidas",
  lines: "Líneas",
  length: "Longitud",
};

const REAL_GAME_CONFIG: Partial<Record<string, RealGameConfig>> = {
  asteroides: {
    fourthStat: { kind: "hearts" },
    suppressExternalPauseOverlay: false,
  },
  tetris: {
    fourthStat: { kind: "lines" },
    suppressExternalPauseOverlay: false,
  },
  "bloque-buster": {
    fourthStat: { kind: "hearts" },
    suppressExternalPauseOverlay: true,
  },
  serpentina: {
    fourthStat: { kind: "length" },
    suppressExternalPauseOverlay: false,
  },
};

function getServerUserSnapshot() {
  return null;
}

export default function GamePlayerClient({ game }: { game: Game }) {
  const router = useRouter();
  const user = useSyncExternalStore(
    subscribeToUser,
    getUser,
    getServerUserSnapshot,
  );
  const isRealGame = (REAL_SCORE_GAME_IDS as readonly string[]).includes(
    game.id,
  );
  const config = REAL_GAME_CONFIG[game.id];
  const fourthStatKind = config?.fourthStat.kind ?? "hearts";
  const fourthStatLabel = FOURTH_STAT_LABEL[fourthStatKind];
  const gameRef = useRef<GameHandle>(null);

  const [fakeScore, setFakeScore] = useState(0);
  const [realScore, setRealScore] = useState(0);
  const [realLives, setRealLives] = useState(LIVES);
  const [realLines, setRealLines] = useState(0);
  const [realLength, setRealLength] = useState(0);
  const [realLevel, setRealLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  const hasSkins = SKINNED_GAME_IDS.includes(game.id);
  const [skin, setSkin] = useState<SkinId>("clasico");

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [orientationBlocked, setOrientationBlocked] = useState(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Deteccion tras montar (evita mismatch de hidratacion). Mismo patron
  // que TouchControls y que la carga de skin persistida mas abajo.
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const touch = "ontouchstart" in window;
    setIsTouchDevice(coarse || touch);
  }, []);

  // Aviso "GIRA TU DISPOSITIVO": solo para los 4 juegos reales en tactil.
  // orientationBlocked es independiente del `paused` manual (no togglea el
  // boton visible PAUSA/REANUDAR): al bloquear pausa el juego real; al
  // desbloquear, reanuda solo si el jugador no habia pausado manualmente.
  useEffect(() => {
    if (!isRealGame || !isTouchDevice) return;
    const mq = window.matchMedia("(orientation: portrait)");
    const applyOrientation = (portrait: boolean) => {
      setOrientationBlocked(portrait);
      if (portrait) {
        gameRef.current?.pause();
      } else if (!pausedRef.current) {
        gameRef.current?.resume();
      }
    };
    applyOrientation(mq.matches);
    const handleChange = (e: MediaQueryListEvent) =>
      applyOrientation(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [isRealGame, isTouchDevice]);

  // Cargar la skin persistida tras montar (evita mismatch de hidratacion:
  // localStorage no existe en SSR). Patron try/catch silencioso de lib/storage.
  useEffect(() => {
    if (!hasSkins) return;
    try {
      const raw = localStorage.getItem(`av_skin_${game.id}`);
      if (raw && (SKIN_IDS as string[]).includes(raw)) {
        setSkin(raw as SkinId);
      }
    } catch {
      // localStorage no disponible (modo privado, cuota): sin cambio, queda clasico
    }
  }, [game.id, hasSkins]);

  const selectSkin = (next: SkinId) => {
    setSkin(next);
    try {
      localStorage.setItem(`av_skin_${game.id}`, next);
    } catch {
      // localStorage no disponible: la eleccion vive solo en memoria esta sesion
    }
  };

  const score = isRealGame ? realScore : fakeScore;
  const lives = isRealGame ? realLives : LIVES;
  const level = isRealGame ? realLevel : Math.floor(score / 2500) + 1;
  const name = nameOverride ?? user?.name ?? "INVITADO";

  useEffect(() => {
    if (isRealGame || over || paused) return;
    const t = setInterval(
      () => setFakeScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isRealGame, over, paused]);

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (isRealGame) {
        if (next) gameRef.current?.pause();
        else gameRef.current?.resume();
      }
      return next;
    });
  };

  const endGame = () => {
    if (isRealGame) gameRef.current?.pause();
    setOver(true);
  };

  const restart = () => {
    if (isRealGame) {
      gameRef.current?.reset();
    } else {
      setFakeScore(0);
    }
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const handleSaveScore = async () => {
    if (isRealGame) {
      try {
        await insertScore({ gameId: game.id, name, score });
      } catch {
        // Supabase insert falla silenciosamente; el flujo local se completa igual
      }
    } else {
      pushScore({ game: game.id, score, name });
    }
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">{fourthStatLabel}</div>
            <div className="v">
              {fourthStatKind === "lines"
                ? realLines
                : fourthStatKind === "length"
                  ? realLength
                  : "♥ ".repeat(lives).trim() || "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {hasSkins && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 4,
              }}
            >
              <span
                className="pixel"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.14em",
                  color: "var(--ink-faint)",
                }}
              >
                SKIN
              </span>
              {SKIN_IDS.map((id) => (
                <button
                  key={id}
                  className={`btn ${skin === id ? "yellow" : "ghost"}`}
                  style={{ padding: "8px 10px", fontSize: 8 }}
                  onClick={() => selectSkin(id)}
                >
                  {SKIN_LABELS[id]}
                </button>
              ))}
            </div>
          )}
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/games/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {game.id === "tetris" ? (
            <TetrisGame
              ref={gameRef}
              onScoreChange={setRealScore}
              onLinesChange={setRealLines}
              onLevelChange={setRealLevel}
              onGameOver={() => setOver(true)}
              skin={skin}
            />
          ) : game.id === "asteroides" ? (
            <AsteroidsGame
              ref={gameRef}
              onScoreChange={setRealScore}
              onLivesChange={setRealLives}
              onLevelChange={setRealLevel}
              onGameOver={() => setOver(true)}
              skin={skin}
            />
          ) : game.id === "bloque-buster" ? (
            <BloqueBusterGame
              ref={gameRef}
              onScoreChange={setRealScore}
              onLivesChange={setRealLives}
              onLevelChange={setRealLevel}
              onGameOver={() => setOver(true)}
            />
          ) : game.id === "serpentina" ? (
            <SerpentinaGame
              ref={gameRef}
              onScoreChange={setRealScore}
              onLevelChange={setRealLevel}
              onLengthChange={setRealLength}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && !config?.suppressExternalPauseOverlay && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
          {isRealGame && orientationBlocked && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.85)", zIndex: 8 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  GIRÁ TU DISPOSITIVO
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  JUGÁ EN HORIZONTAL PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
          {isRealGame && <TouchControls gameId={game.id} />}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameOverride(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSaveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
