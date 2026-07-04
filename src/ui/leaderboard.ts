import { dailyDateStr } from "../game/daily";
import type { Account } from "../net/auth";
import { getDailyLeaderboard, getEndlessLeaderboard, type DailyEntry, type EndlessEntry } from "../net/leaderboard";

export interface LeaderboardScreen {
  show(): void;
  hide(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createLeaderboardScreen(opts: {
  getAccount: () => Account | null;
  onBack: () => void;
}): LeaderboardScreen {
  const screen = el("screen-leaderboard");
  const list = el("leaderboard-list");
  const status = el("leaderboard-status");
  const tabEndless = el<HTMLButtonElement>("btn-leaderboard-tab-endless");
  const tabDaily = el<HTMLButtonElement>("btn-leaderboard-tab-daily");

  let tab: "endless" | "daily" = "endless";
  let requestSeq = 0;

  function hide(): void {
    screen.hidden = true;
  }

  el("btn-leaderboard-back").addEventListener("click", () => {
    hide();
    opts.onBack();
  });

  tabEndless.addEventListener("click", () => {
    tab = "endless";
    void render();
  });
  tabDaily.addEventListener("click", () => {
    tab = "daily";
    void render();
  });

  function renderRows<T extends { displayName: string }>(rows: T[], lineFor: (row: T) => string): void {
    const myName = opts.getAccount()?.displayName;
    list.innerHTML = "";
    rows.forEach((row, i) => {
      const item = document.createElement("div");
      item.className = `leaderboard-row${row.displayName === myName ? " me" : ""}`;
      item.innerHTML = `
        <span class="rank">${i + 1}</span>
        <span class="name">${row.displayName}</span>
        <span class="value">${lineFor(row)}</span>
      `;
      list.appendChild(item);
    });
  }

  async function render(): Promise<void> {
    const seq = ++requestSeq;
    tabEndless.classList.toggle("active", tab === "endless");
    tabDaily.classList.toggle("active", tab === "daily");
    list.innerHTML = "";
    status.hidden = false;
    status.textContent = "Loading…";
    try {
      if (tab === "endless") {
        const rows = await getEndlessLeaderboard();
        if (seq !== requestSeq) return;
        renderRows<EndlessEntry>(rows, (r) => `wave ${r.bestEndlessWave}`);
      } else {
        const rows = await getDailyLeaderboard(dailyDateStr());
        if (seq !== requestSeq) return;
        renderRows<DailyEntry>(rows, (r) => (r.won ? `⭐${r.stars} · ${r.livesLeft}❤️` : "💀"));
      }
      status.hidden = list.children.length > 0;
      status.textContent = "No entries yet — be the first!";
    } catch {
      if (seq !== requestSeq) return;
      status.hidden = false;
      status.textContent = "Couldn't load leaderboard. Check your connection.";
    }
  }

  return {
    show() {
      tab = "endless";
      void render();
      screen.hidden = false;
    },
    hide,
  };
}
