import { TICK_DT } from "../core/loop";
import { ENEMIES } from "../data/enemies";
import {
  effectiveTowerStats,
  type Enemy,
  type GameState,
  type Projectile,
  type TargetMode,
} from "./state";

const HIT_RADIUS = 0.18;

export function updateTowers(state: GameState): void {
  fireTowers(state);
  moveProjectiles(state);
}

function fireTowers(state: GameState): void {
  for (const tower of state.towers) {
    if (tower.cooldown > 0) {
      tower.cooldown--;
      continue;
    }
    const stats = effectiveTowerStats(state, tower);
    if (stats.damage <= 0) continue; // Beacon-style support towers never fire
    const target = acquireTarget(state, tower.x, tower.y, stats.range, tower.targetMode);
    if (!target) continue;
    tower.aimX = target.x - tower.x;
    tower.aimY = target.y - tower.y;
    tower.cooldown = stats.cooldownTicks;
    state.projectiles.push({
      id: state.nextId++,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      damage: stats.damage,
      speed: stats.projectileSpeed,
      towerType: tower.type,
      splashRadius: stats.splashRadius ?? 0,
      slowFactor: stats.slowFactor ?? 1,
      slowTicks: stats.slowTicks ?? 0,
      brittleBonus: stats.brittleBonus ?? 0,
      brittleTicks: stats.brittleTicks ?? 0,
      damageType: stats.damageType ?? "physical",
      dotDamagePerTick: stats.dotDamagePerTick ?? 0,
      dotTicks: stats.dotTicks ?? 0,
      stunTicks: stats.stunTicks ?? 0,
      chainCount: stats.chainCount ?? 0,
      chainRadius: stats.chainRadius ?? 0,
      chainFalloff: stats.chainFalloff ?? 0,
    });
  }
}

/** Target the in-range enemy scored highest by the tower's targeting mode. */
function acquireTarget(
  state: GameState,
  x: number,
  y: number,
  range: number,
  mode: TargetMode,
): Enemy | undefined {
  let best: Enemy | undefined;
  let bestScore = -Infinity;
  const rangeSq = range * range;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq > rangeSq) continue;
    const score =
      mode === "first"
        ? enemy.dist
        : mode === "last"
          ? -enemy.dist
          : mode === "close"
            ? -distSq
            : enemy.hp;
    if (!best || score > bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function moveProjectiles(state: GameState): void {
  const alive: typeof state.projectiles = [];

  for (const proj of state.projectiles) {
    const target = state.enemies.find((e) => e.id === proj.targetId);
    if (!target) continue; // target already dead: drop the shot

    const dx = target.x - proj.x;
    const dy = target.y - proj.y;
    const distToTarget = Math.hypot(dx, dy);
    const travel = proj.speed * TICK_DT;

    if (distToTarget <= travel + HIT_RADIUS) {
      impact(state, proj, target);
      continue;
    }
    proj.x += (dx / distToTarget) * travel;
    proj.y += (dy / distToTarget) * travel;
    alive.push(proj);
  }
  state.projectiles = alive;
}

function impact(state: GameState, proj: Projectile, target: Enemy): void {
  if (proj.chainCount > 0) {
    chainImpact(state, proj, target);
  } else if (proj.splashRadius > 0) {
    const rSq = proj.splashRadius * proj.splashRadius;
    // Snapshot: damage can kill and mutate state.enemies via applyDamage.
    for (const enemy of [...state.enemies]) {
      const dx = enemy.x - target.x;
      const dy = enemy.y - target.y;
      if (dx * dx + dy * dy <= rSq) applyDamage(state, proj, enemy);
    }
  } else {
    applyDamage(state, proj, target);
  }
}

/** Chains from the primary target to up to chainCount nearest not-yet-hit
 * enemies within chainRadius, applying chainFalloff damage per bounce.
 * Purely geometric (no RNG) so replay/daily-seed determinism is unaffected. */
function chainImpact(state: GameState, proj: Projectile, first: Enemy): void {
  applyDamage(state, proj, first);
  const hit = new Set<number>([first.id]);
  let from = first;
  let dmg = proj.damage * proj.chainFalloff;
  for (let i = 0; i < proj.chainCount; i++) {
    const next = nearestUnhit(state, from, proj.chainRadius, hit);
    if (!next) break;
    applyDamage(state, { ...proj, damage: dmg }, next);
    hit.add(next.id);
    from = next;
    dmg *= proj.chainFalloff;
  }
}

function nearestUnhit(
  state: GameState,
  from: Enemy,
  radius: number,
  exclude: Set<number>,
): Enemy | undefined {
  let best: Enemy | undefined;
  let bestDistSq = radius * radius;
  for (const enemy of state.enemies) {
    if (exclude.has(enemy.id)) continue;
    const dx = enemy.x - from.x;
    const dy = enemy.y - from.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      best = enemy;
      bestDistSq = distSq;
    }
  }
  return best;
}

function applyDamage(state: GameState, proj: Projectile, enemy: Enemy): void {
  if (!state.enemies.includes(enemy)) return; // already killed by this splash/chain

  const def = ENEMIES[enemy.type];
  // Armor is a physical-only concept: other damage types bypass it entirely.
  let dmg =
    proj.damageType === "physical" && def.armor
      ? Math.max(0.1, proj.damage - def.armor)
      : proj.damage;
  const resist = def.resist?.[proj.damageType] ?? 1;
  dmg *= resist;
  const brittle =
    state.tick < enemy.brittleUntilTick ? enemy.brittleBonus : 0;
  dmg *= 1 + brittle;

  enemy.lastHitTick = state.tick;
  if (enemy.shieldHp > 0) {
    const absorbed = Math.min(enemy.shieldHp, dmg);
    enemy.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) enemy.hitSeq++;
  enemy.hp -= dmg;

  if (enemy.hp <= 0) {
    killEnemy(state, enemy, proj.damageType !== "physical");
    return;
  }
  // Debuffs only matter on survivors.
  if (proj.slowTicks > 0) {
    enemy.slowUntilTick = state.tick + proj.slowTicks;
    enemy.slowFactor = proj.slowFactor;
  }
  if (proj.brittleTicks > 0) {
    enemy.brittleUntilTick = state.tick + proj.brittleTicks;
    enemy.brittleBonus = proj.brittleBonus;
  }
  if (proj.dotTicks > 0) {
    enemy.poisonUntilTick = state.tick + proj.dotTicks;
    enemy.poisonDamagePerTick = proj.dotDamagePerTick * resist;
  }
  if (proj.stunTicks > 0) {
    enemy.stunUntilTick = state.tick + proj.stunTicks;
  }
}

/** Shared death handling for both projectile impacts and DoT ticks: grants
 * bounty, counts elemental kills for the "Shock and Awe" achievement, spawns
 * a split-on-death's replacements, and removes the enemy from play. */
export function killEnemy(state: GameState, enemy: Enemy, elemental: boolean): void {
  state.gold += enemy.bounty;
  if (elemental) state.elementalKills++;
  state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
  const def = ENEMIES[enemy.type];
  if (def.splitInto) spawnSplit(state, enemy, def.splitInto);
}

/** Deterministic on-death split: replacement enemies at the parent's spot. */
function spawnSplit(
  state: GameState,
  parent: Enemy,
  split: { type: Enemy["type"]; count: number; hpFrac: number },
): void {
  const childDef = ENEMIES[split.type];
  const hp = Math.max(1, Math.round(parent.maxHp * split.hpFrac));
  for (let i = 0; i < split.count; i++) {
    state.enemies.push({
      id: state.nextId++,
      type: split.type,
      laneIndex: parent.laneIndex,
      dist: parent.dist,
      x: parent.x,
      y: parent.y,
      speed: childDef.speed,
      hp,
      maxHp: hp,
      bounty: childDef.bounty,
      slowUntilTick: 0,
      slowFactor: 1,
      brittleUntilTick: 0,
      brittleBonus: 0,
      poisonUntilTick: 0,
      poisonDamagePerTick: 0,
      stunUntilTick: 0,
      shieldHp: 0,
      shieldMax: 0,
      lastHitTick: -Infinity,
      hitSeq: 0,
    });
  }
}
