/** Minimal in-memory sliding-window limiter — fine for a single self-hosted instance. */
const attempts = new Map<string, number[]>();

export function tooManyAttempts(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > max;
}
