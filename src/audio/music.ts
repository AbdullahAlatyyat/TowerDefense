/**
 * Procedurally generated ambient loop — same zero-asset-file approach as
 * sfx.ts, sharing its AudioContext. A calm pad plays at all times; an
 * intense layer crossfades in while a wave is active, ducking back out
 * between waves.
 */
import { ensureAudioContext } from "./context";

export interface Music {
  /** Idempotent; call from a user gesture (mobile autoplay policy). */
  start(): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setIntense(intense: boolean): void;
}

/** Simple fifth+octave pad — no third, so it stays mood-neutral across levels. */
const CALM_CHORD = [110, 164.81, 220]; // A2, E3, A3
const FADE = 1.4;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function createMusic(initialMuted: boolean, initialVolume: number): Music {
  let muted = initialMuted;
  let volume = clamp01(initialVolume);
  let started = false;
  let masterGain: GainNode | null = null;
  let calmGain: GainNode | null = null;
  let intenseGain: GainNode | null = null;

  function start(): void {
    if (started) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    started = true;

    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.45 * volume;
    masterGain.connect(ctx.destination);

    calmGain = ctx.createGain();
    calmGain.gain.value = 1;
    calmGain.connect(masterGain);

    intenseGain = ctx.createGain();
    intenseGain.gain.value = 0;
    intenseGain.connect(masterGain);

    // Calm pad: detuned sine pairs per chord tone, each behind a lowpass
    // filter whose cutoff drifts slowly via its own LFO.
    for (const freq of CALM_CHORD) {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        osc.connect(filter).connect(gain).connect(calmGain);
        osc.start();

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.06 + Math.random() * 0.03;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();
      }
    }

    // Intense layer: the same chord an octave up, triangle waves with a
    // gentle tremolo, so waves feel busier without changing key/mood.
    for (const freq of CALM_CHORD.map((f) => f * 2)) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      osc.connect(gain).connect(intenseGain);
      osc.start();

      const trem = ctx.createOscillator();
      trem.frequency.value = 5;
      const tremGain = ctx.createGain();
      tremGain.gain.value = 0.015;
      trem.connect(tremGain).connect(gain.gain);
      trem.start();
    }
  }

  return {
    start,
    setMuted(m) {
      muted = m;
      if (!m) start();
      const ctx = ensureAudioContext();
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(m ? 0 : 0.45 * volume, ctx.currentTime, 0.2);
      }
    },
    setVolume(v) {
      volume = clamp01(v);
      const ctx = ensureAudioContext();
      if (masterGain && ctx && !muted) {
        masterGain.gain.setTargetAtTime(0.45 * volume, ctx.currentTime, 0.2);
      }
    },
    setIntense(intense) {
      if (muted) return;
      start();
      const ctx = ensureAudioContext();
      if (calmGain && intenseGain && ctx) {
        calmGain.gain.setTargetAtTime(intense ? 0.55 : 1, ctx.currentTime, FADE);
        intenseGain.gain.setTargetAtTime(intense ? 0.6 : 0, ctx.currentTime, FADE);
      }
    },
  };
}
