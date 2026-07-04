import "./style.css";
import { createMusic } from "./audio/music";
import { createSfx } from "./audio/sfx";
import { startLoop } from "./core/loop";
import {
  awardCurrency,
  loadSave,
  recordEndlessBest,
  recordHardClear,
  recordMutatorClear,
  recordStars,
  starsForRun,
  writeSave,
} from "./core/save";
import { LEVELS } from "./data/levels";
import type { LevelDef } from "./data/level01";
import type { DifficultyId } from "./data/difficulty";
import type { MutatorId } from "./data/mutators";
import { ACHIEVEMENTS, type AchievementId } from "./data/achievements";
import { metaUpgradeBonus } from "./data/metaUpgrades";
import { refreshAchievements } from "./game/achievements";
import {
  dailyDateStr,
  dailyRunSeed,
  generateDailyLevel,
  hashString,
  shareText,
} from "./game/daily";
import { createEndlessLevel } from "./game/endless";
import { createGame, step, type GameState } from "./game/state";
import { startWave } from "./game/waves";
import { getSession, signOut, updateDisplayName, type Account } from "./net/auth";
import {
  flushOutbox,
  mergeOnLogin,
  pushAchievement,
  pushCurrency,
  pushDaily,
  pushEndless,
  pushMetaUpgrade,
  pushStars,
} from "./net/sync";
import { Renderer } from "./render/renderer";
import { createAchievementsScreen } from "./ui/achievements";
import { createAuthScreen } from "./ui/auth";
import { createHud, type BannerConfig } from "./ui/hud";
import { createInput } from "./ui/input";
import { createLeaderboardScreen } from "./ui/leaderboard";
import { createOnboarding } from "./ui/onboarding";
import { createScreens } from "./ui/screens";
import { createSettingsScreen } from "./ui/settings";
import { createShopScreen } from "./ui/shop";

type Mode =
  | { kind: "campaign"; index: number }
  | { kind: "daily"; dateStr: string; practice: boolean }
  | { kind: "endless" };

async function main(): Promise<void> {
  const save = loadSave();
  const sfx = createSfx(save.muted, save.sfxVolume);
  const music = createMusic(save.muted, save.musicVolume);
  let lastWaveActive = false;
  const renderer = new Renderer();
  await renderer.init(document.getElementById("board")!, LEVELS[0]!);

  let mode: Mode | null = null;
  let state: GameState | null = null;
  let primaryAction: () => void = () => {};
  let difficulty: DifficultyId = "normal";
  let activeMutators: MutatorId[] = [];
  let resetPlaybackControls: () => void = () => {};

  const ui = createInput(
    renderer,
    () => state!,
    document.getElementById("dock")!,
    () => {
      if (save.haptics) navigator.vibrate?.(15);
      sfx.play("place");
    },
  );

  function runPlay(
    level: LevelDef,
    seed: number,
    m: Mode,
    diff: DifficultyId,
    mutators: MutatorId[] = [],
  ): void {
    mode = m;
    state = createGame(level, seed, diff, metaUpgradeBonus(save.metaUpgrades), mutators);
    ui.selectedTowerId = null;
    renderer.setLevel(level);
    screens.hideAll();
    resetPlaybackControls();
    music.start();
    lastWaveActive = false;
  }

  function play(
    level: LevelDef,
    seed: number,
    m: Mode,
    diff: DifficultyId,
    mutators: MutatorId[] = [],
  ): void {
    if (!save.tutorialSeen) {
      screens.hideAll();
      onboarding.show(() => {
        save.tutorialSeen = true;
        writeSave(save);
        onboarding.hide();
        runPlay(level, seed, m, diff, mutators);
      });
      return;
    }
    runPlay(level, seed, m, diff, mutators);
  }

  function startCampaign(index: number): void {
    const level = LEVELS[index]!;
    play(
      level,
      hashString(`campaign:${level.id}`),
      { kind: "campaign", index },
      difficulty,
      activeMutators,
    );
  }

  function startDaily(): void {
    const dateStr = dailyDateStr();
    // Daily challenge results are compared across all players, so it always
    // runs at normal difficulty regardless of the campaign picker.
    play(
      generateDailyLevel(dateStr),
      dailyRunSeed(dateStr),
      { kind: "daily", dateStr, practice: save.daily?.date === dateStr },
      "normal",
    );
  }

  function startEndless(): void {
    const seed = Math.floor(Math.random() * 0x7fffffff);
    // Endless always runs at Normal — difficulty scaling would just shift
    // which wave you die on, and the escalating wave budget already does that.
    play(createEndlessLevel(seed), seed, { kind: "endless" }, "normal");
  }

  const screens = createScreens({
    getSave: () => save,
    onPlayLevel: startCampaign,
    onPlayDaily: startDaily,
    onPlayEndless: startEndless,
    getDifficulty: () => difficulty,
    onSetDifficulty: (d) => {
      difficulty = d;
    },
    getMutators: () => activeMutators,
    onToggleMutator: (id) => {
      activeMutators = activeMutators.includes(id)
        ? activeMutators.filter((m) => m !== id)
        : [...activeMutators, id];
    },
  });

  const shopScreen = createShopScreen({
    getSave: () => save,
    onChange: (upgradeId, tier) => {
      if (account) {
        pushMetaUpgrade(upgradeId, tier);
        pushCurrency(save.currency);
      }
    },
    onBack: () => screens.showMenu(),
  });
  const achievementsScreen = createAchievementsScreen({
    getSave: () => save,
    onBack: () => screens.showMenu(),
  });
  const settingsScreen = createSettingsScreen({
    getSave: () => save,
    getAccount: () => account,
    onSfxVolume: (v) => sfx.setVolume(v),
    onMusicVolume: (v) => music.setVolume(v),
    onHapticsChange: () => {},
    onDisplayNameChange: async (name) => {
      try {
        account = await updateDisplayName(name);
        refreshAccountBadge();
      } catch {
        // best-effort: keep the previous name locally if the request fails
      }
    },
    onBack: () => screens.showMenu(),
  });
  const leaderboardScreen = createLeaderboardScreen({
    getAccount: () => account,
    onBack: () => screens.showMenu(),
  });
  const onboarding = createOnboarding();
  document.getElementById("btn-menu-shop")!.addEventListener("click", () => {
    screens.hideAll();
    shopScreen.show();
  });
  document.getElementById("btn-menu-achievements")!.addEventListener("click", () => {
    screens.hideAll();
    achievementsScreen.show();
  });
  document.getElementById("btn-menu-leaderboard")!.addEventListener("click", () => {
    screens.hideAll();
    leaderboardScreen.show();
  });
  document.getElementById("btn-menu-settings")!.addEventListener("click", () => {
    screens.hideAll();
    settingsScreen.show();
  });
  document.getElementById("btn-menu-help")!.addEventListener("click", () => {
    screens.hideAll();
    onboarding.show(() => {
      onboarding.hide();
      screens.showMenu();
    });
  });

  let account: Account | null = null;
  const accountBtn = document.getElementById("btn-account") as HTMLButtonElement;

  function refreshAccountBadge(): void {
    accountBtn.textContent = account ? `👤 ${account.email}` : "👤 Sign in";
  }

  async function applyMerge(): Promise<void> {
    try {
      const merged = await mergeOnLogin(save);
      save.stars = merged.stars;
      save.daily = merged.daily;
      save.currency = merged.currency;
      save.metaUpgrades = merged.metaUpgrades;
      save.achievements = { ...save.achievements, ...merged.achievements };
      save.bestEndlessWave = merged.bestEndlessWave;
      writeSave(save);
      screens.showMenu();
    } catch {
      // best-effort: local save stays authoritative if the merge request fails
    }
  }

  const authScreen = createAuthScreen({
    onSignedIn: (acc) => {
      account = acc;
      refreshAccountBadge();
      authScreen.hide();
      void applyMerge();
    },
    onGuest: () => {
      authScreen.hide();
      screens.showMenu();
    },
  });

  accountBtn.addEventListener("click", () => {
    if (account) {
      if (confirm(`Sign out of ${account.email}?`)) {
        void signOut().finally(() => {
          account = null;
          refreshAccountBadge();
        });
      }
    } else {
      screens.hideAll();
      authScreen.show();
    }
  });

  void getSession().then((acc) => {
    account = acc;
    refreshAccountBadge();
    if (acc) {
      void applyMerge();
      void flushOutbox();
    }
  });

  window.addEventListener("online", () => {
    if (account) void flushOutbox();
  });

  /** " · 🏅 New: Foo, Bar" for any achievements this run just unlocked. */
  function achievementNote(unlocked: AchievementId[]): string {
    if (unlocked.length === 0) return "";
    return ` · 🏅 New: ${unlocked.map((id) => ACHIEVEMENTS[id].name).join(", ")}`;
  }

  /** Pushes currency and any newly unlocked achievements when signed in. */
  function syncProgress(unlocked: AchievementId[]): void {
    if (!account) return;
    pushCurrency(save.currency);
    for (const id of unlocked) pushAchievement(id);
  }

  function onGameOver(st: GameState): BannerConfig {
    const won = st.status === "won";
    const { startLives, waves } = st.level;

    if (mode?.kind === "campaign") {
      const { index } = mode;
      if (won) {
        const stars = starsForRun(st.lives, startLives);
        recordStars(save, st.level.id, stars);
        if (account) pushStars(st.level.id, save.stars[st.level.id]!);
        if (difficulty === "hard") recordHardClear(save, st.level.id);
        if (st.mutators.length > 0) recordMutatorClear(save, st.level.id, st.mutators);
        const gems = 8 + stars * 4;
        awardCurrency(save, gems);
        const unlocked = refreshAchievements(save);
        writeSave(save);
        syncProgress(unlocked);
        const hasNext = index + 1 < LEVELS.length;
        primaryAction = hasNext
          ? () => startCampaign(index + 1)
          : () => screens.showLevels();
        return {
          title: "🏆 Victory!",
          sub:
            `${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}  ${st.lives}/${startLives} lives · +${gems}💎` +
            achievementNote(unlocked),
          primaryLabel: hasNext ? "▶ Next level" : "Level select",
        };
      }
      primaryAction = () => startCampaign(index);
      return {
        title: "💀 Defeat",
        sub: `Overrun on wave ${st.waveIndex + 1} of ${waves.length}.`,
        primaryLabel: "↻ Retry",
      };
    }

    if (mode?.kind === "endless") {
      const wavesReached = st.waveIndex + 1;
      recordEndlessBest(save, wavesReached);
      if (account) pushEndless(save.bestEndlessWave);
      const gems = Math.floor(wavesReached / 2);
      awardCurrency(save, gems);
      const unlocked = refreshAchievements(save);
      writeSave(save);
      syncProgress(unlocked);
      primaryAction = () => startEndless();
      return {
        title: "💀 Overrun!",
        sub: `Reached wave ${wavesReached} · best ${save.bestEndlessWave} · +${gems}💎${achievementNote(unlocked)}`,
        primaryLabel: "↻ Try again",
      };
    }

    // Daily
    const { dateStr, practice } = mode as Extract<Mode, { kind: "daily" }>;
    const stars = won ? starsForRun(st.lives, startLives) : 0;
    const wavesCleared = won ? waves.length : st.waveIndex;
    let unlocked: AchievementId[] = [];
    let gems = 0;
    if (!practice) {
      save.daily = { date: dateStr, won, livesLeft: st.lives, stars };
      if (won) {
        gems = 10 + stars * 5;
        awardCurrency(save, gems);
      }
      unlocked = refreshAchievements(save);
      writeSave(save);
      if (account) pushDaily(save.daily);
      syncProgress(unlocked);
    }
    primaryAction = () => startDaily();
    return {
      title: won ? "🏆 Daily cleared!" : "💀 Daily lost",
      sub: practice
        ? "Practice run — not recorded."
        : `Your result for today is locked in.${gems ? ` +${gems}💎` : ""}${achievementNote(unlocked)}`,
      primaryLabel: practice ? "↻ Practice again" : "↻ Practice run",
      shareText: practice
        ? undefined
        : shareText({
            dateStr,
            won,
            livesLeft: st.lives,
            startLives,
            stars,
            wavesCleared,
            wavesTotal: waves.length,
          }),
    };
  }

  const hud = createHud(
    () => ui,
    () => state!,
    {
      onStartWave: () => state && startWave(state),
      onPrimary: () => primaryAction(),
      onMenu: () => screens.showMenu(),
      onGameOver: (st) => {
        sfx.play(st.status === "won" ? "win" : "lose");
        return onGameOver(st);
      },
      onSfx: (name) => sfx.play(name),
      onToggleMute: () => {
        save.muted = !save.muted;
        writeSave(save);
        sfx.setMuted(save.muted);
        music.setMuted(save.muted);
        return save.muted;
      },
      initialMuted: save.muted,
    },
  );

  const loop = startLoop(
    () => state && step(state),
    () => {
      if (!state) return;
      const events = renderer.render(state, ui, performance.now() / 1000);
      if (events.shots) sfx.play("shot");
      if (events.impacts || events.splashes) sfx.play("hit");
      if (events.deaths) sfx.play("death");
      if (events.leaks) sfx.play("leak");
      if (events.bossSpawns) sfx.play("bossSpawn");
      if (state.waveActive !== lastWaveActive) {
        lastWaveActive = state.waveActive;
        music.setIntense(lastWaveActive);
      }
      hud.update(state, loop.stats);
    },
  );

  const SPEEDS = [1, 2, 3];
  let speedIdx = 0;
  let paused = false;

  const btnPause = document.getElementById("btn-pause") as HTMLButtonElement;
  const btnSpeed = document.getElementById("btn-speed") as HTMLButtonElement;
  btnPause.addEventListener("click", () => {
    paused = !paused;
    loop.setPaused(paused);
    btnPause.textContent = paused ? "▶" : "⏸";
  });
  btnSpeed.addEventListener("click", () => {
    speedIdx = (speedIdx + 1) % SPEEDS.length;
    loop.setTimeScale(SPEEDS[speedIdx]!);
    btnSpeed.textContent = `${SPEEDS[speedIdx]}x`;
  });
  resetPlaybackControls = () => {
    paused = false;
    speedIdx = 0;
    loop.setPaused(false);
    loop.setTimeScale(1);
    btnPause.textContent = "⏸";
    btnSpeed.textContent = "1x";
  };

  // Read-only debug handle for automated verification.
  (window as unknown as Record<string, unknown>).__td = {
    get state() {
      return state;
    },
  };

  // Deep link for testing/sharing: ?level=L3, ?daily=1, or ?endless=1
  const params = new URLSearchParams(location.search);
  if (params.get("daily")) {
    startDaily();
  } else if (params.get("endless")) {
    startEndless();
  } else if (params.get("level")) {
    const i = LEVELS.findIndex((l) => l.id === params.get("level"));
    if (i >= 0) startCampaign(i);
    else screens.showMenu();
  } else {
    screens.showMenu();
  }
}

main();
