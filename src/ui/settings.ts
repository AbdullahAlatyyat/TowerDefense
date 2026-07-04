import type { SaveData } from "../core/save";
import { writeSave } from "../core/save";
import type { Account } from "../net/auth";

export interface SettingsScreen {
  show(): void;
  hide(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createSettingsScreen(opts: {
  getSave: () => SaveData;
  getAccount: () => Account | null;
  onSfxVolume: (volume: number) => void;
  onMusicVolume: (volume: number) => void;
  onHapticsChange: (enabled: boolean) => void;
  onDisplayNameChange: (name: string) => Promise<void>;
  onBack: () => void;
}): SettingsScreen {
  const screen = el("screen-settings");
  const sfxSlider = el<HTMLInputElement>("settings-sfx-volume");
  const musicSlider = el<HTMLInputElement>("settings-music-volume");
  const sfxValue = el("sfx-volume-value");
  const musicValue = el("music-volume-value");
  const hapticsPicker = el("haptics-picker");
  const displayNameRow = el("settings-display-name-row");
  const displayNameInput = el<HTMLInputElement>("settings-display-name");
  const displayNameSave = el<HTMLButtonElement>("btn-settings-display-name-save");

  function hide(): void {
    screen.hidden = true;
  }

  el("btn-settings-back").addEventListener("click", () => {
    hide();
    opts.onBack();
  });

  sfxSlider.addEventListener("input", () => {
    const v = Number(sfxSlider.value) / 100;
    opts.getSave().sfxVolume = v;
    opts.onSfxVolume(v);
    sfxValue.textContent = `${sfxSlider.value}%`;
  });
  sfxSlider.addEventListener("change", () => writeSave(opts.getSave()));

  musicSlider.addEventListener("input", () => {
    const v = Number(musicSlider.value) / 100;
    opts.getSave().musicVolume = v;
    opts.onMusicVolume(v);
    musicValue.textContent = `${musicSlider.value}%`;
  });
  musicSlider.addEventListener("change", () => writeSave(opts.getSave()));

  function buildHapticsPicker(): void {
    hapticsPicker.innerHTML = "";
    for (const enabled of [true, false]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = enabled ? "On" : "Off";
      btn.classList.toggle("active", opts.getSave().haptics === enabled);
      btn.addEventListener("click", () => {
        const save = opts.getSave();
        save.haptics = enabled;
        opts.onHapticsChange(enabled);
        writeSave(save);
        buildHapticsPicker();
      });
      hapticsPicker.appendChild(btn);
    }
  }

  displayNameSave.addEventListener("click", () => {
    const name = displayNameInput.value.trim();
    if (!name) return;
    void opts.onDisplayNameChange(name);
  });

  function render(): void {
    const save = opts.getSave();
    sfxSlider.value = String(Math.round(save.sfxVolume * 100));
    sfxValue.textContent = `${sfxSlider.value}%`;
    musicSlider.value = String(Math.round(save.musicVolume * 100));
    musicValue.textContent = `${musicSlider.value}%`;
    buildHapticsPicker();

    const account = opts.getAccount();
    displayNameRow.hidden = !account;
    if (account) displayNameInput.value = account.displayName;
  }

  return {
    show() {
      render();
      screen.hidden = false;
    },
    hide,
  };
}
