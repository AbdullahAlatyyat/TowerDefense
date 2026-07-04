export type MetaUpgradeId = "startGold" | "startLives";

/** Full-override tier, like tower upgrade tiers — not a delta. */
export interface MetaUpgradeTier {
  cost: number;
  bonus: number;
}

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  icon: string;
  blurb: string;
  tiers: MetaUpgradeTier[];
}

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeDef> = {
  startGold: {
    id: "startGold",
    name: "War Chest",
    icon: "🪙",
    blurb: "+10 starting gold per tier",
    tiers: [
      { cost: 30, bonus: 10 },
      { cost: 60, bonus: 20 },
      { cost: 100, bonus: 30 },
    ],
  },
  startLives: {
    id: "startLives",
    name: "Fortify",
    icon: "❤️",
    blurb: "+1 starting life per tier",
    tiers: [
      { cost: 40, bonus: 1 },
      { cost: 80, bonus: 2 },
      { cost: 130, bonus: 3 },
    ],
  },
};

export const META_UPGRADE_ORDER: MetaUpgradeId[] = ["startGold", "startLives"];

/** Flat bonuses applied at game-creation time, from owned meta-upgrade tiers. */
export function metaUpgradeBonus(metaUpgrades: Record<string, number>): {
  goldBonus: number;
  livesBonus: number;
} {
  const goldTier = metaUpgrades.startGold ?? 0;
  const livesTier = metaUpgrades.startLives ?? 0;
  return {
    goldBonus: goldTier > 0 ? META_UPGRADES.startGold.tiers[goldTier - 1]!.bonus : 0,
    livesBonus: livesTier > 0 ? META_UPGRADES.startLives.tiers[livesTier - 1]!.bonus : 0,
  };
}
