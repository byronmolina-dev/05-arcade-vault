import { notFound } from "next/navigation";
import GamePlayerClient from "@/components/GamePlayerClient";
import { getGameById } from "@/lib/supabase/games";

export default async function GamePlayerPage(
  props: PageProps<"/games/[id]/jugar">,
) {
  const { id } = await props.params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <GamePlayerClient game={game} />;
}
