import { canPlaceTower, placeTower, type GameState } from "../game/state";
import type { TowerTypeId } from "../data/towers";
import type { Renderer } from "../render/renderer";

/**
 * Press-and-drag tower placement, designed for one-thumb play:
 * - drag starts on a build button in the bottom dock
 * - on touch, the ghost is offset ~1.6 cells above the finger so the
 *   finger never hides the target cell
 * - the targeted cell highlights green/red for validity; release places
 * - releasing off the board (e.g. back over the dock) cancels
 *
 * Tapping a placed tower on the board selects it (opens the upgrade
 * panel); tapping elsewhere deselects.
 */
const TOUCH_OFFSET_CELLS = 1.6;
const TAP_SLOP = 0.35; // world units of movement still counted as a tap

export interface PlacementPreview {
  active: boolean;
  type: TowerTypeId;
  /** ghost center in world (cell) units */
  worldX: number;
  worldY: number;
  cx: number;
  cy: number;
  onBoard: boolean;
  valid: boolean;
}

export interface UiState {
  placement: PlacementPreview;
  selectedTowerId: number | null;
}

export function createInput(
  renderer: Renderer,
  getState: () => GameState,
  dock: HTMLElement,
  onPlaced: () => void,
): UiState {
  const ui: UiState = {
    placement: {
      active: false,
      type: "gunner",
      worldX: 0,
      worldY: 0,
      cx: -1,
      cy: -1,
      onBoard: false,
      valid: false,
    },
    selectedTowerId: null,
  };
  const placement = ui.placement;
  let pointerId: number | null = null;
  let activeButton: HTMLElement | null = null;

  const track = (e: PointerEvent) => {
    const state = getState();
    const world = renderer.worldFromClient(e.clientX, e.clientY);
    const offset = e.pointerType === "touch" ? TOUCH_OFFSET_CELLS : 0;
    placement.worldX = world.x;
    placement.worldY = world.y - offset;
    placement.cx = Math.floor(placement.worldX);
    placement.cy = Math.floor(placement.worldY);
    placement.onBoard =
      placement.cx >= 0 &&
      placement.cy >= 0 &&
      placement.cx < state.level.cols &&
      placement.cy < state.level.rows;
    placement.valid =
      placement.onBoard &&
      canPlaceTower(state, placement.type, placement.cx, placement.cy);
  };

  const end = (e: PointerEvent, commit: boolean) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    activeButton?.classList.remove("dragging");
    activeButton = null;
    if (commit && placement.active && placement.valid) {
      if (placeTower(getState(), placement.type, placement.cx, placement.cy)) {
        onPlaced();
      }
    }
    placement.active = false;
  };

  dock.addEventListener("pointerdown", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-tower]");
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    if (pointerId !== null || getState().status !== "playing") return;
    e.preventDefault();
    pointerId = e.pointerId;
    placement.type = btn.dataset.tower as TowerTypeId;
    placement.active = true;
    ui.selectedTowerId = null;
    activeButton = btn;
    btn.classList.add("dragging");
    track(e);
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointerId) return;
    e.preventDefault();
    track(e);
  });

  window.addEventListener("pointerup", (e) => end(e, true));
  window.addEventListener("pointercancel", (e) => end(e, false));

  // Tap-to-select on the board canvas.
  let tapStart: { x: number; y: number } | null = null;
  renderer.app.canvas.addEventListener("pointerdown", (e) => {
    if (placement.active) return;
    tapStart = renderer.worldFromClient(e.clientX, e.clientY);
  });
  renderer.app.canvas.addEventListener("pointerup", (e) => {
    if (!tapStart || placement.active) {
      tapStart = null;
      return;
    }
    const p = renderer.worldFromClient(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - tapStart.x, p.y - tapStart.y);
    tapStart = null;
    if (moved > TAP_SLOP) return;
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    const tower = getState().towers.find((t) => t.cx === cx && t.cy === cy);
    ui.selectedTowerId = tower ? tower.id : null;
  });

  return ui;
}
