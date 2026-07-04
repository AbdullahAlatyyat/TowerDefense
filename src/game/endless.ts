import { createRng, type Rng } from "../core/rng";
import type { Cell } from "../core/grid";
import type { LevelDef, WaveDef, WaveGroup } from "../data/level01";
import type { EnemyTypeId } from "../data/enemies";

/**
 * Endless/survival mode: one fixed board every run (so best-wave-reached is
 * comparable across attempts), with waves generated on demand — the wave
 * budget keeps climbing forever, so a loss is the only way a run ends.
 */

const COLS = 9;
const ROWS = 16;

const ENDLESS_PATH: Cell[] = [
  [2, 0],
  [2, 5],
  [7, 5],
  [7, 9],
  [2, 9],
  [2, 13],
  [6, 13],
  [6, 15],
];

const SPECIAL_TYPES: EnemyTypeId[] = ["golem", "wisp", "troll", "warden", "blob"];

const gr = (
  enemy: EnemyTypeId,
  count: number,
  hp: number,
  spawnInterval: number,
): WaveGroup => ({ enemy, count, hp, spawnInterval });

interface WavePattern {
  make(hp: number, rng: Rng): WaveGroup[];
}

/** Same composition families as the daily generator. */
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

/** Generates the single wave at `waveIndex` (0-based); hp climbs forever. */
export function generateEndlessWave(waveIndex: number, rng: Rng): WaveDef {
  const hp = Math.max(2, Math.round(4 + waveIndex * 2.6 + rng.range(0, 2)));
  const poolMax = waveIndex === 0 ? 1 : waveIndex < 3 ? 2 : PATTERNS.length;
  const idx = Math.floor(rng.range(0, poolMax));
  const groups = PATTERNS[idx]!.make(hp, rng);

  // Every 5th wave is a boss wave; otherwise a growing chance of a special.
  if ((waveIndex + 1) % 5 === 0) {
    groups.push(gr("warlord", 1 + Math.floor(waveIndex / 15), Math.round(hp * 0.8), 1));
  } else if (waveIndex >= 3 && rng.next() < 0.5) {
    const type = SPECIAL_TYPES[Math.floor(rng.range(0, SPECIAL_TYPES.length))]!;
    groups.push(gr(type, 1 + Math.floor(waveIndex / 8), Math.round(hp * 0.9), 10));
  }
  return { groups };
}

/** Decorrelated from the run seed so continuation jitter isn't identical to wave 0's rolls. */
function endlessLayoutSeed(seed: number): number {
  return (seed ^ 0x2f6e2b1) >>> 0;
}

export function createEndlessLevel(seed: number): LevelDef {
  const rng = createRng(endlessLayoutSeed(seed));
  return {
    id: "endless",
    name: "Endless",
    cols: COLS,
    rows: ROWS,
    paths: [ENDLESS_PATH],
    waves: [generateEndlessWave(0, rng)],
    startGold: 120,
    startLives: 20,
    endless: true,
  };
}

