import { TICK_DT } from "../core/loop";
import { pointAtDistance } from "../core/grid";
import { ENEMIES } from "../data/enemies";
import { DIFFICULTIES } from "../data/difficulty";
import { MUTATORS } from "../data/mutators";
import type { GameState } from "./state";
import { killEnemy } from "./towers";

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
  const laneIndex = group.path ?? 0;
  const start = pointAtDistance(state.tracks[laneIndex]!, 0);
  const mutatorHpMul = state.mutators.reduce((m, id) => m * (MUTATORS[id].hpMul ?? 1), 1);
  const hp = Math.max(
    1,
    Math.round(group.hp * def.hpMul * DIFFICULTIES[state.difficulty].hpMul * mutatorHpMul),
  );
  const shieldMax = def.shieldFrac ? Math.round(hp * def.shieldFrac) : 0;
  state.enemies.push({
    id: state.nextId++,
    type: group.enemy,
    laneIndex,
    dist: 0,
    x: start.x,
    y: start.y,
    // small seeded variation so the column of enemies breaks up naturally
    speed: def.speed * state.rng.range(0.92, 1.08),
    hp,
    maxHp: hp,
    bounty: def.bounty,
    slowUntilTick: 0,
    slowFactor: 1,
    brittleUntilTick: 0,
    brittleBonus: 0,
    poisonUntilTick: 0,
    poisonDamagePerTick: 0,
    stunUntilTick: 0,
    shieldHp: shieldMax,
    shieldMax,
    lastHitTick: -Infinity,
    hitSeq: 0,
  });
  state.spawnRemaining--;
  state.nextSpawnTick = state.tick + group.spawnInterval;
}

export function updateEnemies(state: GameState): void {
  const survivors: typeof state.enemies = [];
  for (const enemy of state.enemies) {
    const def = ENEMIES[enemy.type];
    if (def.regenPerTick) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + def.regenPerTick);
    }
    if (
      enemy.shieldMax > 0 &&
      enemy.shieldHp < enemy.shieldMax &&
      state.tick - enemy.lastHitTick >= (def.shieldRegenDelayTicks ?? 0)
    ) {
      enemy.shieldHp = Math.min(enemy.shieldMax, enemy.shieldHp + enemy.shieldMax / 60);
    }

    if (state.tick < enemy.poisonUntilTick) {
      enemy.hp -= enemy.poisonDamagePerTick;
      if (enemy.poisonDamagePerTick > 0) enemy.hitSeq++;
      if (enemy.hp <= 0) {
        killEnemy(state, enemy, true);
        continue;
      }
    }

    const track = state.tracks[enemy.laneIndex]!;
    const stunned = state.tick < enemy.stunUntilTick;
    const slowed = !stunned && state.tick < enemy.slowUntilTick;
    enemy.dist += enemy.speed * (stunned ? 0 : slowed ? enemy.slowFactor : 1) * TICK_DT;
    if (enemy.dist >= track.length) {
      state.lives--;
      continue;
    }
    const p = pointAtDistance(track, enemy.dist);
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
