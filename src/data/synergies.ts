import type { DamageType } from "./towers";

/**
 * Declarative cross-tower combo bonuses: extra damage multiplier when a hit
 * of the given damage type lands on an enemy already carrying the given
 * debuff — regardless of which tower (or the hero) applied either one.
 * "Shatter" (physical damage vs. Frost's Brittle mark) is the original,
 * built directly into applyDamage's brittle multiplier; these extend the
 * same idea to the other elemental debuffs.
 */
export interface SynergyRule {
  id: string;
  name: string;
  requiresDebuff: "slow" | "poison" | "stun";
  damageType: DamageType;
  /** bonus multiplier, e.g. 0.4 = +40% damage */
  multiplier: number;
}

export const SYNERGIES: SynergyRule[] = [
  {
    id: "conduction",
    name: "Conduction",
    requiresDebuff: "slow",
    damageType: "lightning",
    multiplier: 0.4,
  },
  {
    id: "overload",
    name: "Overload",
    requiresDebuff: "poison",
    damageType: "lightning",
    multiplier: 0.4,
  },
  {
    id: "exploit",
    name: "Exploit",
    requiresDebuff: "stun",
    damageType: "physical",
    multiplier: 0.35,
  },
];
