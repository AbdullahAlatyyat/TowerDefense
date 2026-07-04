import type { Cell } from "../core/grid";
import type { EnemyTypeId } from "./enemies";

export interface WaveGroup {
  enemy: EnemyTypeId;
  count: number;
  /** base hp; effective hp = round(hp × EnemyDef.hpMul) */
  hp: number;
  /** ticks between spawns */
  spawnInterval: number;
  /** index into LevelDef.paths this group spawns on; default 0 */
  path?: number;
}

/** Groups spawn sequentially in order. */
export interface WaveDef {
  groups: WaveGroup[];
}

export interface LevelDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /**
   * One or more parallel lanes, each a list of orthogonal waypoint cells
   * from entrance to exit. Most levels have exactly one.
   */
  paths: readonly (readonly Cell[])[];
  waves: readonly WaveDef[];
  startGold: number;
  startLives: number;
  /** Survival mode: waves are generated on demand instead of running out. */
  endless?: boolean;
}

/** Portrait 9×16 board with an S-shaped path, top entrance to bottom exit. */
export const LEVEL_01: LevelDef = {
  id: "L1",
  name: "The Bends",
  cols: 9,
  rows: 16,
  paths: [
    [
      [2, 0],
      [2, 3],
      [6, 3],
      [6, 7],
      [1, 7],
      [1, 11],
      [7, 11],
      [7, 15],
    ],
  ],
  waves: [
    {
      groups: [{ enemy: "grunt", count: 8, hp: 4, spawnInterval: 24 }],
    },
    {
      groups: [
        { enemy: "grunt", count: 8, hp: 6, spawnInterval: 22 },
        { enemy: "runner", count: 4, hp: 5, spawnInterval: 16 },
        { enemy: "wisp", count: 1, hp: 5, spawnInterval: 16 },
      ],
    },
    {
      groups: [
        { enemy: "runner", count: 6, hp: 6, spawnInterval: 14 },
        { enemy: "grunt", count: 10, hp: 8, spawnInterval: 20 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 3, hp: 13, spawnInterval: 46 },
        { enemy: "grunt", count: 9, hp: 10, spawnInterval: 17 },
        { enemy: "golem", count: 1, hp: 13, spawnInterval: 46 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 20, hp: 10, spawnInterval: 6 },
        { enemy: "runner", count: 10, hp: 9, spawnInterval: 12 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 5, hp: 16, spawnInterval: 40 },
        { enemy: "grunt", count: 12, hp: 13, spawnInterval: 14 },
        { enemy: "runner", count: 8, hp: 11, spawnInterval: 11 },
        { enemy: "warlord", count: 1, hp: 16, spawnInterval: 1 },
      ],
    },
  ],
  startGold: 100,
  startLives: 20,
};
