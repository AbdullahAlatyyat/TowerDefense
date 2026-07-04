import { TICK_DT } from "../core/loop";
import { pointAtDistance } from "../core/grid";
import { ENEMIES } from "../data/enemies";
import type { GameState } from "./state";

/** Spawns the current wave's groups sequentially. */
export function updateSpawner(state: GameState): void {
  if (!state.waveActive) return;
  const wave = state.level.waves[state.waveIndex];
  if (!wave) return;

  // Advance to the next group once this one is exhausted.
  while (
    state.spawnRemaining <= 0 &&
    state.groupIndex < wave.groups.length - 1
  ) {
    state.groupIndex++;
    state.spawnRemaining = wave.groups[state.groupIndex]!.count;
  }
  if (state.spawnRemaining <= 0) return;
  if (state.tick < state.nextSpawnTick) return;

  const group = wave.groups[state.groupIndex]!;
  const def = ENEMIES[group.enemy];
  const start = pointAtDistance(state.track, 0);
  state.enemies.push({
    id: state.nextId++,
    type: group.enemy,
    dist: 0,
    x: start.x,
    y: start.y,
    // small seeded variation so the column of enemies breaks up naturally
    speed: def.speed * state.rng.range(0.92, 1.08),
    hp: Math.max(1, Math.round(group.hp * def.hpMul)),
    maxHp: Math.max(1, Math.round(group.hp * def.hpMul)),
    bounty: def.bounty,
    slowUntilTick: 0,
    slowFactor: 1,
    brittleUntilTick: 0,
    brittleBonus: 0,
  });
  state.spawnRemaining--;
  state.nextSpawnTick = state.tick + group.spawnInterval;
}

export function updateEnemies(state: GameState): void {
  const survivors: typeof state.enemies = [];
  for (const enemy of state.enemies) {
    const slowed = state.tick < enemy.slowUntilTick;
    enemy.dist += enemy.speed * (slowed ? enemy.slowFactor : 1) * TICK_DT;
    if (enemy.dist >= state.track.length) {
      state.lives--;
      continue;
    }
    const p = pointAtDistance(state.track, enemy.dist);
    enemy.x = p.x;
    enemy.y = p.y;
    survivors.push(enemy);
  }
  state.enemies = survivors;

  if (state.lives <= 0) {
    state.lives = 0;
    state.status = "lost";
  }
}
