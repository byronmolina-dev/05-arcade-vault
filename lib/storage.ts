import type { ScoreEntry, User } from "./types";

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";
const USER_EVENT = "av:user-changed";

let cachedUserRaw: string | null = null;
let cachedUser: User | null = null;

export function getUser(): User | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
  if (raw !== cachedUserRaw) {
    cachedUserRaw = raw;
    try {
      cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

export function setUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (private mode, quota exceeded): fail silently
  }
  window.dispatchEvent(new Event(USER_EVENT));
}

export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage unavailable (private mode, quota exceeded): fail silently
  }
  window.dispatchEvent(new Event(USER_EVENT));
}

export function subscribeToUser(callback: () => void): () => void {
  window.addEventListener(USER_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
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
