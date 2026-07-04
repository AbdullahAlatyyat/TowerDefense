import type { SaveData } from "../core/save";
import { ACHIEVEMENT_ORDER, ACHIEVEMENTS } from "../data/achievements";

export interface AchievementsScreen {
  show(): void;
  hide(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createAchievementsScreen(opts: {
  getSave: () => SaveData;
  onBack: () => void;
}): AchievementsScreen {
  const screen = el("screen-achievements");
  const list = el("achievements-list");

  el("btn-achievements-back").addEventListener("click", () => {
    hide();
    opts.onBack();
  });

  function render(): void {
    const save = opts.getSave();
    list.innerHTML = "";
    for (const id of ACHIEVEMENT_ORDER) {
      const def = ACHIEVEMENTS[id];
      const unlocked = !!save.achievements[id];
      const item = document.createElement("div");
      item.className = `achievement-item${unlocked ? "" : " locked"}`;
      item.innerHTML = `
        <span class="icon">${unlocked ? def.icon : "🔒"}</span>
        <div class="info">
          <div class="name">${def.name}</div>
          <div class="blurb">${def.description}</div>
        </div>
      `;
      list.appendChild(item);
    }
  }

  function hide(): void {
    screen.hidden = true;
  }

  return {
    show() {
      render();
      screen.hidden = false;
    },
    hide,
  };
}
