export type MutatorId = "double_hp" | "half_cash" | "no_selling";

export interface MutatorDef {
  id: MutatorId;
  label: string;
  icon: string;
  description: string;
  /** multiplies effective enemy hp, stacks with EnemyDef.hpMul and DifficultyDef.hpMul */
  hpMul?: number;
  /** multiplies level.startGold, stacks with DifficultyDef.goldMul */
  goldMul?: number;
  /** disables sellTower for the run */
  noSell?: boolean;
}

export const MUTATORS: Record<MutatorId, MutatorDef> = {
  double_hp: {
    id: "double_hp",
    label: "Double HP",
    icon: "💢",
    description: "Enemies have 2x hp.",
    hpMul: 2,
  },
  half_cash: {
    id: "half_cash",
    label: "Half Cash",
    icon: "🪙",
    description: "Start with half gold.",
    goldMul: 0.5,
  },
  no_selling: {
    id: "no_selling",
    label: "No Selling",
    icon: "🚫",
    description: "Towers can't be sold once placed.",
    noSell: true,
  },
};

export const MUTATOR_ORDER: MutatorId[] = ["double_hp", "half_cash", "no_selling"];
