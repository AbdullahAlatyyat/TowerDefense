export interface Onboarding {
  show(onClose: () => void): void;
  hide(): void;
}

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "🖐️",
    title: "Drag to build",
    body: "Press and drag a tower from the dock at the bottom onto an open tile.",
  },
  {
    emoji: "🎯",
    title: "Tap to upgrade",
    body: "Tap a placed tower to open its panel. Spend gold on two upgrade paths, or sell it back.",
  },
  {
    emoji: "▶️",
    title: "You control the pace",
    body: "Enemies wait until you tap Start wave — plan your defenses first.",
  },
  {
    emoji: "❤️🪙",
    title: "Keep an eye on top",
    body: "Lives, gold, and wave progress are always shown up top. Run out of lives and it's game over!",
  },
];

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function createOnboarding(): Onboarding {
  const screen = el("screen-onboarding");
  const emojiEl = el("onboarding-emoji");
  const titleEl = el("onboarding-title");
  const bodyEl = el("onboarding-body");
  const dotsEl = el("onboarding-dots");
  const nextBtn = el<HTMLButtonElement>("btn-onboarding-next");
  const skipBtn = el<HTMLButtonElement>("btn-onboarding-skip");

  let index = 0;
  let onClose: () => void = () => {};

  function render(): void {
    const slide = SLIDES[index]!;
    emojiEl.textContent = slide.emoji;
    titleEl.textContent = slide.title;
    bodyEl.textContent = slide.body;
    nextBtn.textContent = index === SLIDES.length - 1 ? "Got it, let's play" : "Next";

    dotsEl.innerHTML = "";
    SLIDES.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = `dot${i === index ? " active" : ""}`;
      dotsEl.appendChild(dot);
    });
  }

  function hide(): void {
    screen.hidden = true;
  }

  nextBtn.addEventListener("click", () => {
    if (index === SLIDES.length - 1) {
      onClose();
      return;
    }
    index++;
    render();
  });

  skipBtn.addEventListener("click", () => onClose());

  return {
    show(close) {
      index = 0;
      onClose = close;
      render();
      screen.hidden = false;
    },
    hide,
  };
}
