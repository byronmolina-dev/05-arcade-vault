import type { ScoreRow } from "@/lib/types";

type ScoreRecord = { name: string; score: number; created_at: string };

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function toScoreRows(records: ScoreRecord[]): ScoreRow[] {
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
