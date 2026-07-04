export type EnemyTypeId = "runner" | "grunt" | "brute" | "swarm";

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
};
