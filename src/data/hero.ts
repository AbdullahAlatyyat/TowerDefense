import type { TowerStats } from "./towers";

export interface HeroLevel {
  /** cumulative lifetime kills required to reach this level */
  xp: number;
  label: string;
  stats: TowerStats;
}

export interface HeroAbilityDef {
  /** cells */
  radius: number;
  damage: number;
  stunTicks: number;
  cooldownTicks: number;
}

export interface HeroDef {
  name: string;
  icon: string;
  cost: number;
  color: number;
  edgeColor: number;
  projectileColor: number;
  blurb: string;
  /** level 1 (base, xp 0) stats */
  base: TowerStats;
  /** ascending by xp; each entry is one level past base */
  levels: HeroLevel[];
  ability: HeroAbilityDef;
}

export const HERO: HeroDef = {
  name: "Champion",
  icon: "🦸",
  cost: 120,
  color: 0xc084fc,
  edgeColor: 0x6b21a8,
  projectileColor: 0xe9d5ff,
  blurb: "Deploy once — levels up permanently from kills across every run you ever play.",
  base: { damage: 5, range: 2.6, cooldownTicks: 20, projectileSpeed: 12 },
  levels: [
    { xp: 20, label: "Veteran", stats: { damage: 8, range: 2.7, cooldownTicks: 19, projectileSpeed: 13 } },
    { xp: 60, label: "Champion", stats: { damage: 12, range: 2.8, cooldownTicks: 18, projectileSpeed: 14 } },
    { xp: 140, label: "Warlord", stats: { damage: 18, range: 3.0, cooldownTicks: 16, projectileSpeed: 15 } },
    { xp: 300, label: "Legend", stats: { damage: 27, range: 3.2, cooldownTicks: 14, projectileSpeed: 16 } },
  ],
  ability: { radius: 1.8, damage: 20, stunTicks: 30, cooldownTicks: 30 * 20 },
};

/** One lifetime kill (by anything, not just the hero) grants this much persistent XP. */
export const HERO_XP_PER_KILL = 1;

/** 0 = base (not yet leveled), 1..HERO.levels.length = index into HERO.levels. */
export function heroLevelIndex(xp: number): number {
  let idx = 0;
  for (let i = 0; i < HERO.levels.length; i++) {
    if (xp >= HERO.levels[i]!.xp) idx = i + 1;
  }
  return idx;
}

export function heroLevelLabel(xp: number): string {
  const idx = heroLevelIndex(xp);
  return idx === 0 ? "Recruit" : HERO.levels[idx - 1]!.label;
}

export function heroStatsForXp(xp: number): TowerStats {
  const idx = heroLevelIndex(xp);
  return idx === 0 ? HERO.base : HERO.levels[idx - 1]!.stats;
}

/** XP required to reach the next level, or null if already at max level. */
export function heroNextLevelXp(xp: number): number | null {
  const idx = heroLevelIndex(xp);
  return idx < HERO.levels.length ? HERO.levels[idx]!.xp : null;
}
