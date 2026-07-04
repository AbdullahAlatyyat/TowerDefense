/**
 * Fixed-timestep simulation loop with an accumulator, rendered via
 * requestAnimationFrame. The simulation always advances in exact TICK_DT
 * steps regardless of display refresh rate, which keeps runs deterministic.
 */
export const TICKS_PER_SECOND = 30;
export const TICK_DT = 1 / TICKS_PER_SECOND;

const MAX_FRAME_TIME = 0.25; // clamp after tab-switch pauses

export interface LoopStats {
  fps: number;
  tickMs: number;
}

export interface LoopControls {
  stats: LoopStats;
  /** Ticks-per-rendered-frame multiplier; does not change TICK_DT itself. */
  setTimeScale(scale: number): void;
  setPaused(paused: boolean): void;
}

export function startLoop(
  update: () => void,
  render: () => void,
): LoopControls {
  const stats: LoopStats = { fps: 0, tickMs: 0 };
  let last = performance.now();
  let accumulator = 0;
  let fpsCount = 0;
  let fpsWindowStart = last;
  let timeScale = 1;
  let paused = false;

  const frame = (now: number) => {
    if (paused) {
      // Drop any elapsed wall-time while paused so resuming doesn't burst-tick.
      last = now;
      render();
      requestAnimationFrame(frame);
      return;
    }

    accumulator +=
      Math.min((now - last) / 1000, MAX_FRAME_TIME) * timeScale;
    last = now;

    const tickStart = performance.now();
    let ticked = false;
    while (accumulator >= TICK_DT) {
      update();
      accumulator -= TICK_DT;
      ticked = true;
    }
    if (ticked) stats.tickMs = performance.now() - tickStart;

    render();

    fpsCount++;
    if (now - fpsWindowStart >= 1000) {
      stats.fps = Math.round((fpsCount * 1000) / (now - fpsWindowStart));
      fpsCount = 0;
      fpsWindowStart = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    stats,
    setTimeScale(scale) {
      timeScale = scale;
    },
    setPaused(p) {
      paused = p;
    },
  };
}
