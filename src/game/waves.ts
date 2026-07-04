import { generateEndlessWave } from "./endless";
import type { WaveDef } from "../data/level01";
import type { GameState } from "./state";

export function canStartWave(state: GameState): boolean {
  return (
    state.status === "playing" &&
    !state.waveActive &&
    state.waveIndex < state.level.waves.length - 1
  );
}

export function startWave(state: GameState): boolean {
  if (!canStartWave(state)) return false;
  state.waveIndex++;
  const wave = state.level.waves[state.waveIndex]!;
  state.waveActive = true;
  state.groupIndex = 0;
  state.spawnRemaining = wave.groups[0]!.count;
  state.nextSpawnTick = state.tick;
  return true;
}

/** A wave ends when everything has spawned and the field is clear. */
export function checkWaveEnd(state: GameState): void {
  if (!state.waveActive) return;
  const wave = state.level.waves[state.waveIndex]!;
  const spawningDone =
    state.spawnRemaining <= 0 && state.groupIndex >= wave.groups.length - 1;
  if (!spawningDone || state.enemies.length > 0) return;
  state.waveActive = false;
  if (state.waveIndex >= state.level.waves.length - 1) {
    if (state.level.endless) {
      const next = generateEndlessWave(state.waveIndex + 1, state.rng);
      (state.level.waves as WaveDef[]).push(next);
    } else {
      state.status = "won";
    }
  }
}
