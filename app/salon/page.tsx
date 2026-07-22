import SalonClient from "@/components/SalonClient";
import { getGames } from "@/lib/supabase/games";

export default async function SalonPage() {
  let games: Awaited<ReturnType<typeof getGames>> = [];
  let hasError = false;

  try {
    games = await getGames();
  } catch {
    hasError = true;
  }

  if (hasError) {
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
        <div>No se pudo cargar el salón de la fama.</div>
      </div>
    );
  }

  return <SalonClient games={games} />;
}
