import type { LoopStats } from "../core/loop";
import { ENEMIES } from "../data/enemies";
import { TOWER_ORDER, TOWERS } from "../data/towers";
import {
  effectiveTowerStats,
  sellTower,
  sellValue,
  setTargetMode,
  upgradeCost,
  upgradeTower,
  TARGET_MODES,
  type GameState,
  type TargetMode,
} from "../game/state";
import { canStartWave } from "../game/waves";
import type { UiState } from "./input";

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export interface Hud {
  /** Refresh all HUD readouts from the current state. Cheap; call per frame. */
  update(state: GameState, stats: LoopStats): void;
}

/** What the game-over banner should show; produced by the app orchestrator. */
export interface BannerConfig {
  title: string;
  sub: string;
  primaryLabel: string;
  /** daily result text; enables the share button and preview when set */
  shareText?: string;
}

export interface HudCallbacks {
  onStartWave(): void;
  /** banner primary button (retry / next level / play again) */
  onPrimary(): void;
  /** home button and banner menu button */
  onMenu(): void;
  /** called once when a run ends; returns what the banner should show */
  onGameOver(state: GameState): BannerConfig;
  /** UI sound hooks */
  onSfx?(name: "upgrade" | "sell"): void;
  /** toggle sound; returns the new muted state */
  onToggleMute?(): boolean;
  initialMuted?: boolean;
}

const TARGET_LABELS: Record<TargetMode, string> = {
  first: "First",
  last: "Last",
  close: "Closest",
  strong: "Strongest",
};

/** Populate the dock with one drag-source button per tower type. */
function buildDock(dock: HTMLElement): void {
  for (const type of TOWER_ORDER) {
    const def = TOWERS[type];
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.dataset.tower = type;
    btn.title = `${def.name} — ${def.blurb}`;
    btn.innerHTML = `${def.icon}<span class="cost">🪙${def.cost}</span>`;
    dock.appendChild(btn);
  }
}

export function createHud(
  getUi: () => UiState,
  getState: () => GameState,
  cb: HudCallbacks,
): Hud {
  const livesStat = el("stat-lives");
  const lives = livesStat.querySelector("b")!;
  const gold = el("stat-gold").querySelector("b")!;
  const wave = el("stat-wave").querySelector("b")!;
  let lastLives = -1;
  let lastGold = -1;
  const btnWave = el<HTMLButtonElement>("btn-wave");
  const dock = el("dock");
  const bossBar = el("boss-bar");
  const bossBarName = el("boss-bar-name");
  const bossBarFill = el("boss-bar-fill");
  const banner = el("banner");
  const bannerTitle = el("banner-title");
  const bannerSub = el("banner-sub");
  const perf = el("perf");

  const panel = el("tower-panel");
  const panelName = el("panel-name");
  const panelTier = el("panel-tier");
  const btnTargetMode = el<HTMLButtonElement>("btn-target-mode");
  const btnSell = el<HTMLButtonElement>("btn-sell");
  const sellVal = el("sell-value");
  const upBtns = [el<HTMLButtonElement>("btn-up-0"), el<HTMLButtonElement>("btn-up-1")] as const;

  const btnPrimary = el<HTMLButtonElement>("btn-banner-primary");
  const btnShare = el<HTMLButtonElement>("btn-banner-share");
  const shareTextEl = el("banner-share-text");
  let shareText = "";

  buildDock(dock);
  const buildBtns = [...dock.querySelectorAll<HTMLButtonElement>(".build-btn")];

  btnWave.addEventListener("click", cb.onStartWave);
  btnPrimary.addEventListener("click", cb.onPrimary);
  el("btn-banner-menu").addEventListener("click", cb.onMenu);
  el("btn-home").addEventListener("click", cb.onMenu);
  btnShare.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        btnShare.textContent = "✅ Copied!";
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  });
  el("btn-perf").addEventListener("click", () => {
    perf.hidden = !perf.hidden;
  });

  const selectedTower = () => {
    const id = getUi().selectedTowerId;
    return id === null
      ? undefined
      : getState().towers.find((t) => t.id === id);
  };

  btnTargetMode.addEventListener("click", () => {
    const tower = selectedTower();
    if (!tower) return;
    const next =
      TARGET_MODES[(TARGET_MODES.indexOf(tower.targetMode) + 1) % TARGET_MODES.length]!;
    setTargetMode(getState(), tower.id, next);
  });
  btnSell.addEventListener("click", () => {
    const tower = selectedTower();
    if (tower && sellTower(getState(), tower.id)) {
      getUi().selectedTowerId = null;
      cb.onSfx?.("sell");
    }
  });
  upBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const tower = selectedTower();
      if (tower && upgradeTower(getState(), tower.id, i as 0 | 1)) {
        cb.onSfx?.("upgrade");
      }
    });
  });

  const btnMute = el<HTMLButtonElement>("btn-mute");
  btnMute.textContent = cb.initialMuted ? "🔇" : "🔊";
  btnMute.addEventListener("click", () => {
    if (cb.onToggleMute) btnMute.textContent = cb.onToggleMute() ? "🔇" : "🔊";
  });

  let bannerShown = false;
  let panelShown = false;

  /** Restart a one-shot CSS animation by toggling its class off then on. */
  function pulse(target: HTMLElement): void {
    target.classList.remove("pulse");
    void target.offsetWidth;
    target.classList.add("pulse");
  }

  function setPanelVisible(visible: boolean): void {
    if (panelShown === visible) return;
    panelShown = visible;
    if (visible) {
      panel.hidden = false;
      void panel.offsetWidth;
      panel.classList.add("visible");
    } else {
      panel.classList.remove("visible");
      window.setTimeout(() => {
        if (!panelShown) panel.hidden = true;
      }, 180);
    }
  }

  return {
    update(state, stats) {
      if (lastLives >= 0 && state.lives !== lastLives) pulse(lives);
      if (lastGold >= 0 && state.gold !== lastGold) pulse(gold);
      lastLives = state.lives;
      lastGold = state.gold;
      lives.textContent = String(state.lives);
      gold.textContent = String(state.gold);
      wave.textContent = `${state.waveIndex + 1}/${state.level.waves.length}`;
      livesStat.classList.toggle(
        "warn",
        state.status === "playing" && state.lives > 0 && state.lives <= state.level.startLives * 0.2,
      );

      const boss = state.enemies.find((e) => ENEMIES[e.type].isBoss);
      bossBar.hidden = !boss;
      if (boss) {
        bossBarName.textContent = ENEMIES[boss.type].name;
        bossBarFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
      }

      btnWave.disabled = !canStartWave(state);
      btnWave.textContent = state.waveActive
        ? `Wave ${state.waveIndex + 1}…`
        : "▶ Start wave";
      for (const btn of buildBtns) {
        const def = TOWERS[btn.dataset.tower as keyof typeof TOWERS];
        btn.disabled = state.status !== "playing" || state.gold < def.cost;
      }

      updatePanel(state);

      if (!perf.hidden) {
        perf.textContent =
          `${stats.fps} fps  tick ${stats.tickMs.toFixed(1)}ms\n` +
          `enemies ${state.enemies.length}  towers ${state.towers.length}  ` +
          `shots ${state.projectiles.length}`;
      }

      const over = state.status !== "playing";
      if (over && !bannerShown) {
        bannerShown = true;
        const config = cb.onGameOver(state);
        bannerTitle.textContent = config.title;
        bannerSub.textContent = config.sub;
        btnPrimary.textContent = config.primaryLabel;
        shareText = config.shareText ?? "";
        btnShare.hidden = !config.shareText;
        btnShare.textContent = "📋 Share result";
        shareTextEl.hidden = !config.shareText;
        shareTextEl.textContent = config.shareText ?? "";
        banner.hidden = false;
        void banner.offsetWidth;
        banner.classList.add("visible");
        console.log(
          `[determinism] seed=${state.seed} tick=${state.tick} ` +
            `gold=${state.gold} lives=${state.lives} status=${state.status}`,
        );
      } else if (!over && bannerShown) {
        bannerShown = false;
        banner.classList.remove("visible");
        window.setTimeout(() => {
          if (!bannerShown) banner.hidden = true;
        }, 200);
      }
    },
  };

  function updatePanel(state: GameState): void {
    const tower = selectedTower();
    if (!tower || state.status !== "playing") {
      if (getUi().selectedTowerId !== null && !tower) {
        getUi().selectedTowerId = null; // tower was sold/removed
      }
      setPanelVisible(false);
      return;
    }
    setPanelVisible(true);
    const def = TOWERS[tower.type];
    const stats = effectiveTowerStats(state, tower);
    panelName.textContent = `${def.icon} ${def.name}`;
    btnTargetMode.textContent = `🎯 ${TARGET_LABELS[tower.targetMode]}`;
    const tierLabel = tower.tier === 0 ? "" : `${def.paths[tower.path!].name} T${tower.tier} · `;
    panelTier.textContent =
      stats.damage <= 0 && stats.aura
        ? `${tierLabel}aura rad ${stats.aura.radius} · dmg x${stats.aura.damageMul ?? 1} · rng x${stats.aura.rangeMul ?? 1}`
        : `${tierLabel}dmg ${stats.damage.toFixed(stats.damage % 1 === 0 ? 0 : 1)} · rng ${stats.range.toFixed(1)}`;
    sellVal.textContent = String(sellValue(tower));

    upBtns.forEach((btn, i) => {
      const path = def.paths[i as 0 | 1];
      const cost = upgradeCost(tower, i as 0 | 1);
      const nameEl = btn.querySelector(".up-name")!;
      const labelEl = btn.querySelector(".up-label")!;
      const costEl = btn.querySelector(".up-cost")!;
      nameEl.textContent = path.name;
      btn.classList.remove("maxed");
      if (cost === null) {
        const maxedHere = tower.path === i && tower.tier >= 2;
        labelEl.textContent = maxedHere
          ? path.tiers[1].label
          : "Locked (other path chosen)";
        costEl.textContent = maxedHere ? "MAX" : "🔒";
        if (maxedHere) btn.classList.add("maxed");
        btn.disabled = true;
      } else {
        labelEl.textContent = path.tiers[tower.tier as 0 | 1].label;
        costEl.textContent = `🪙 ${cost}`;
        btn.disabled = state.gold < cost;
      }
    });
  }
}
