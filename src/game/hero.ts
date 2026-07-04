import { cellKey } from "../core/grid";
import { HERO, heroStatsForXp } from "../data/hero";
import type { GameState, Projectile } from "./state";
import { acquireTarget, applyDamage } from "./towers";

export function canPlaceHero(state: GameState, cx: number, cy: number): boolean {
  if (state.hero) return false;
  const { level } = state;
  if (cx < 0 || cy < 0 || cx >= level.cols || cy >= level.rows) return false;
  const key = cellKey(cx, cy);
  return !state.pathCells.has(key) && !state.occupied.has(key) && state.gold >= HERO.cost;
}

export function placeHero(state: GameState, cx: number, cy: number): boolean {
  if (!canPlaceHero(state, cx, cy)) return false;
  state.gold -= HERO.cost;
  state.occupied.add(cellKey(cx, cy));
  state.hero = {
    id: state.nextId++,
    cx,
    cy,
    x: cx + 0.5,
    y: cy + 0.5,
    cooldown: 0,
    targetMode: "first",
    aimX: 0,
    aimY: -1,
    abilityCooldown: 0,
  };
  return true;
}

export function updateHero(state: GameState): void {
  const hero = state.hero;
  if (!hero || state.status !== "playing") return;
  if (hero.abilityCooldown > 0) hero.abilityCooldown--;
  if (hero.cooldown > 0) {
    hero.cooldown--;
    return;
  }
  const stats = heroStatsForXp(state.heroXp);
  const target = acquireTarget(state, hero.x, hero.y, stats.range, hero.targetMode);
  if (!target) return;
  hero.aimX = target.x - hero.x;
  hero.aimY = target.y - hero.y;
  hero.cooldown = stats.cooldownTicks;
  state.projectiles.push({
    id: state.nextId++,
    x: hero.x,
    y: hero.y,
    targetId: target.id,
    damage: stats.damage,
    speed: stats.projectileSpeed,
    towerType: "hero",
    splashRadius: 0,
    slowFactor: 1,
    slowTicks: 0,
    brittleBonus: 0,
    brittleTicks: 0,
    damageType: "physical",
    dotDamagePerTick: 0,
    dotTicks: 0,
    stunTicks: 0,
    chainCount: 0,
    chainRadius: 0,
    chainFalloff: 0,
  });
}

/** On-demand AoE burst + stun around the hero. False if no hero or still on cooldown. */
export function activateHeroAbility(state: GameState): boolean {
  const hero = state.hero;
  if (!hero || state.status !== "playing" || hero.abilityCooldown > 0) return false;
  const { radius, damage, stunTicks, cooldownTicks } = HERO.ability;
  const rSq = radius * radius;
  const proj: Projectile = {
    id: -1,
    x: hero.x,
    y: hero.y,
    targetId: -1,
    damage,
    speed: 0,
    towerType: "hero",
    splashRadius: 0,
    slowFactor: 1,
    slowTicks: 0,
    brittleBonus: 0,
    brittleTicks: 0,
    damageType: "physical",
    dotDamagePerTick: 0,
    dotTicks: 0,
    stunTicks,
    chainCount: 0,
    chainRadius: 0,
    chainFalloff: 0,
  };
  // Snapshot: damage can kill and mutate state.enemies via applyDamage.
  for (const enemy of [...state.enemies]) {
    const dx = enemy.x - hero.x;
    const dy = enemy.y - hero.y;
    if (dx * dx + dy * dy <= rSq) applyDamage(state, proj, enemy);
  }
  hero.abilityCooldown = cooldownTicks;
  return true;
}
