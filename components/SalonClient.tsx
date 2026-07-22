"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { seededScores } from "@/lib/scores";
import { getUser, subscribeToUser } from "@/lib/storage";
import { getTopScoresClient } from "@/lib/supabase/scoresClient";
import { REAL_SCORE_GAME_IDS, type Game } from "@/lib/types";

function getServerUserSnapshot() {
  return null;
}

type AsteroidsStatus = "loading" | "error" | "ready";

export default function SalonClient({ games }: { games: Game[] }) {
  const router = useRouter();
  const [tab, setTab] = useState(games[0].id);
  const user = useSyncExternalStore(
    subscribeToUser,
    getUser,
    getServerUserSnapshot,
  );

  const isAsteroides = (REAL_SCORE_GAME_IDS as readonly string[]).includes(tab);
  const [asteroidsRows, setAsteroidsRows] = useState<
    ReturnType<typeof seededScores>
  >([]);
  const [asteroidsStatus, setAsteroidsStatus] =
    useState<AsteroidsStatus>("loading");

  const [prevTab, setPrevTab] = useState(tab);
  if (tab !== prevTab) {
    setPrevTab(tab);
    if (tab === "asteroides") setAsteroidsStatus("loading");
  }

  useEffect(() => {
    if (tab !== "asteroides") return;
    let cancelled = false;
    getTopScoresClient("asteroides", 12)
      .then((rows) => {
        if (cancelled) return;
        setAsteroidsRows(rows);
        setAsteroidsStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setAsteroidsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const seededRows = useMemo(
    () => seededScores(tab.length * 23 + 7, 12),
    [tab],
  );
  const rows = isAsteroides ? asteroidsRows : seededRows;
  const game = games.find((g) => g.id === tab) ?? games[0];
  const youRank = user ? Math.floor(8 + (tab.length % 4)) : null;
  const youScore = user ? rows[5]?.score - 2400 : null;

  const showLeaderboardMessage =
    isAsteroides && (asteroidsStatus !== "ready" || rows.length === 0);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={`chip${tab === g.id ? " active" : ""}`}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {showLeaderboardMessage ? (
        <div className="hall-table">
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--ink-faint)",
            }}
          >
            {asteroidsStatus === "error"
              ? "No se pudo cargar el leaderboard."
              : asteroidsStatus === "loading"
                ? "Cargando leaderboard…"
                : "Aún no hay puntuaciones guardadas."}
          </div>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">
                  {rows[1].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].name}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[0].date}</div>
            </div>
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">
                  {rows[2].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={`tr${i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {user && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(youRank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {user.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {(youScore || 9999).toLocaleString("es-ES")}
                  </div>
                  <div className="dt">11/05/2026</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => router.push("/games")}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
