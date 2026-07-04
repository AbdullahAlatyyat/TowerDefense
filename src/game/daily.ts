import { createRng, type Rng } from "../core/rng";
import { buildTrack, type Cell } from "../core/grid";
import type { LevelDef, WaveDef, WaveGroup } from "../data/level01";
import type { EnemyTypeId } from "../data/enemies";

/**
 * Daily challenge: everyone on the same date plays the same generated level.
 * The level is derived purely from the date string, and the sim is
 * deterministic, so runs are comparable across players.
 */

/** Local date as YYYY-MM-DD (daily rolls over at local midnight). */
export function dailyDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Daily #N, counted from the game's daily epoch. */
export function dailyNumber(dateStr: string): number {
  const epoch = Date.UTC(2026, 6, 1); // 2026-07-01 = Daily #1
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = Date.UTC(y!, m! - 1, d!);
  return Math.max(1, Math.round((day - epoch) / 86400000) + 1);
}

/** FNV-1a — stable string → uint32 seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const COLS = 9;
const ROWS = 16;

/**
 * Random serpentine path, top edge to bottom edge: vertical drops of 2–4
 * rows alternating with horizontal runs to a new column. Rows strictly
 * descend so the path can never self-cross.
 */
function generatePath(rng: Rng): Cell[] {
  const waypoints: Cell[] = [];
  let col = 1 + Math.floor(rng.range(0, COLS - 2)); // 1..7
  let row = 0;
  waypoints.push([col, 0]);

  while (true) {
    row = Math.min(row + 2 + Math.floor(rng.range(0, 3)), ROWS - 1);
    waypoints.push([col, row]);
    if (row >= ROWS - 1) break;
    // Move to a column at least 2 away, staying in bounds.
    const candidates: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (Math.abs(c - col) >= 2) candidates.push(c);
    }
    col = candidates[Math.floor(rng.range(0, candidates.length))]!;
    waypoints.push([col, row]);
  }
  return waypoints;
}

interface WavePattern {
  make(hp: number, rng: Rng): WaveGroup[];
}

const gr = (
  enemy: EnemyTypeId,
  count: number,
  hp: number,
  spawnInterval: number,
): WaveGroup => ({ enemy, count, hp, spawnInterval });

/** Composition patterns; hp is the wave's base budget. */
const PATTERNS: WavePattern[] = [
  { make: (hp, rng) => [gr("grunt", 9 + Math.floor(rng.range(0, 4)), hp, 19)] },
  {
    make: (hp, rng) => [
      gr("runner", 7 + Math.floor(rng.range(0, 4)), Math.round(hp * 0.85), 12),
      gr("grunt", 8, hp, 17),
    ],
  },
  {
    make: (hp, rng) => [
      gr("swarm", 16 + Math.floor(rng.range(0, 8)), Math.round(hp * 1.1), 6),
      gr("runner", 7, Math.round(hp * 0.85), 11),
    ],
  },
  {
    make: (hp, rng) => [
      gr("brute", 3 + Math.floor(rng.range(0, 2)), Math.round(hp * 1.35), 42),
      gr("grunt", 9, hp, 15),
    ],
  },
  {
    make: (hp, rng) => [
      gr("brute", 3, Math.round(hp * 1.3), 40),
      gr("swarm", 14 + Math.floor(rng.range(0, 8)), hp, 5),
      gr("runner", 8, Math.round(hp * 0.9), 10),
    ],
  },
];

function generateWaves(rng: Rng, pathLength: number): WaveDef[] {
  const waves: WaveDef[] = [];
  const count = 7;
  // Shorter paths give towers less time on target — scale hp budgets down.
  const lengthFactor = Math.min(1.1, Math.max(0.65, pathLength / 30));
  let lastPattern = -1;
  for (let i = 0; i < count; i++) {
    const hp = Math.max(
      2,
      Math.round((4 + i * 2.4 + rng.range(0, 2)) * lengthFactor),
    );
    // Early waves use gentle patterns (no swarm/brute rushes before the
    // economy can answer them); later ones draw from the whole pool.
    const poolMax = i === 0 ? 1 : i < 3 ? 2 : PATTERNS.length;
    let idx = Math.floor(rng.range(0, poolMax));
    if (poolMax > 1 && idx === lastPattern) idx = (idx + 1) % poolMax;
    lastPattern = idx;
    waves.push({ groups: PATTERNS[idx]!.make(hp, rng) });
  }
  return waves;
}

export function generateDailyLevel(dateStr: string): LevelDef {
  const rng = createRng(hashString(dateStr));
  const path = generatePath(rng);
  const pathLength = buildTrack(path).length;
  return {
    id: `daily-${dateStr}`,
    name: `Daily #${dailyNumber(dateStr)}`,
    cols: COLS,
    rows: ROWS,
    paths: [path],
    waves: generateWaves(rng, pathLength),
    startGold: 110 + 10 * Math.floor(rng.range(0, 3)),
    startLives: 20,
  };
}

/** Seed for the run itself (spawn jitter), distinct from the layout seed. */
export function dailyRunSeed(dateStr: string): number {
  return hashString(`run:${dateStr}`);
}

/** Wordle-style share text. */
export function shareText(opts: {
  dateStr: string;
  won: boolean;
  livesLeft: number;
  startLives: number;
  stars: number;
  wavesCleared: number;
  wavesTotal: number;
}): string {
  const n = dailyNumber(opts.dateStr);
  const starLine = opts.won
    ? "⭐".repeat(opts.stars) + "☆".repeat(3 - opts.stars)
    : "💀";
  const waveEmoji =
    "🟩".repeat(opts.wavesCleared) +
    "🟥".repeat(opts.wavesTotal - opts.wavesCleared);
  return (
    `🗼 Tower Defense Daily #${n}\n` +
    `${starLine} ${opts.livesLeft}/${opts.startLives} ❤️\n` +
    `${waveEmoji}\n` +
    `${location.origin}${location.pathname}`
  );
}
