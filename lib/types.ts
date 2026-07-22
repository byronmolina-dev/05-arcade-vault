export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

export type User = { name: string };

export type ScoreEntry = {
  game: string;
  score: number;
  name: string;
  at: number;
};

export const REAL_SCORE_GAME_IDS = ["asteroides", "tetris"] as const;
