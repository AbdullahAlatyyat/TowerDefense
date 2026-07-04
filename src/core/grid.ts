/**
 * Grid math. World units are grid cells: a cell (cx, cy) occupies
 * [cx, cx+1) × [cy, cy+1) in world space, with its center at (cx+0.5, cy+0.5).
 * The renderer maps world units to pixels with a single scale factor.
 */
export interface Point {
  x: number;
  y: number;
}

export type Cell = readonly [number, number];

export function cellCenter(cell: Cell): Point {
  return { x: cell[0] + 0.5, y: cell[1] + 0.5 };
}

export function cellKey(cx: number, cy: number): number {
  return cy * 1000 + cx;
}

/**
 * Expand orthogonal waypoints into the full set of path cell keys,
 * for buildability checks.
 */
export function expandPathCells(waypoints: readonly Cell[]): Set<number> {
  const cells = new Set<number>();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [ax, ay] = waypoints[i]!;
    const [bx, by] = waypoints[i + 1]!;
    if (ax !== bx && ay !== by) {
      throw new Error(`Path segment ${i} is not orthogonal`);
    }
    const steps = Math.abs(bx - ax) + Math.abs(by - ay);
    const dx = Math.sign(bx - ax);
    const dy = Math.sign(by - ay);
    for (let s = 0; s <= steps; s++) {
      cells.add(cellKey(ax + dx * s, ay + dy * s));
    }
  }
  return cells;
}

/** Buildability union across every lane of a multi-path level. */
export function unionPathCells(paths: readonly (readonly Cell[])[]): Set<number> {
  const cells = new Set<number>();
  for (const path of paths) {
    for (const key of expandPathCells(path)) cells.add(key);
  }
  return cells;
}

/** Polyline through waypoint cell centers, with cumulative segment lengths. */
export interface PathTrack {
  points: Point[];
  /** cumulative[i] = distance from start to points[i] */
  cumulative: number[];
  length: number;
}

export function buildTrack(waypoints: readonly Cell[]): PathTrack {
  const points = waypoints.map(cellCenter);
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    cumulative.push(cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1]! };
}

/** Position along the track at distance d from the start (clamped). */
export function pointAtDistance(track: PathTrack, d: number): Point {
  const { points, cumulative } = track;
  if (d <= 0) return { ...points[0]! };
  if (d >= track.length) return { ...points[points.length - 1]! };
  let i = 1;
  while (cumulative[i]! < d) i++;
  const a = points[i - 1]!;
  const b = points[i]!;
  const segStart = cumulative[i - 1]!;
  const t = (d - segStart) / (cumulative[i]! - segStart);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
