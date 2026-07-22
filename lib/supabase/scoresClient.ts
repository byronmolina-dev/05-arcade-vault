import { createClient } from "@/lib/supabase/client";
import { toScoreRows } from "@/lib/supabase/scoreRows";
import type { ScoreRow } from "@/lib/types";

export async function insertScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: entry.gameId, name: entry.name, score: entry.score });

  if (error) throw error;
}

export async function getTopScoresClient(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return toScoreRows(data ?? []);
}
