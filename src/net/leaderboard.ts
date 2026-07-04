import { apiFetch } from "./api";

export interface EndlessEntry {
  displayName: string;
  bestEndlessWave: number;
}

export interface DailyEntry {
  displayName: string;
  won: boolean;
  livesLeft: number;
  stars: number;
}

export function getEndlessLeaderboard(): Promise<EndlessEntry[]> {
  return apiFetch<EndlessEntry[]>("/leaderboard/endless");
}

export function getDailyLeaderboard(date: string): Promise<DailyEntry[]> {
  return apiFetch<DailyEntry[]>(`/leaderboard/daily?date=${encodeURIComponent(date)}`);
}
