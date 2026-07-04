/** Versioned localStorage persistence for campaign progress and settings. */

export interface DailyRecord {
  /** ISO date (YYYY-MM-DD) of the recorded attempt */
  date: string;
  won: boolean;
  livesLeft: number;
  stars: number;
}

export interface SaveData {
  version: 1;
  /** levelId → best stars earned (0–3) */
  stars: Record<string, number>;
  muted: boolean;
  daily: DailyRecord | null;
}

const KEY = "towerdefense-save";

const DEFAULTS: SaveData = { version: 1, stars: {}, muted: false, daily: null };

/**
 * Upgrades a parsed-but-unvalidated save blob to the current SaveData shape.
 * A signed-in device that hits an unrecognized version can self-heal via /api/sync;
 * add a case here per future version bump instead of discarding unknown data.
 */
function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULTS);
  const data = raw as Partial<SaveData> & { version?: unknown };
  if (data.version === 1) {
    return { ...structuredClone(DEFAULTS), ...data, version: 1 };
  }
  return structuredClone(DEFAULTS);
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return migrateSave(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full/blocked — play on without persistence
  }
}

/** Star rating for a finished (won) run. */
export function starsForRun(livesLeft: number, startLives: number): number {
  const frac = livesLeft / startLives;
  if (frac >= 0.9) return 3;
  if (frac >= 0.5) return 2;
  return 1;
}

export function recordStars(save: SaveData, levelId: string, stars: number): void {
  if ((save.stars[levelId] ?? 0) < stars) {
    save.stars[levelId] = stars;
    writeSave(save);
  }
}
