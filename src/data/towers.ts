export type TowerTypeId = "gunner" | "cannon" | "frost" | "sniper";

/**
 * Absolute stat block for one tower state. Upgrade tiers are full overrides,
 * not deltas — what you see in the tier is exactly what the tower has.
 */
export interface TowerStats {
  damage: number;
  /** cells */
  range: number;
  cooldownTicks: number;
  /** cells per second */
  projectileSpeed: number;
  /** cells; damages every enemy within this radius of the impact */
  splashRadius?: number;
  /** speed multiplier applied to the target (0.4 = 60% slower) */
  slowFactor?: number;
  /** how long the slow lasts */
  slowTicks?: number;
  /** extra damage multiplier all sources deal to enemies marked by this tower */
  brittleBonus?: number;
  brittleTicks?: number;
}

export interface UpgradeTier {
  cost: number;
  label: string;
  stats: TowerStats;
}

export interface UpgradePath {
  name: string;
  tiers: [UpgradeTier, UpgradeTier];
}

export interface TowerDef {
  id: TowerTypeId;
  name: string;
  icon: string;
  cost: number;
  color: number;
  edgeColor: number;
  projectileColor: number;
  /** one-line description for the panel/dock */
  blurb: string;
  base: TowerStats;
  /** Committing to a path locks the other. */
  paths: [UpgradePath, UpgradePath];
}

export const SELL_REFUND = 0.7;

export const TOWERS: Record<TowerTypeId, TowerDef> = {
  gunner: {
    id: "gunner",
    name: "Gunner",
    icon: "🔫",
    cost: 50,
    color: 0x5b8ff9,
    edgeColor: 0x33517e,
    projectileColor: 0xffd166,
    blurb: "Reliable single-target fire.",
    base: { damage: 2, range: 2.4, cooldownTicks: 18, projectileSpeed: 9 },
    paths: [
      {
        name: "Rapid Fire",
        tiers: [
          {
            cost: 40,
            label: "Faster trigger",
            stats: { damage: 2, range: 2.4, cooldownTicks: 12, projectileSpeed: 10 },
          },
          {
            cost: 70,
            label: "Minigun",
            stats: { damage: 2, range: 2.4, cooldownTicks: 7, projectileSpeed: 11 },
          },
        ],
      },
      {
        name: "Piercing Rounds",
        tiers: [
          {
            cost: 40,
            label: "Heavy caliber",
            stats: { damage: 4, range: 2.5, cooldownTicks: 18, projectileSpeed: 10 },
          },
          {
            cost: 80,
            label: "Railshot",
            stats: { damage: 7, range: 2.7, cooldownTicks: 18, projectileSpeed: 12 },
          },
        ],
      },
    ],
  },

  cannon: {
    id: "cannon",
    name: "Cannon",
    icon: "💣",
    cost: 75,
    color: 0xf97316,
    edgeColor: 0x9a4b12,
    projectileColor: 0xfda869,
    blurb: "Slow shells that splash.",
    base: {
      damage: 3,
      range: 2.2,
      cooldownTicks: 36,
      projectileSpeed: 7,
      splashRadius: 0.9,
    },
    paths: [
      {
        name: "Blast Radius",
        tiers: [
          {
            cost: 50,
            label: "Wider blast",
            stats: {
              damage: 3,
              range: 2.3,
              cooldownTicks: 36,
              projectileSpeed: 7,
              splashRadius: 1.35,
            },
          },
          {
            cost: 90,
            label: "Carpet bomb",
            stats: {
              damage: 4,
              range: 2.4,
              cooldownTicks: 36,
              projectileSpeed: 7,
              splashRadius: 1.75,
            },
          },
        ],
      },
      {
        name: "Heavy Shells",
        tiers: [
          {
            cost: 60,
            label: "Dense payload",
            stats: {
              damage: 6,
              range: 2.2,
              cooldownTicks: 36,
              projectileSpeed: 7,
              splashRadius: 0.9,
            },
          },
          {
            cost: 100,
            label: "Bunker buster",
            stats: {
              damage: 11,
              range: 2.2,
              cooldownTicks: 40,
              projectileSpeed: 7,
              splashRadius: 1.0,
            },
          },
        ],
      },
    ],
  },

  frost: {
    id: "frost",
    name: "Frost",
    icon: "❄️",
    cost: 60,
    color: 0x38bdf8,
    edgeColor: 0x1d6a92,
    projectileColor: 0xbae6fd,
    blurb: "Chills enemies to a crawl.",
    base: {
      damage: 1,
      range: 2.2,
      cooldownTicks: 24,
      projectileSpeed: 8,
      slowFactor: 0.55,
      slowTicks: 45,
    },
    paths: [
      {
        name: "Deep Freeze",
        tiers: [
          {
            cost: 45,
            label: "Colder core",
            stats: {
              damage: 1,
              range: 2.4,
              cooldownTicks: 24,
              projectileSpeed: 8,
              slowFactor: 0.4,
              slowTicks: 60,
            },
          },
          {
            cost: 80,
            label: "Absolute zero",
            stats: {
              damage: 2,
              range: 2.6,
              cooldownTicks: 24,
              projectileSpeed: 8,
              slowFactor: 0.28,
              slowTicks: 75,
            },
          },
        ],
      },
      {
        name: "Brittle",
        tiers: [
          {
            cost: 50,
            label: "Frost fracture",
            stats: {
              damage: 1,
              range: 2.2,
              cooldownTicks: 24,
              projectileSpeed: 8,
              slowFactor: 0.55,
              slowTicks: 45,
              brittleBonus: 0.25,
              brittleTicks: 45,
            },
          },
          {
            cost: 85,
            label: "Shatterpoint",
            stats: {
              damage: 2,
              range: 2.3,
              cooldownTicks: 24,
              projectileSpeed: 8,
              slowFactor: 0.5,
              slowTicks: 55,
              brittleBonus: 0.5,
              brittleTicks: 55,
            },
          },
        ],
      },
    ],
  },

  sniper: {
    id: "sniper",
    name: "Sniper",
    icon: "🎯",
    cost: 100,
    color: 0xe2e8f0,
    edgeColor: 0x64748b,
    projectileColor: 0xffffff,
    blurb: "Huge range, heavy hits.",
    base: { damage: 10, range: 4.5, cooldownTicks: 60, projectileSpeed: 16 },
    paths: [
      {
        name: "Deadeye",
        tiers: [
          {
            cost: 70,
            label: "Marksman",
            stats: { damage: 18, range: 5.5, cooldownTicks: 60, projectileSpeed: 18 },
          },
          {
            cost: 120,
            label: "Longshot",
            stats: { damage: 32, range: 6.5, cooldownTicks: 60, projectileSpeed: 20 },
          },
        ],
      },
      {
        name: "Quickdraw",
        tiers: [
          {
            cost: 70,
            label: "Bolt cycle",
            stats: { damage: 10, range: 4.5, cooldownTicks: 40, projectileSpeed: 18 },
          },
          {
            cost: 110,
            label: "Semi-auto",
            stats: { damage: 10, range: 4.7, cooldownTicks: 24, projectileSpeed: 18 },
          },
        ],
      },
    ],
  },
};

export const TOWER_ORDER: TowerTypeId[] = ["gunner", "cannon", "frost", "sniper"];
