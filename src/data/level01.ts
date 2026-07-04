import type { Cell } from "../core/grid";
import type { EnemyTypeId } from "./enemies";

export interface WaveGroup {
  enemy: EnemyTypeId;
  count: number;
  /** base hp; effective hp = round(hp × EnemyDef.hpMul) */
  hp: number;
  /** ticks between spawns */
  spawnInterval: number;
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
  /** Orthogonal waypoint cells from entrance to exit. */
  path: readonly Cell[];
  waves: readonly WaveDef[];
  startGold: number;
  startLives: number;
}

/** Portrait 9×16 board with an S-shaped path, top entrance to bottom exit. */
export const LEVEL_01: LevelDef = {
  id: "L1",
  name: "The Bends",
  cols: 9,
  rows: 16,
  path: [
    [2, 0],
    [2, 3],
    [6, 3],
    [6, 7],
    [1, 7],
    [1, 11],
    [7, 11],
    [7, 15],
  ],
  waves: [
    {
      groups: [{ enemy: "grunt", count: 8, hp: 4, spawnInterval: 24 }],
    },
    {
      groups: [
        { enemy: "grunt", count: 8, hp: 6, spawnInterval: 22 },
        { enemy: "runner", count: 4, hp: 5, spawnInterval: 16 },
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
      ],
    },
  ],
  startGold: 100,
  startLives: 20,
};
