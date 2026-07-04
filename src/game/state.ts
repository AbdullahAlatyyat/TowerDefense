import {
  buildTrack,
  cellKey,
  expandPathCells,
  type PathTrack,
} from "../core/grid";
import { createRng, type Rng } from "../core/rng";
import type { LevelDef } from "../data/level01";
import type { EnemyTypeId } from "../data/enemies";
import {
  SELL_REFUND,
  TOWERS,
  type TowerStats,
  type TowerTypeId,
} from "../data/towers";
import { updateEnemies, updateSpawner } from "./enemies";
import { updateTowers } from "./towers";
import { checkWaveEnd } from "./waves";

export interface Enemy {
  id: number;
  type: EnemyTypeId;
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
}

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
  /** 0 = base, 1..2 = tier within the chosen path */
  tier: 0 | 1 | 2;
  /** total gold spent (place + upgrades); sell refunds SELL_REFUND of it */
  invested: number;
  /** for muzzle rotation in the renderer */
  aimX: number;
  aimY: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  /** stats snapshotted from the tower at fire time */
  damage: number;
  speed: number;
  towerType: TowerTypeId;
  splashRadius: number;
  slowFactor: number;
  slowTicks: number;
  brittleBonus: number;
  brittleTicks: number;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  level: LevelDef;
  rng: Rng;
  seed: number;
  track: PathTrack;
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
}

export function createGame(level: LevelDef, seed: number): GameState {
  return {
    level,
    rng: createRng(seed),
    seed,
    track: buildTrack(level.path),
    pathCells: expandPathCells(level.path),
    occupied: new Set(),
    tick: 0,
    status: "playing",
    gold: level.startGold,
    lives: level.startLives,
    waveIndex: -1,
    waveActive: false,
    groupIndex: 0,
    spawnRemaining: 0,
    nextSpawnTick: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    nextId: 1,
  };
}

/** Advance the simulation by exactly one tick. Deterministic. */
export function step(state: GameState): void {
  if (state.status !== "playing") return;
  state.tick++;
  updateSpawner(state);
  updateEnemies(state);
  updateTowers(state);
  checkWaveEnd(state);
}

/** Current effective stats: base at tier 0, else the chosen path's tier. */
export function towerStats(tower: Tower): TowerStats {
  const def = TOWERS[tower.type];
  if (tower.tier === 0 || tower.path === null) return def.base;
  return def.paths[tower.path].tiers[(tower.tier - 1) as 0 | 1].stats;
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
    aimX: 0,
    aimY: -1,
  });
  return true;
}

/** Cost of the next tier on a path, or null if that upgrade is unavailable. */
export function upgradeCost(tower: Tower, pathIdx: 0 | 1): number | null {
  if (tower.tier >= 2) return null;
  if (tower.path !== null && tower.path !== pathIdx) return null;
  return TOWERS[tower.type].paths[pathIdx].tiers[tower.tier as 0 | 1].cost;
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
  tower.tier = (tower.tier + 1) as 1 | 2;
  return true;
}

export function sellValue(tower: Tower): number {
  return Math.floor(tower.invested * SELL_REFUND);
}

export function sellTower(state: GameState, towerId: number): boolean {
  if (state.status !== "playing") return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  state.gold += sellValue(tower);
  state.occupied.delete(cellKey(tower.cx, tower.cy));
  state.towers = state.towers.filter((t) => t.id !== towerId);
  return true;
}
