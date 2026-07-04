import "./style.css";
import { createSfx } from "./audio/sfx";
import { startLoop } from "./core/loop";
import { loadSave, recordStars, starsForRun, writeSave } from "./core/save";
import { LEVELS } from "./data/levels";
import type { LevelDef } from "./data/level01";
import {
  dailyDateStr,
  dailyRunSeed,
  generateDailyLevel,
  hashString,
  shareText,
} from "./game/daily";
import { createGame, step, type GameState } from "./game/state";
import { startWave } from "./game/waves";
import { getSession, signOut, type Account } from "./net/auth";
import { flushOutbox, mergeOnLogin, pushDaily, pushStars } from "./net/sync";
import { Renderer } from "./render/renderer";
import { createAuthScreen } from "./ui/auth";
import { createHud, type BannerConfig } from "./ui/hud";
import { createInput } from "./ui/input";
import { createScreens } from "./ui/screens";

type Mode =
  | { kind: "campaign"; index: number }
  | { kind: "daily"; dateStr: string; practice: boolean };

async function main(): Promise<void> {
  const save = loadSave();
  const sfx = createSfx(save.muted);
  const renderer = new Renderer();
  await renderer.init(document.getElementById("board")!, LEVELS[0]!);

  let mode: Mode | null = null;
  let state: GameState | null = null;
  let primaryAction: () => void = () => {};

  const ui = createInput(
    renderer,
    () => state!,
    document.getElementById("dock")!,
    () => {
      navigator.vibrate?.(15);
      sfx.play("place");
    },
  );

  function play(level: LevelDef, seed: number, m: Mode): void {
    mode = m;
    state = createGame(level, seed);
    ui.selectedTowerId = null;
    renderer.setLevel(level);
    screens.hideAll();
  }

  function startCampaign(index: number): void {
    const level = LEVELS[index]!;
    play(level, hashString(`campaign:${level.id}`), { kind: "campaign", index });
  }

  function startDaily(): void {
    const dateStr = dailyDateStr();
    play(generateDailyLevel(dateStr), dailyRunSeed(dateStr), {
      kind: "daily",
      dateStr,
      practice: save.daily?.date === dateStr,
    });
  }

  const screens = createScreens({
    getSave: () => save,
    onPlayLevel: startCampaign,
    onPlayDaily: startDaily,
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

  function onGameOver(st: GameState): BannerConfig {
    const won = st.status === "won";
    const { startLives, waves } = st.level;

    if (mode?.kind === "campaign") {
      const { index } = mode;
      if (won) {
        const stars = starsForRun(st.lives, startLives);
        recordStars(save, st.level.id, stars);
        if (account) pushStars(st.level.id, save.stars[st.level.id]!);
        const hasNext = index + 1 < LEVELS.length;
        primaryAction = hasNext
          ? () => startCampaign(index + 1)
          : () => screens.showLevels();
        return {
          title: "🏆 Victory!",
          sub: `${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}  ${st.lives}/${startLives} lives`,
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

    // Daily
    const { dateStr, practice } = mode as Extract<Mode, { kind: "daily" }>;
    const stars = won ? starsForRun(st.lives, startLives) : 0;
    const wavesCleared = won ? waves.length : st.waveIndex;
    if (!practice) {
      save.daily = { date: dateStr, won, livesLeft: st.lives, stars };
      writeSave(save);
      if (account) pushDaily(save.daily);
    }
    primaryAction = () => startDaily();
    return {
      title: won ? "🏆 Daily cleared!" : "💀 Daily lost",
      sub: practice
        ? "Practice run — not recorded."
        : `Your result for today is locked in.`,
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
        return save.muted;
      },
      initialMuted: save.muted,
    },
  );

  const { stats } = startLoop(
    () => state && step(state),
    () => {
      if (!state) return;
      const events = renderer.render(state, ui, performance.now() / 1000);
      if (events.shots) sfx.play("shot");
      if (events.impacts || events.splashes) sfx.play("hit");
      if (events.deaths) sfx.play("death");
      if (events.leaks) sfx.play("leak");
      hud.update(state, stats);
    },
  );

  // Read-only debug handle for automated verification.
  (window as unknown as Record<string, unknown>).__td = {
    get state() {
      return state;
    },
  };

  // Deep link for testing/sharing: ?level=L3 or ?daily=1
  const params = new URLSearchParams(location.search);
  if (params.get("daily")) {
    startDaily();
  } else if (params.get("level")) {
    const i = LEVELS.findIndex((l) => l.id === params.get("level"));
    if (i >= 0) startCampaign(i);
    else screens.showMenu();
  } else {
    screens.showMenu();
  }
}

main();
