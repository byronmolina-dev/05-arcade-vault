import { createClient } from "@/lib/supabase/server";
import { toScoreRows } from "@/lib/supabase/scoreRows";
import type { ScoreRow } from "@/lib/types";

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return toScoreRows(data ?? []);
}
