/** Synthesized sound effects — zero asset files. */
import { ensureAudioContext } from "./context";

export type SfxName =
  | "shot"
  | "hit"
  | "death"
  | "leak"
  | "place"
  | "upgrade"
  | "sell"
  | "win"
  | "lose"
  | "bossSpawn";

export interface Sfx {
  play(name: SfxName): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  isMuted(): boolean;
}

interface Note {
  /** Hz at start / end (linear glide) */
  f0: number;
  f1?: number;
  /** seconds */
  dur: number;
  /** delay from trigger, seconds */
  at?: number;
  type?: OscillatorType;
  gain?: number;
}

const DEFS: Record<SfxName, Note[]> = {
  shot: [{ f0: 880, f1: 660, dur: 0.045, type: "square", gain: 0.06 }],
  hit: [{ f0: 220, f1: 180, dur: 0.05, type: "triangle", gain: 0.1 }],
  death: [{ f0: 330, f1: 70, dur: 0.18, type: "sawtooth", gain: 0.12 }],
  leak: [
    { f0: 340, f1: 240, dur: 0.12, type: "square", gain: 0.14 },
    { f0: 240, f1: 160, dur: 0.16, at: 0.1, type: "square", gain: 0.14 },
  ],
  place: [
    { f0: 330, dur: 0.06, type: "triangle", gain: 0.14 },
    { f0: 494, dur: 0.08, at: 0.05, type: "triangle", gain: 0.14 },
  ],
  upgrade: [
    { f0: 440, dur: 0.07, type: "triangle", gain: 0.14 },
    { f0: 660, dur: 0.07, at: 0.06, type: "triangle", gain: 0.14 },
    { f0: 880, dur: 0.1, at: 0.12, type: "triangle", gain: 0.14 },
  ],
  sell: [
    { f0: 440, f1: 220, dur: 0.14, type: "triangle", gain: 0.12 },
  ],
  win: [
    { f0: 523, dur: 0.12, type: "triangle", gain: 0.16 },
    { f0: 659, dur: 0.12, at: 0.11, type: "triangle", gain: 0.16 },
    { f0: 784, dur: 0.12, at: 0.22, type: "triangle", gain: 0.16 },
    { f0: 1047, dur: 0.3, at: 0.33, type: "triangle", gain: 0.16 },
  ],
  lose: [
    { f0: 220, f1: 180, dur: 0.25, type: "sawtooth", gain: 0.14 },
    { f0: 180, f1: 110, dur: 0.45, at: 0.22, type: "sawtooth", gain: 0.14 },
  ],
  bossSpawn: [
    { f0: 90, f1: 55, dur: 0.5, type: "sawtooth", gain: 0.16 },
    { f0: 180, f1: 60, dur: 0.35, at: 0.05, type: "square", gain: 0.08 },
  ],
};

/** Per-sound minimum re-trigger interval (ms) so busy waves don't buzz. */
const THROTTLE_MS: Partial<Record<SfxName, number>> = {
  shot: 55,
  hit: 45,
  death: 60,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function createSfx(initialMuted: boolean, initialVolume: number): Sfx {
  let muted = initialMuted;
  let volume = clamp01(initialVolume);
  const lastPlayed = new Map<SfxName, number>();

  return {
    play(name) {
      if (muted || volume <= 0) return;
      const now = performance.now();
      const throttle = THROTTLE_MS[name];
      if (throttle && now - (lastPlayed.get(name) ?? 0) < throttle) return;
      lastPlayed.set(name, now);

      const ac = ensureAudioContext();
      if (!ac) return;
      for (const note of DEFS[name]) {
        const start = ac.currentTime + (note.at ?? 0);
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = note.type ?? "sine";
        osc.frequency.setValueAtTime(note.f0, start);
        if (note.f1 !== undefined) {
          osc.frequency.linearRampToValueAtTime(note.f1, start + note.dur);
        }
        const g = (note.gain ?? 0.1) * volume;
        gain.gain.setValueAtTime(g, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);
        osc.connect(gain).connect(ac.destination);
        osc.start(start);
        osc.stop(start + note.dur + 0.02);
      }
    },
    setMuted(m) {
      muted = m;
    },
    setVolume(v) {
      volume = clamp01(v);
    },
    isMuted: () => muted,
  };
}
