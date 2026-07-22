import GamesBrowser from "@/components/GamesBrowser";
import { getGames } from "@/lib/supabase/games";

export default async function GamesPage() {
  let games: Awaited<ReturnType<typeof getGames>> = [];
  let hasError = false;

  try {
    games = await getGames();
  } catch {
    hasError = true;
  }

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      {hasError ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            ERROR
          </div>
          <div>No se pudo cargar el catálogo de juegos.</div>
        </div>
      ) : (
        <GamesBrowser games={games} />
      )}
    </div>
  );
}
