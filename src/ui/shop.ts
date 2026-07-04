import type { SaveData } from "../core/save";
import { writeSave } from "../core/save";
import { META_UPGRADE_ORDER, META_UPGRADES } from "../data/metaUpgrades";

export interface ShopScreen {
  show(): void;
  hide(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createShopScreen(opts: {
  getSave: () => SaveData;
  onChange: (upgradeId: string, tier: number) => void;
  onBack: () => void;
}): ShopScreen {
  const screen = el("screen-shop");
  const list = el("shop-list");
  const currencyEl = el("shop-currency");

  function hide(): void {
    screen.hidden = true;
  }

  el("btn-shop-back").addEventListener("click", () => {
    hide();
    opts.onBack();
  });

  function render(): void {
    const save = opts.getSave();
    currencyEl.textContent = `💎 ${save.currency}`;
    list.innerHTML = "";
    for (const id of META_UPGRADE_ORDER) {
      const def = META_UPGRADES[id];
      const tier = save.metaUpgrades[id] ?? 0;
      const maxed = tier >= def.tiers.length;
      const cost = maxed ? null : def.tiers[tier]!.cost;

      const item = document.createElement("div");
      item.className = "shop-item";
      item.innerHTML = `
        <div class="info">
          <div class="name">${def.icon} ${def.name} ${"●".repeat(tier)}${"○".repeat(def.tiers.length - tier)}</div>
          <div class="blurb">${def.blurb}</div>
        </div>
        <button class="buy" type="button">${maxed ? "MAX" : `🪙 ${cost}`}</button>
      `;
      const btn = item.querySelector<HTMLButtonElement>(".buy")!;
      btn.disabled = maxed || save.currency < (cost ?? 0);
      if (!maxed) {
        btn.addEventListener("click", () => {
          if (save.currency < cost!) return;
          save.currency -= cost!;
          save.metaUpgrades[id] = tier + 1;
          writeSave(save);
          opts.onChange(id, tier + 1);
          render();
        });
      }
      list.appendChild(item);
    }
  }

  return {
    show() {
      render();
      screen.hidden = false;
    },
    hide,
  };
}
