export type EnemyTypeId =
  | "runner"
  | "grunt"
  | "brute"
  | "swarm"
  | "golem"
  | "wisp"
  | "troll"
  | "warden"
  | "blob"
  | "warlord";

export interface EnemyDef {
  id: EnemyTypeId;
  name: string;
  /** cells per second */
  speed: number;
  /** multiplies the wave group's base hp */
  hpMul: number;
  /** gold per kill */
  bounty: number;
  /** world units (cells) */
  radius: number;
  color: number;
  edgeColor: number;
  /** flat damage reduction per hit (before brittle), floor 0.1 effective damage */
  armor?: number;
  /** visual/lane differentiator only in v1 — every tower can still target it */
  flying?: boolean;
  /** hp regenerated per tick, capped at maxHp */
  regenPerTick?: number;
  /** fraction of maxHp granted as a shield pool that absorbs damage before hp */
  shieldFrac?: number;
  /** ticks of no damage taken before the shield starts regenerating */
  shieldRegenDelayTicks?: number;
  /** on death, spawns replacement enemies on the same lane at the same distance */
  splitInto?: { type: EnemyTypeId; count: number; hpFrac: number };
  /** render/HUD hint only — no separate sim path */
  isBoss?: boolean;
}

export const ENEMIES: Record<EnemyTypeId, EnemyDef> = {
  runner: {
    id: "runner",
    name: "Runner",
    speed: 1.9,
    hpMul: 0.7,
    bounty: 5,
    radius: 0.24,
    color: 0xf59e0b,
    edgeColor: 0x92600a,
  },
  grunt: {
    id: "grunt",
    name: "Grunt",
    speed: 1.2,
    hpMul: 1.0,
    bounty: 6,
    radius: 0.3,
    color: 0xe25555,
    edgeColor: 0x8f2f2f,
  },
  brute: {
    id: "brute",
    name: "Brute",
    speed: 0.72,
    hpMul: 3.2,
    bounty: 14,
    radius: 0.38,
    color: 0xa855f7,
    edgeColor: 0x6b21a8,
  },
  swarm: {
    id: "swarm",
    name: "Swarmling",
    speed: 1.55,
    hpMul: 0.35,
    bounty: 2,
    radius: 0.18,
    color: 0xfb7185,
    edgeColor: 0x9f2b42,
  },
  golem: {
    id: "golem",
    name: "Golem",
    speed: 0.55,
    hpMul: 2.6,
    bounty: 16,
    radius: 0.36,
    color: 0x94a3b8,
    edgeColor: 0x475569,
    armor: 1,
  },
  wisp: {
    id: "wisp",
    name: "Wisp",
    speed: 1.4,
    hpMul: 0.6,
    bounty: 9,
    radius: 0.26,
    color: 0xa5f3fc,
    edgeColor: 0x0e7490,
    flying: true,
  },
  troll: {
    id: "troll",
    name: "Troll",
    speed: 0.85,
    hpMul: 2.0,
    bounty: 13,
    radius: 0.32,
    color: 0x2dd4bf,
    edgeColor: 0x0f766e,
    regenPerTick: 0.08,
  },
  warden: {
    id: "warden",
    name: "Warden",
    speed: 0.65,
    hpMul: 1.5,
    bounty: 14,
    radius: 0.34,
    color: 0xf59e0b,
    edgeColor: 0x92400e,
    shieldFrac: 0.4,
    shieldRegenDelayTicks: 90,
  },
  blob: {
    id: "blob",
    name: "Blob",
    speed: 1.0,
    hpMul: 1.2,
    bounty: 10,
    radius: 0.3,
    color: 0x84cc16,
    edgeColor: 0x3f6212,
    splitInto: { type: "swarm", count: 2, hpFrac: 0.3 },
  },
  warlord: {
    id: "warlord",
    name: "Warlord",
    speed: 0.5,
    hpMul: 6,
    bounty: 40,
    radius: 0.46,
    color: 0x7c2d92,
    edgeColor: 0x3f1548,
    armor: 1,
    regenPerTick: 0.06,
    isBoss: true,
  },
};
