import { TICK_DT } from "../core/loop";
import { towerStats, type Enemy, type GameState, type Projectile } from "./state";

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
    const stats = towerStats(tower);
    const target = acquireTarget(state, tower.x, tower.y, stats.range);
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
    });
  }
}

/** Target the in-range enemy that is furthest along the path ("first"). */
function acquireTarget(
  state: GameState,
  x: number,
  y: number,
  range: number,
): Enemy | undefined {
  let best: Enemy | undefined;
  const rangeSq = range * range;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx * dx + dy * dy > rangeSq) continue;
    if (!best || enemy.dist > best.dist) best = enemy;
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
  if (proj.splashRadius > 0) {
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

function applyDamage(state: GameState, proj: Projectile, enemy: Enemy): void {
  if (!state.enemies.includes(enemy)) return; // already killed by this splash

  const brittle =
    state.tick < enemy.brittleUntilTick ? enemy.brittleBonus : 0;
  enemy.hp -= proj.damage * (1 + brittle);

  if (enemy.hp <= 0) {
    state.gold += enemy.bounty;
    state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
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
}
