import { LEVELS } from "../data/levels";
import { dailyDateStr, dailyNumber } from "../game/daily";
import type { SaveData } from "../core/save";
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from "../data/difficulty";
import { MUTATORS, MUTATOR_ORDER, type MutatorId } from "../data/mutators";

export interface Screens {
  showMenu(): void;
  showLevels(): void;
  hideAll(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createScreens(opts: {
  getSave: () => SaveData;
  onPlayLevel: (index: number) => void;
  onPlayDaily: () => void;
  onPlayEndless: () => void;
  getDifficulty: () => DifficultyId;
  onSetDifficulty: (difficulty: DifficultyId) => void;
  getMutators: () => MutatorId[];
  onToggleMutator: (id: MutatorId) => void;
}): Screens {
  const menu = el("screen-menu");
  const levels = el("screen-levels");
  const grid = el("level-grid");
  const dailyLabel = el("daily-label");
  const endlessLabel = el("endless-label");
  const currencyLabel = el("menu-currency");
  const difficultyPicker = el("difficulty-picker");
  const mutatorPicker = el("mutator-picker");

  function buildDifficultyPicker(): void {
    difficultyPicker.innerHTML = "";
    for (const id of DIFFICULTY_ORDER) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = DIFFICULTIES[id].label;
      btn.classList.toggle("active", opts.getDifficulty() === id);
      btn.addEventListener("click", () => {
        opts.onSetDifficulty(id);
        buildDifficultyPicker();
      });
      difficultyPicker.appendChild(btn);
    }
  }
  buildDifficultyPicker();

  function buildMutatorPicker(): void {
    mutatorPicker.innerHTML = "";
    for (const id of MUTATOR_ORDER) {
      const def = MUTATORS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${def.icon} ${def.label}`;
      btn.title = def.description;
      btn.classList.toggle("active", opts.getMutators().includes(id));
      btn.addEventListener("click", () => {
        opts.onToggleMutator(id);
        buildMutatorPicker();
      });
      mutatorPicker.appendChild(btn);
    }
  }
  buildMutatorPicker();

  el("btn-menu-play").addEventListener("click", () => {
    refreshLevels();
    menu.hidden = true;
    levels.hidden = false;
  });
  el("btn-levels-back").addEventListener("click", () => {
    levels.hidden = true;
    menu.hidden = false;
  });
  el("btn-menu-daily").addEventListener("click", opts.onPlayDaily);
  el("btn-menu-endless").addEventListener("click", opts.onPlayEndless);

  function refreshMenu(): void {
    const ds = dailyDateStr();
    const save = opts.getSave();
    const n = dailyNumber(ds);
    if (save.daily?.date === ds) {
      const result = save.daily.won ? "⭐".repeat(save.daily.stars) : "💀";
      dailyLabel.textContent = `Daily #${n} — done ${result} (practice)`;
    } else {
      dailyLabel.textContent = `Daily Challenge #${n}`;
    }
    const best = save.bestEndlessWave;
    endlessLabel.textContent = best > 0 ? `Endless — best wave ${best}` : "Endless";
    currencyLabel.textContent = `💎 ${save.currency}`;
  }

  function refreshLevels(): void {
    const save = opts.getSave();
    grid.innerHTML = "";
    LEVELS.forEach((level, i) => {
      const stars = save.stars[level.id] ?? 0;
      const unlocked = i === 0 || (save.stars[LEVELS[i - 1]!.id] ?? 0) > 0;
      const btn = document.createElement("button");
      btn.className = "level-card";
      btn.disabled = !unlocked;
      btn.innerHTML =
        `<span>${unlocked ? i + 1 : "🔒"}</span><span>${level.name}</span>` +
        `<span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>`;
      btn.addEventListener("click", () => opts.onPlayLevel(i));
      grid.appendChild(btn);
    });
  }

  return {
    showMenu() {
      refreshMenu();
      levels.hidden = true;
      menu.hidden = false;
    },
    showLevels() {
      refreshLevels();
      buildDifficultyPicker();
      buildMutatorPicker();
      menu.hidden = true;
      levels.hidden = false;
    },
    hideAll() {
      menu.hidden = true;
      levels.hidden = true;
    },
  };
}
