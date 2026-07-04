import type { DailyRecord, SaveData } from "../core/save";
import { apiFetch } from "./api";

interface MergedState {
  stars: Record<string, number>;
  daily: DailyRecord | null;
  currency: number;
  metaUpgrades: Record<string, number>;
  achievements: Record<string, true>;
  bestEndlessWave: number;
}

/** Merges local guest progress into the account and returns the authoritative merged state. */
export async function mergeOnLogin(save: SaveData): Promise<MergedState> {
  return apiFetch<MergedState>("/sync", {
    method: "POST",
    body: JSON.stringify({
      stars: save.stars,
      daily: save.daily,
      currency: save.currency,
      metaUpgrades: save.metaUpgrades,
      achievements: save.achievements,
      bestEndlessWave: save.bestEndlessWave,
    }),
  });
}

// --- Offline outbox: queues failed pushes for retry, isolated from the gameplay save
// so a corrupt/lost queue can never affect towerdefense-save. Only the latest pending
// write per key is kept — stars/currency/metaUpgrade tiers are monotonic max, daily is
// first-write-wins, and achievement unlocks are permanent — so older superseded
// entries for the same key are redundant. ---

type OutboxEntry =
  | { type: "stars"; key: string; levelId: string; stars: number }
  | { type: "daily"; key: string; record: DailyRecord }
  | { type: "currency"; key: string; currency: number }
  | { type: "metaUpgrade"; key: string; upgradeId: string; tier: number }
  | { type: "achievement"; key: string; achievementId: string }
  | { type: "endless"; key: string; bestEndlessWave: number };

const OUTBOX_KEY = "towerdefense-outbox";

function readOutbox(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    // storage full/blocked — the in-memory push already happened, just can't retry later
  }
}

function enqueue(entry: OutboxEntry): void {
  const entries = readOutbox().filter((e) => e.key !== entry.key);
  entries.push(entry);
  writeOutbox(entries);
}

async function sendEntry(entry: OutboxEntry): Promise<void> {
  switch (entry.type) {
    case "stars":
      await apiFetch("/stars", { method: "POST", body: JSON.stringify({ levelId: entry.levelId, stars: entry.stars }) });
      break;
    case "daily":
      await apiFetch("/daily", { method: "POST", body: JSON.stringify(entry.record) });
      break;
    case "currency":
      await apiFetch("/currency", { method: "POST", body: JSON.stringify({ currency: entry.currency }) });
      break;
    case "metaUpgrade":
      await apiFetch("/metaUpgrade", {
        method: "POST",
        body: JSON.stringify({ upgradeId: entry.upgradeId, tier: entry.tier }),
      });
      break;
    case "achievement":
      await apiFetch("/achievement", {
        method: "POST",
        body: JSON.stringify({ achievementId: entry.achievementId }),
      });
      break;
    case "endless":
      await apiFetch("/endless", {
        method: "POST",
        body: JSON.stringify({ bestEndlessWave: entry.bestEndlessWave }),
      });
      break;
  }
}

/** Retries any queued pushes left over from a previous offline/failed attempt. */
export async function flushOutbox(): Promise<void> {
  const entries = readOutbox();
  if (entries.length === 0) return;
  const remaining: OutboxEntry[] = [];
  for (const entry of entries) {
    try {
      await sendEntry(entry);
    } catch {
      remaining.push(entry);
    }
  }
  writeOutbox(remaining);
}

export function pushStars(levelId: string, stars: number): void {
  const entry: OutboxEntry = { type: "stars", key: `stars:${levelId}`, levelId, stars };
  apiFetch("/stars", { method: "POST", body: JSON.stringify({ levelId, stars }) }).catch(() => {
    enqueue(entry);
  });
}

export function pushDaily(record: DailyRecord): void {
  const entry: OutboxEntry = { type: "daily", key: `daily:${record.date}`, record };
  apiFetch("/daily", { method: "POST", body: JSON.stringify(record) }).catch(() => {
    enqueue(entry);
  });
}

export function pushCurrency(currency: number): void {
  const entry: OutboxEntry = { type: "currency", key: "currency", currency };
  apiFetch("/currency", { method: "POST", body: JSON.stringify({ currency }) }).catch(() => {
    enqueue(entry);
  });
}

export function pushMetaUpgrade(upgradeId: string, tier: number): void {
  const entry: OutboxEntry = { type: "metaUpgrade", key: `metaUpgrade:${upgradeId}`, upgradeId, tier };
  apiFetch("/metaUpgrade", { method: "POST", body: JSON.stringify({ upgradeId, tier }) }).catch(() => {
    enqueue(entry);
  });
}

export function pushAchievement(achievementId: string): void {
  const entry: OutboxEntry = { type: "achievement", key: `achievement:${achievementId}`, achievementId };
  apiFetch("/achievement", { method: "POST", body: JSON.stringify({ achievementId }) }).catch(() => {
    enqueue(entry);
  });
}

export function pushEndless(wavesReached: number): void {
  const entry: OutboxEntry = { type: "endless", key: "endless", bestEndlessWave: wavesReached };
  apiFetch("/endless", { method: "POST", body: JSON.stringify({ bestEndlessWave: wavesReached }) }).catch(() => {
    enqueue(entry);
  });
}
