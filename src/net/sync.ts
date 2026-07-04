import type { DailyRecord, SaveData } from "../core/save";
import { apiFetch } from "./api";

interface MergedState {
  stars: Record<string, number>;
  daily: DailyRecord | null;
}

/** Merges local guest progress into the account and returns the authoritative merged state. */
export async function mergeOnLogin(save: SaveData): Promise<MergedState> {
  return apiFetch<MergedState>("/sync", {
    method: "POST",
    body: JSON.stringify({ stars: save.stars, daily: save.daily }),
  });
}

// --- Offline outbox: queues failed pushes for retry, isolated from the gameplay save
// so a corrupt/lost queue can never affect towerdefense-save. Only the latest pending
// write per key is kept — stars are monotonic max and daily is first-write-wins, so
// older superseded entries for the same key are redundant. ---

type OutboxEntry =
  | { type: "stars"; key: string; levelId: string; stars: number }
  | { type: "daily"; key: string; record: DailyRecord };

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
  if (entry.type === "stars") {
    await apiFetch("/stars", { method: "POST", body: JSON.stringify({ levelId: entry.levelId, stars: entry.stars }) });
  } else {
    await apiFetch("/daily", { method: "POST", body: JSON.stringify(entry.record) });
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
