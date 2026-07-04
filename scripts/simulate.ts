/**
 * Headless greedy-bot harness: plays levels without a renderer to check
 * (a) determinism — same seed must produce an identical end state — and
 * (b) that each level is winnable with sensible play, printing lives
 * remaining as a balance signal.
 *
 * Run: npx tsx scripts/simulate.ts [seed]   (or: npm run sim)
 */
import { cellKey, pointAtDistance, type PathTrack } from "../src/core/grid";
import type { LevelDef } from "../src/data/level01";
import { LEVELS } from "../src/data/levels";
import { TOWERS, type TowerTypeId } from "../src/data/towers";
import type { DifficultyId } from "../src/data/difficulty";
import { MUTATOR_ORDER, type MutatorId } from "../src/data/mutators";
import {
  createGame,
  placeTower,
  step,
  upgradeCost,
  upgradeTower,
  type GameState,
} from "../src/game/state";
import { canStartWave, startWave } from "../src/game/waves";
import { dailyRunSeed, generateDailyLevel } from "../src/game/daily";
import { createEndlessLevel } from "../src/game/endless";

/** Deterministic build order; repeats until no cells/gold remain. */
const BUILD_ORDER: TowerTypeId[] = [
  "gunner",
  "gunner",
  "frost",
  "cannon",
  "alchemist",
  "gunner",
  "sniper",
  "tesla",
  "cannon",
  "beacon",
  "frost",
];
/** Preferred upgrade path per type. */
const PATH_CHOICE: Record<TowerTypeId, 0 | 1> = {
  gunner: 0, // Rapid Fire
  cannon: 1, // Heavy Shells
  frost: 0, // Deep Freeze
  sniper: 0, // Deadeye
  alchemist: 0, // Virulence
  tesla: 0, // Overcharge
  beacon: 0, // War Drums
};
const UPGRADE_AFTER_TOWERS = 5;

/** Rank buildable cells by how much path (across all lanes) they cover at gunner range. */
function rankedCells(level: LevelDef, tracks: PathTrack[], pathCells: Set<number>) {
  const samples: { x: number; y: number }[] = [];
  for (const track of tracks) {
    for (let d = 0; d < track.length; d += 0.25) {
      samples.push(pointAtDistance(track, d));
    }
  }
  const range = TOWERS.gunner.base.range;
  const cells: { cx: number; cy: number; score: number }[] = [];
  for (let cy = 0; cy < level.rows; cy++) {
    for (let cx = 0; cx < level.cols; cx++) {
      if (pathCells.has(cellKey(cx, cy))) continue;
      const x = cx + 0.5;
      const y = cy + 0.5;
      let score = 0;
      for (const s of samples) {
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy <= range * range) score++;
      }
      if (score > 0) cells.push({ cx, cy, score });
    }
  }
  // Stable, deterministic ordering.
  return cells.sort(
    (a, b) => b.score - a.score || a.cy - b.cy || a.cx - b.cx,
  );
}

function botAct(state: GameState, spots: ReturnType<typeof rankedCells>, built: { n: number }) {
  // Build the next tower in the order at the best free cell.
  const nextType = BUILD_ORDER[built.n % BUILD_ORDER.length]!;
  if (state.gold >= TOWERS[nextType].cost) {
    const spot = spots.find(
      (s) => !state.occupied.has(cellKey(s.cx, s.cy)),
    );
    if (spot && placeTower(state, nextType, spot.cx, spot.cy)) {
      built.n++;
      return;
    }
  }
  // Once established, funnel surplus gold into upgrades (lowest-invested first).
  if (state.towers.length >= UPGRADE_AFTER_TOWERS) {
    const candidates = [...state.towers].sort(
      (a, b) => a.invested - b.invested || a.id - b.id,
    );
    for (const tower of candidates) {
      const path = PATH_CHOICE[tower.type];
      const cost = upgradeCost(tower, path);
      if (cost !== null && state.gold >= cost) {
        upgradeTower(state, tower.id, path);
        return;
      }
    }
  }
}

function run(
  level: LevelDef,
  seed: number,
  verbose: boolean,
  difficulty: DifficultyId = "normal",
  mutators: MutatorId[] = [],
) {
  const state = createGame(level, seed, difficulty, undefined, mutators);
  const spots = rankedCells(level, state.tracks, state.pathCells);
  const built = { n: 0 };
  const maxTicks = 30 * 60 * 30; // 30 min safety cap

  while (state.status === "playing" && state.tick < maxTicks) {
    botAct(state, spots, built);
    if (canStartWave(state)) {
      if (state.waveIndex >= 0 && verbose) {
        console.log(
          `    after wave ${state.waveIndex + 1}: lives=${state.lives} gold=${state.gold} towers=${state.towers.length}`,
        );
      }
      startWave(state);
    }
    step(state);
  }
  const invested = state.towers.reduce((s, t) => s + t.invested, 0);
  return {
    status: state.status,
    tick: state.tick,
    gold: state.gold,
    lives: state.lives,
    towers: state.towers.length,
    invested,
    waveIndex: state.waveIndex,
  };
}

const seed = Number(process.argv[2]) || 20260702;
const verbose = !!process.env.VERBOSE;
const levels: LevelDef[] = LEVELS;

let failed = false;
for (const level of levels) {
  const a = run(level, seed, verbose);
  const b = run(level, seed, false);
  const identical = JSON.stringify(a) === JSON.stringify(b);
  const flag = !identical ? "NON-DETERMINISTIC" : a.status !== "won" ? "UNWINNABLE" : "ok";
  console.log(
    `${level.id} "${level.name}": ${a.status} lives=${a.lives}/${level.startLives} ` +
      `towers=${a.towers} invested=${a.invested} tick=${a.tick} [${flag}]`,
  );
  if (!identical || a.status !== "won") failed = true;
}

// Hard difficulty is allowed to beat the greedy bot — only check determinism.
for (const level of levels) {
  const a = run(level, seed, false, "hard");
  const b = run(level, seed, false, "hard");
  const identical = JSON.stringify(a) === JSON.stringify(b);
  console.log(
    `${level.id} "${level.name}" [hard]: ${a.status} lives=${a.lives}/${level.startLives} ` +
      `[${identical ? "ok" : "NON-DETERMINISTIC"}]`,
  );
  if (!identical) failed = true;
}

// Mutators, like Hard, are allowed to beat the greedy bot — only check determinism.
for (const level of levels) {
  const a = run(level, seed, false, "normal", MUTATOR_ORDER);
  const b = run(level, seed, false, "normal", MUTATOR_ORDER);
  const identical = JSON.stringify(a) === JSON.stringify(b);
  console.log(
    `${level.id} "${level.name}" [all-mutators]: ${a.status} lives=${a.lives}/${level.startLives} ` +
      `[${identical ? "ok" : "NON-DETERMINISTIC"}]`,
  );
  if (!identical) failed = true;
}

// Sample generated daily levels: every one must be winnable.
const DAILY_SAMPLE = Number(process.env.DAILY_SAMPLE ?? 20);
const dailyLives: number[] = [];
for (let i = 0; i < DAILY_SAMPLE; i++) {
  const d = new Date(Date.UTC(2026, 6, 1 + i));
  const ds = d.toISOString().slice(0, 10);
  const level = generateDailyLevel(ds);
  const r = run(level, dailyRunSeed(ds), false);
  dailyLives.push(r.status === "won" ? r.lives : -1);
  if (r.status !== "won") {
    console.log(`  daily ${ds}: LOST at tick ${r.tick} (waves=${level.waves.length}, path=${level.paths[0]!.length} pts)`);
    failed = true;
  }
}
const wins = dailyLives.filter((l) => l >= 0);
console.log(
  `daily sample: ${wins.length}/${DAILY_SAMPLE} winnable, lives min=${Math.min(...wins)} ` +
    `median=${[...wins].sort((a, b) => a - b)[Math.floor(wins.length / 2)]}`,
);

// Endless: only determinism matters — the escalating wave budget guarantees
// the bot eventually loses, and that's by design, not a failure.
const endlessA = run(createEndlessLevel(seed), seed, false);
const endlessB = run(createEndlessLevel(seed), seed, false);
const endlessIdentical = JSON.stringify(endlessA) === JSON.stringify(endlessB);
console.log(
  `Endless (seed=${seed}): ${endlessA.status} at wave ${endlessA.waveIndex + 1} ` +
    `lives=${endlessA.lives} tick=${endlessA.tick} [${endlessIdentical ? "ok" : "NON-DETERMINISTIC"}]`,
);
if (!endlessIdentical) failed = true;

if (failed) {
  console.error("FAIL: see flags above");
  process.exit(1);
}
console.log("OK: all levels deterministic and winnable");
