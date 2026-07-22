"use client";

import { use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { notFound, useRouter } from "next/navigation";
import gamesData from "@/data/games.json";
import { getUser, pushScore, subscribeToUser } from "@/lib/storage";
import type { Game } from "@/lib/types";
import AsteroidsGame, {
  type AsteroidsGameHandle,
} from "@/components/games/AsteroidsGame";

const games = gamesData.games as Game[];
const LIVES = 3;

function getServerUserSnapshot() {
  return null;
}

export default function GamePlayerPage(props: PageProps<"/juegos/[id]/jugar">) {
  const { id } = use(props.params);
  const router = useRouter();
  const game = games.find((g) => g.id === id);
  const user = useSyncExternalStore(
    subscribeToUser,
    getUser,
    getServerUserSnapshot,
  );
  const isAsteroids = game?.id === "asteroides";
  const gameRef = useRef<AsteroidsGameHandle>(null);

  const [fakeScore, setFakeScore] = useState(0);
  const [realScore, setRealScore] = useState(0);
  const [realLives, setRealLives] = useState(LIVES);
  const [realLevel, setRealLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  const score = isAsteroids ? realScore : fakeScore;
  const lives = isAsteroids ? realLives : LIVES;
  const level = isAsteroids ? realLevel : Math.floor(score / 2500) + 1;
  const name = nameOverride ?? user?.name ?? "INVITADO";

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(
      () => setFakeScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  if (!game) notFound();

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (isAsteroids) {
        if (next) gameRef.current?.pause();
        else gameRef.current?.resume();
      }
      return next;
    });
  };

  const endGame = () => {
    if (isAsteroids) gameRef.current?.pause();
    setOver(true);
  };

  const restart = () => {
    if (isAsteroids) {
      gameRef.current?.reset();
    } else {
      setFakeScore(0);
    }
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  const handleSaveScore = () => {
    pushScore({ game: game.id, score, name });
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
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juegos/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsGame
              ref={gameRef}
              onScoreChange={setRealScore}
              onLivesChange={setRealLives}
              onLevelChange={setRealLevel}
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
          {paused && (
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
