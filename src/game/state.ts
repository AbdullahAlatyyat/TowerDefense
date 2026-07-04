import {
  buildTrack,
  cellKey,
  unionPathCells,
  type PathTrack,
} from "../core/grid";
import { createRng, type Rng } from "../core/rng";
import type { LevelDef } from "../data/level01";
import type { EnemyTypeId } from "../data/enemies";
import { DIFFICULTIES, type DifficultyId } from "../data/difficulty";
import { MUTATORS, type MutatorId } from "../data/mutators";
import {
  SELL_REFUND,
  TOWERS,
  type DamageType,
  type TowerStats,
  type TowerTypeId,
} from "../data/towers";
import { updateEnemies, updateSpawner } from "./enemies";
import { updateHero } from "./hero";
import { updateTowers } from "./towers";
import { checkWaveEnd } from "./waves";

export interface Enemy {
  id: number;
  type: EnemyTypeId;
  /** index into GameState.tracks — which lane this enemy is following */
  laneIndex: number;
  /** distance travelled along the path track, in cells */
  dist: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  bounty: number;
  /** slow debuff (frost) */
  slowUntilTick: number;
  slowFactor: number;
  /** brittle mark (frost Brittle path): bonus damage taken from all sources */
  brittleUntilTick: number;
  brittleBonus: number;
  /** poison/burn DoT (alchemist): single-slot, overwrite semantics like slow/brittle */
  poisonUntilTick: number;
  poisonDamagePerTick: number;
  /** stun (tesla Paralysis): halts movement outright, distinct from a slow */
  stunUntilTick: number;
  /** current/max shield pool (Warden); 0 for enemies without a shield */
  shieldHp: number;
  shieldMax: number;
  /** tick this enemy last took damage, for shield-regen delay */
  lastHitTick: number;
  /** bumped whenever hp actually decreases; renderer diffs it for a hit-flash */
  hitSeq: number;
}

export type TargetMode = "first" | "last" | "close" | "strong";
export const TARGET_MODES: TargetMode[] = ["first", "last", "close", "strong"];

export interface Tower {
  id: number;
  type: TowerTypeId;
  cx: number;
  cy: number;
  x: number;
  y: number;
  cooldown: number;
  /** chosen upgrade path; null until the first upgrade commits one */
  path: 0 | 1 | null;
  /** 0 = base, 1..3 = tier within the chosen path */
  tier: 0 | 1 | 2 | 3;
  /** total gold spent (place + upgrades); sell refunds SELL_REFUND of it */
  invested: number;
  /** which in-range enemy to fire at */
  targetMode: TargetMode;
  /** for muzzle rotation in the renderer */
  aimX: number;
  aimY: number;
}

export interface Hero {
  id: number;
  cx: number;
  cy: number;
  x: number;
  y: number;
  cooldown: number;
  targetMode: TargetMode;
  aimX: number;
  aimY: number;
  /** ticks remaining until the nova ability can be triggered again */
  abilityCooldown: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  /** stats snapshotted from the tower (or hero) at fire time */
  damage: number;
  speed: number;
  /** which tower type fired this, or "hero" for the hero unit's own shots */
  towerType: TowerTypeId | "hero";
  splashRadius: number;
  slowFactor: number;
  slowTicks: number;
  brittleBonus: number;
  brittleTicks: number;
  damageType: DamageType;
  dotDamagePerTick: number;
  dotTicks: number;
  stunTicks: number;
  chainCount: number;
  chainRadius: number;
  chainFalloff: number;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  level: LevelDef;
  rng: Rng;
  seed: number;
  difficulty: DifficultyId;
  mutators: MutatorId[];
  tracks: PathTrack[];
  pathCells: Set<number>;
  occupied: Set<number>;

  tick: number;
  status: GameStatus;
  gold: number;
  lives: number;

  /** index of the current/last started wave; -1 before the first */
  waveIndex: number;
  waveActive: boolean;
  /** index into the current wave's groups */
  groupIndex: number;
  /** enemies left to spawn in the current group */
  spawnRemaining: number;
  nextSpawnTick: number;

  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  nextId: number;
  /** lifetime-this-run count of enemies killed by a non-physical damage type */
  elementalKills: number;

  /** null until deployed; at most one per run, but persists levels across runs via heroXp */
  hero: Hero | null;
  /** persistent lifetime XP (kills), seeded from the save and grown as enemies die this run */
  heroXp: number;
}

/** Flat bonuses from owned meta-upgrades, applied on top of the difficulty scalar. */
export interface MetaBonus {
  goldBonus: number;
  livesBonus: number;
}

const NO_META_BONUS: MetaBonus = { goldBonus: 0, livesBonus: 0 };

export function createGame(
  level: LevelDef,
  seed: number,
  difficulty: DifficultyId = "normal",
  metaBonus: MetaBonus = NO_META_BONUS,
  mutators: MutatorId[] = [],
  heroXp = 0,
): GameState {
  const mutatorGoldMul = mutators.reduce((m, id) => m * (MUTATORS[id].goldMul ?? 1), 1);
  return {
    level,
    rng: createRng(seed),
    seed,
    difficulty,
    mutators,
    tracks: level.paths.map((p) => buildTrack(p)),
    pathCells: unionPathCells(level.paths),
    occupied: new Set(),
    tick: 0,
    status: "playing",
    gold:
      Math.round(level.startGold * DIFFICULTIES[difficulty].goldMul * mutatorGoldMul) +
      metaBonus.goldBonus,
    lives: level.startLives + metaBonus.livesBonus,
    waveIndex: -1,
    waveActive: false,
    groupIndex: 0,
    spawnRemaining: 0,
    nextSpawnTick: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    nextId: 1,
    elementalKills: 0,
    hero: null,
    heroXp,
  };
}

/** Advance the simulation by exactly one tick. Deterministic. */
export function step(state: GameState): void {
  if (state.status !== "playing") return;
  state.tick++;
  updateSpawner(state);
  updateEnemies(state);
  updateTowers(state);
  updateHero(state);
  checkWaveEnd(state);
}

/** Current effective stats: base at tier 0, else the chosen path's tier. */
export function towerStats(tower: Tower): TowerStats {
  const def = TOWERS[tower.type];
  if (tower.tier === 0 || tower.path === null) return def.base;
  return def.paths[tower.path].tiers[(tower.tier - 1) as 0 | 1 | 2].stats;
}

/**
 * towerStats(tower) with active Beacon-style aura buffs folded in. Bonuses from
 * every aura-radiating tower in range stack additively (not compounding), so
 * overlap is order-independent; iterates state.towers in stable array order.
 */
export function effectiveTowerStats(state: GameState, tower: Tower): TowerStats {
  const base = towerStats(tower);
  let damageMul = 1;
  let rateMul = 1;
  let rangeMul = 1;
  for (const other of state.towers) {
    if (other.id === tower.id) continue;
    const aura = towerStats(other).aura;
    if (!aura) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (dx * dx + dy * dy > aura.radius * aura.radius) continue;
    damageMul += (aura.damageMul ?? 1) - 1;
    rateMul += (aura.rateMul ?? 1) - 1;
    rangeMul += (aura.rangeMul ?? 1) - 1;
  }
  if (damageMul === 1 && rateMul === 1 && rangeMul === 1) return base;
  return {
    ...base,
    damage: base.damage * damageMul,
    cooldownTicks: Math.max(1, Math.round(base.cooldownTicks * rateMul)),
    range: base.range * rangeMul,
  };
}

export function canPlaceTower(
  state: GameState,
  type: TowerTypeId,
  cx: number,
  cy: number,
): boolean {
  const { level } = state;
  if (cx < 0 || cy < 0 || cx >= level.cols || cy >= level.rows) return false;
  const key = cellKey(cx, cy);
  return (
    !state.pathCells.has(key) &&
    !state.occupied.has(key) &&
    state.gold >= TOWERS[type].cost
  );
}

export function placeTower(
  state: GameState,
  type: TowerTypeId,
  cx: number,
  cy: number,
): boolean {
  if (!canPlaceTower(state, type, cx, cy)) return false;
  const cost = TOWERS[type].cost;
  state.gold -= cost;
  state.occupied.add(cellKey(cx, cy));
  state.towers.push({
    id: state.nextId++,
    type,
    cx,
    cy,
    x: cx + 0.5,
    y: cy + 0.5,
    cooldown: 0,
    path: null,
    tier: 0,
    invested: cost,
    targetMode: "first",
    aimX: 0,
    aimY: -1,
  });
  return true;
}

/** Cost of the next tier on a path, or null if that upgrade is unavailable. */
export function upgradeCost(tower: Tower, pathIdx: 0 | 1): number | null {
  if (tower.tier >= 3) return null;
  if (tower.path !== null && tower.path !== pathIdx) return null;
  return TOWERS[tower.type].paths[pathIdx].tiers[tower.tier as 0 | 1 | 2].cost;
}

export function upgradeTower(
  state: GameState,
  towerId: number,
  pathIdx: 0 | 1,
): boolean {
  if (state.status !== "playing") return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  const cost = upgradeCost(tower, pathIdx);
  if (cost === null || state.gold < cost) return false;
  state.gold -= cost;
  tower.invested += cost;
  tower.path = pathIdx;
  tower.tier = (tower.tier + 1) as 1 | 2 | 3;
  return true;
}

export function setTargetMode(
  state: GameState,
  towerId: number,
  mode: TargetMode,
): boolean {
  if (state.status !== "playing") return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  tower.targetMode = mode;
  return true;
}

export function sellValue(tower: Tower): number {
  return Math.floor(tower.invested * SELL_REFUND);
}

export function sellTower(state: GameState, towerId: number): boolean {
  if (state.status !== "playing") return false;
  if (state.mutators.some((id) => MUTATORS[id].noSell)) return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  state.gold += sellValue(tower);
  state.occupied.delete(cellKey(tower.cx, tower.cy));
  state.towers = state.towers.filter((t) => t.id !== towerId);
  return true;
}
