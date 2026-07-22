import HomeClient from "@/components/HomeClient";
import { getGames } from "@/lib/supabase/games";

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof getGames>> = [];

  try {
    games = await getGames();
  } catch {
    games = [];
  }

  return <HomeClient games={games} />;
}
