import { LEVEL_01, type LevelDef } from "./level01";

/**
 * Campaign levels in play order. Each is unlocked by winning the previous.
 * Difficulty grows through path shape (shorter = less dps time; split
 * board = awkward coverage) and wave composition, not just bigger numbers.
 */

const LEVEL_02: LevelDef = {
  id: "L2",
  name: "Switchback",
  cols: 9,
  rows: 16,
  path: [
    [6, 0],
    [6, 2],
    [2, 2],
    [2, 5],
    [7, 5],
    [7, 9],
    [1, 9],
    [1, 13],
    [5, 13],
    [5, 15],
  ],
  waves: [
    { groups: [{ enemy: "grunt", count: 9, hp: 5, spawnInterval: 22 }] },
    {
      groups: [
        { enemy: "runner", count: 6, hp: 5, spawnInterval: 14 },
        { enemy: "grunt", count: 8, hp: 7, spawnInterval: 20 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 14, hp: 9, spawnInterval: 7 },
        { enemy: "grunt", count: 8, hp: 9, spawnInterval: 18 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 3, hp: 14, spawnInterval: 46 },
        { enemy: "runner", count: 8, hp: 8, spawnInterval: 12 },
      ],
    },
    {
      groups: [
        { enemy: "grunt", count: 12, hp: 11, spawnInterval: 15 },
        { enemy: "swarm", count: 18, hp: 11, spawnInterval: 6 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 4, hp: 17, spawnInterval: 42 },
        { enemy: "runner", count: 10, hp: 10, spawnInterval: 11 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 5, hp: 19, spawnInterval: 38 },
        { enemy: "grunt", count: 12, hp: 14, spawnInterval: 13 },
        { enemy: "runner", count: 8, hp: 12, spawnInterval: 10 },
      ],
    },
  ],
  startGold: 110,
  startLives: 20,
};

const LEVEL_03: LevelDef = {
  id: "L3",
  name: "The Long Way",
  cols: 9,
  rows: 16,
  path: [
    [0, 1],
    [7, 1],
    [7, 13],
    [1, 13],
    [1, 5],
    [4, 5],
    [4, 10],
    [8, 10],
  ],
  waves: [
    { groups: [{ enemy: "grunt", count: 10, hp: 6, spawnInterval: 20 }] },
    {
      groups: [
        { enemy: "runner", count: 8, hp: 6, spawnInterval: 13 },
        { enemy: "grunt", count: 8, hp: 8, spawnInterval: 18 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 3, hp: 15, spawnInterval: 44 },
        { enemy: "swarm", count: 16, hp: 10, spawnInterval: 6 },
      ],
    },
    {
      groups: [
        { enemy: "grunt", count: 12, hp: 11, spawnInterval: 15 },
        { enemy: "runner", count: 10, hp: 9, spawnInterval: 11 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 24, hp: 12, spawnInterval: 5 },
        { enemy: "brute", count: 3, hp: 18, spawnInterval: 40 },
      ],
    },
    {
      groups: [
        { enemy: "runner", count: 14, hp: 11, spawnInterval: 9 },
        { enemy: "grunt", count: 12, hp: 14, spawnInterval: 13 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 5, hp: 21, spawnInterval: 36 },
        { enemy: "swarm", count: 20, hp: 13, spawnInterval: 5 },
        { enemy: "runner", count: 10, hp: 13, spawnInterval: 9 },
      ],
    },
  ],
  startGold: 120,
  startLives: 20,
};

const LEVEL_04: LevelDef = {
  id: "L4",
  name: "Crossroads",
  cols: 9,
  rows: 16,
  path: [
    [4, 0],
    [4, 6],
    [1, 6],
    [1, 3],
    [7, 3],
    [7, 9],
    [4, 9],
    [4, 15],
  ],
  waves: [
    {
      groups: [
        { enemy: "grunt", count: 10, hp: 8, spawnInterval: 18 },
        { enemy: "runner", count: 6, hp: 7, spawnInterval: 12 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 3, hp: 16, spawnInterval: 42 },
        { enemy: "grunt", count: 10, hp: 10, spawnInterval: 15 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 22, hp: 12, spawnInterval: 5 },
        { enemy: "runner", count: 10, hp: 10, spawnInterval: 10 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 4, hp: 19, spawnInterval: 38 },
        { enemy: "swarm", count: 18, hp: 13, spawnInterval: 5 },
      ],
    },
    {
      groups: [
        { enemy: "runner", count: 14, hp: 12, spawnInterval: 9 },
        { enemy: "grunt", count: 14, hp: 14, spawnInterval: 12 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 4, hp: 22, spawnInterval: 36 },
        { enemy: "runner", count: 12, hp: 13, spawnInterval: 9 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 6, hp: 24, spawnInterval: 34 },
        { enemy: "grunt", count: 14, hp: 16, spawnInterval: 11 },
        { enemy: "swarm", count: 22, hp: 15, spawnInterval: 5 },
      ],
    },
  ],
  startGold: 130,
  startLives: 20,
};

const LEVEL_05: LevelDef = {
  id: "L5",
  name: "The Gauntlet",
  cols: 9,
  rows: 16,
  path: [
    [4, 0],
    [4, 4],
    [1, 4],
    [1, 8],
    [7, 8],
    [7, 12],
    [4, 12],
    [4, 15],
  ],
  waves: [
    {
      groups: [
        { enemy: "grunt", count: 10, hp: 8, spawnInterval: 18 },
        { enemy: "runner", count: 6, hp: 7, spawnInterval: 12 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 16, hp: 10, spawnInterval: 6 },
        { enemy: "grunt", count: 8, hp: 10, spawnInterval: 16 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 3, hp: 14, spawnInterval: 42 },
        { enemy: "runner", count: 8, hp: 10, spawnInterval: 10 },
      ],
    },
    {
      groups: [
        { enemy: "grunt", count: 12, hp: 13, spawnInterval: 13 },
        { enemy: "swarm", count: 18, hp: 12, spawnInterval: 5 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 4, hp: 18, spawnInterval: 38 },
        { enemy: "runner", count: 10, hp: 12, spawnInterval: 9 },
      ],
    },
    {
      groups: [
        { enemy: "swarm", count: 24, hp: 14, spawnInterval: 4 },
        { enemy: "grunt", count: 12, hp: 15, spawnInterval: 11 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 5, hp: 22, spawnInterval: 32 },
        { enemy: "runner", count: 12, hp: 14, spawnInterval: 8 },
      ],
    },
    {
      groups: [
        { enemy: "brute", count: 6, hp: 25, spawnInterval: 30 },
        { enemy: "grunt", count: 14, hp: 17, spawnInterval: 10 },
        { enemy: "swarm", count: 20, hp: 15, spawnInterval: 4 },
      ],
    },
  ],
  startGold: 140,
  startLives: 20,
};

export const LEVELS: LevelDef[] = [LEVEL_01, LEVEL_02, LEVEL_03, LEVEL_04, LEVEL_05];
