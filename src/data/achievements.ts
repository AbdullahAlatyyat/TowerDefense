export type AchievementId =
  | "first_blood"
  | "perfectionist"
  | "daily_devotee"
  | "survivor"
  | "iron_will"
  | "tycoon"
  | "mutator_master";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  icon: string;
  description: string;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_blood: {
    id: "first_blood",
    name: "First Blood",
    icon: "🏆",
    description: "Win your first campaign level.",
  },
  perfectionist: {
    id: "perfectionist",
    name: "Perfectionist",
    icon: "⭐",
    description: "Earn 3 stars on every campaign level.",
  },
  daily_devotee: {
    id: "daily_devotee",
    name: "Daily Devotee",
    icon: "📅",
    description: "Win a Daily Challenge.",
  },
  survivor: {
    id: "survivor",
    name: "Survivor",
    icon: "♾️",
    description: "Reach wave 10 in Endless mode.",
  },
  iron_will: {
    id: "iron_will",
    name: "Iron Will",
    icon: "💪",
    description: "Beat a campaign level on Hard difficulty.",
  },
  tycoon: {
    id: "tycoon",
    name: "Tycoon",
    icon: "💰",
    description: "Hold 200 gems at once.",
  },
  mutator_master: {
    id: "mutator_master",
    name: "Mutator Master",
    icon: "🧬",
    description: "Beat a campaign level with a mutator active.",
  },
};

export const ACHIEVEMENT_ORDER: AchievementId[] = [
  "first_blood",
  "perfectionist",
  "daily_devotee",
  "survivor",
  "iron_will",
  "tycoon",
  "mutator_master",
];
