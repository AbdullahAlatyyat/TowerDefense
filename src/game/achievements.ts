import type { SaveData } from "../core/save";
import { LEVELS } from "../data/levels";
import { ACHIEVEMENTS, type AchievementId } from "../data/achievements";

/** Pure conditions over SaveData only — never Pixi/DOM. */
const CONDITIONS: Record<AchievementId, (save: SaveData) => boolean> = {
  first_blood: (save) => Object.keys(save.stars).length >= 1,
  perfectionist: (save) => LEVELS.every((l) => (save.stars[l.id] ?? 0) >= 3),
  daily_devotee: (save) => save.daily?.won === true,
  survivor: (save) => save.bestEndlessWave >= 10,
  iron_will: (save) => Object.values(save.hardClears).some(Boolean),
  tycoon: (save) => save.currency >= 200,
};

/** Checks the full catalog against the save, unlocking any newly-met ones. */
export function refreshAchievements(save: SaveData): AchievementId[] {
  const unlocked: AchievementId[] = [];
  for (const id of Object.keys(ACHIEVEMENTS) as AchievementId[]) {
    if (save.achievements[id]) continue;
    if (CONDITIONS[id](save)) {
      save.achievements[id] = true;
      unlocked.push(id);
    }
  }
  return unlocked;
}
