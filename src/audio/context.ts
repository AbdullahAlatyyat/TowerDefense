/**
 * Single AudioContext shared by sfx.ts and music.ts, created lazily so it
 * always starts from a user gesture (mobile browsers block audio otherwise).
 */
let ctx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
