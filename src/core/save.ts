/** Versioned localStorage persistence for campaign progress and settings. */

export interface DailyRecord {
  /** ISO date (YYYY-MM-DD) of the recorded attempt */
  date: string;
  won: boolean;
  livesLeft: number;
  stars: number;
}

export interface SaveData {
  version: 3;
  /** levelId → best stars earned (0–3) */
  stars: Record<string, number>;
  muted: boolean;
  /** SFX gain multiplier, 0–1 */
  sfxVolume: number;
  /** Music gain multiplier, 0–1 */
  musicVolume: number;
  /** whether tower-placement vibration is enabled */
  haptics: boolean;
  /** whether the first-time "how to play" onboarding has been shown */
  tutorialSeen: boolean;
  daily: DailyRecord | null;
  /** persistent meta-currency, spent on metaUpgrades — distinct from in-run gold */
  currency: number;
  /** MetaUpgradeId → tier owned (0 = none) */
  metaUpgrades: Record<string, number>;
  /** AchievementId → unlocked */
  achievements: Record<string, true>;
  /** best wave reached in Endless mode */
  bestEndlessWave: number;
  /** levelId → ever won on Hard difficulty */
  hardClears: Record<string, boolean>;
}

const KEY = "towerdefense-save";
/** Phase-3 stopgap key, folded into bestEndlessWave below and then removed. */
const LEGACY_ENDLESS_KEY = "towerdefense-endless-best";

const DEFAULTS: SaveData = {
  version: 3,
  stars: {},
  muted: false,
  sfxVolume: 1,
  musicVolume: 1,
  haptics: true,
  tutorialSeen: false,
  daily: null,
  currency: 0,
  metaUpgrades: {},
  achievements: {},
  bestEndlessWave: 0,
  hardClears: {},
};

/**
 * Upgrades a parsed-but-unvalidated save blob to the current SaveData shape.
 * A signed-in device that hits an unrecognized version can self-heal via /api/sync;
 * add a case here per future version bump instead of discarding unknown data.
 */
function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULTS);
  const data = raw as Partial<SaveData> & { version?: unknown };
  if (data.version === 3) {
    return { ...structuredClone(DEFAULTS), ...data, version: 3 };
  }
  if (data.version === 2) {
    // v2 lacked sfxVolume/musicVolume/haptics/tutorialSeen — default those in.
    return { ...structuredClone(DEFAULTS), ...data, version: 3 };
  }
  if (data.version === 1) {
    // v1 only had stars/muted/daily — carry those forward, default the rest.
    return {
      ...structuredClone(DEFAULTS),
      stars: data.stars ?? {},
      muted: data.muted ?? false,
      daily: data.daily ?? null,
      version: 3,
    };
  }
  return structuredClone(DEFAULTS);
}

export function loadSave(): SaveData {
  let save: SaveData;
  try {
    const raw = localStorage.getItem(KEY);
    save = raw ? migrateSave(JSON.parse(raw)) : structuredClone(DEFAULTS);
  } catch {
    save = structuredClone(DEFAULTS);
  }

  // One-time fold-in of the Endless best-wave stopgap key from before the
  // save schema had a field for it.
  try {
    const legacy = localStorage.getItem(LEGACY_ENDLESS_KEY);
    if (legacy !== null) {
      const legacyBest = Number(legacy);
      if (legacyBest > save.bestEndlessWave) {
        save.bestEndlessWave = legacyBest;
        writeSave(save);
      }
      localStorage.removeItem(LEGACY_ENDLESS_KEY);
    }
  } catch {
    // storage blocked — nothing to migrate
  }

  return save;
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

export function awardCurrency(save: SaveData, amount: number): void {
  save.currency += amount;
  writeSave(save);
}

export function spendCurrency(save: SaveData, amount: number): boolean {
  if (save.currency < amount) return false;
  save.currency -= amount;
  writeSave(save);
  return true;
}

export function recordEndlessBest(save: SaveData, wavesReached: number): void {
  if (wavesReached > save.bestEndlessWave) {
    save.bestEndlessWave = wavesReached;
    writeSave(save);
  }
}

export function recordHardClear(save: SaveData, levelId: string): void {
  if (!save.hardClears[levelId]) {
    save.hardClears[levelId] = true;
    writeSave(save);
  }
}
