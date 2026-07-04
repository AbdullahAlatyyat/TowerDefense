export type DifficultyId = "easy" | "normal" | "hard";

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  /** multiplies every enemy's effective hp, stacked on top of EnemyDef.hpMul */
  hpMul: number;
  /** multiplies the level's startGold */
  goldMul: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  easy: { id: "easy", label: "Easy", hpMul: 0.8, goldMul: 1.15 },
  normal: { id: "normal", label: "Normal", hpMul: 1, goldMul: 1 },
  hard: { id: "hard", label: "Hard", hpMul: 1.35, goldMul: 0.9 },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ["easy", "normal", "hard"];
