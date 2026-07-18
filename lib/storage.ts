import type { ScoreEntry, User } from "./types";

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

export function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (private mode, quota exceeded): fail silently
  }
}

export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage unavailable (private mode, quota exceeded): fail silently
  }
}

export function getScores(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushScore(entry: Omit<ScoreEntry, "at">): void {
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (private mode, quota exceeded): fail silently
  }
}
