import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/lib/types";

type ScoreRecord = { name: string; score: number; created_at: string };

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function toScoreRows(records: ScoreRecord[]): ScoreRow[] {
  return records
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      date: formatDate(r.created_at),
    }));
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return toScoreRows(data ?? []);
}

export async function insertScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: entry.gameId, name: entry.name, score: entry.score });

  if (error) throw error;
}

export async function getTopScoresClient(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return toScoreRows(data ?? []);
}
