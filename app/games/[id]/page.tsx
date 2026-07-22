import { notFound } from "next/navigation";
import Link from "next/link";
import { seededScores } from "@/lib/scores";
import { getGameById } from "@/lib/supabase/games";
import { getTopScores } from "@/lib/supabase/scores";

export default async function GameDetailPage(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;

  let game;
  try {
    game = await getGameById(id);
  } catch {
    return (
      <div
        style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}
      >
        <div
          className="pixel"
          style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
        >
          ERROR
        </div>
        <div>No se pudo cargar el juego.</div>
      </div>
    );
  }
  if (!game) notFound();

  const isAsteroides = game.id === "asteroides";
  let leaderboardError = false;
  let scores = isAsteroides ? [] : seededScores(id.length * 17 + 3, 10);

  if (isAsteroides) {
    try {
      scores = await getTopScores("asteroides", 10);
    } catch {
      leaderboardError = true;
    }
  }

  const best =
    isAsteroides && scores.length > 0
      ? Math.max(...scores.map((s) => s.score))
      : game.best;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={`cover-bg ${game.cover}`} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {isAsteroides && leaderboardError ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-faint)",
              }}
            >
              No se pudo cargar el leaderboard.
            </div>
          ) : isAsteroides && scores.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-faint)",
              }}
            >
              Aún no hay puntuaciones guardadas.
            </div>
          ) : (
            scores.map((r, i) => (
              <div
                key={r.rank}
                className={`lb-row${i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""}`}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">
                  {r.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
