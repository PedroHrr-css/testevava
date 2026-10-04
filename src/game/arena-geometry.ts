import type { Navigation, Point } from '../types/game.ts';

export const ARENA_SIZE = 100;
export const WALL_HEIGHT = 2.6;
export interface FloorGrid { columns: number; rows: number; floor: Uint8Array }
export interface WallSegment { x: number; z: number; width: number; depth: number }
export interface Position3 { x: number; y: number; z: number }

export function worldPoint(point: Point): Position3 {
  return { x: point.x - ARENA_SIZE / 2, y: 0, z: point.y - ARENA_SIZE / 2 };
}

/** Sample the original plan, before navigation's wall clearance is applied. */
export function planFloor(data: Uint8Array | Uint8ClampedArray, nav: Navigation): FloorGrid {
  const floor = new Uint8Array(nav.columns * nav.rows);
  for (let row = 0; row < nav.rows; row++) for (let column = 0; column < nav.columns; column++) {
    const x = Math.floor((column + .5) * nav.cellSize), y = Math.floor((row + .5) * nav.cellSize);
    const index = (y * nav.width + x) * 4;
    const r = data[index], g = data[index + 1], b = data[index + 2];
    floor[row * nav.columns + column] = Number(data[index + 3] > 200 && Math.min(r, g, b) > 55 && Math.max(r, g, b) < 175 && Math.abs(r - g) < 25 && r - b >= -20 && r - b < 75);
  }
  return { columns: nav.columns, rows: nav.rows, floor };
}

function floorAt(grid: FloorGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.columns && y < grid.rows && grid.floor[y * grid.columns + x] === 1;
}

/** Merge contiguous edges so the arena needs one instanced wall draw call. */
export function buildWalls(grid: FloorGrid): WallSegment[] {
  const walls: WallSegment[] = [];
  const dx = ARENA_SIZE / grid.columns, dz = ARENA_SIZE / grid.rows;
  const thickness = Math.min(dx, dz) * .32;
  for (let y = 0; y <= grid.rows; y++) {
    let start = -1;
    for (let x = 0; x <= grid.columns; x++) {
      const edge = x < grid.columns && floorAt(grid, x, y - 1) !== floorAt(grid, x, y);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) {
        walls.push({ x: (start + x) * dx / 2 - 50, z: y * dz - 50, width: (x - start) * dx + thickness, depth: thickness });
        start = -1;
      }
    }
  }
  for (let x = 0; x <= grid.columns; x++) {
    let start = -1;
    for (let y = 0; y <= grid.rows; y++) {
      const edge = y < grid.rows && floorAt(grid, x - 1, y) !== floorAt(grid, x, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        walls.push({ x: x * dx - 50, z: (start + y) * dz / 2 - 50, width: thickness, depth: (y - start) * dz + thickness });
        start = -1;
      }
    }
  }
  return walls;
}

export function isFloor(grid: FloorGrid, position: Position3): boolean {
  const column = Math.floor((position.x + 50) / ARENA_SIZE * grid.columns);
  const row = Math.floor((position.z + 50) / ARENA_SIZE * grid.rows);
  return floorAt(grid, column, row);
}

/** Shorten the chase camera's boom before it crosses a wall below roof height. */
export function safeCameraPosition(grid: FloorGrid, target: Position3, desired: Position3): Position3 {
  const distance = Math.hypot(desired.x - target.x, desired.y - target.y, desired.z - target.z);
  const steps = Math.max(1, Math.ceil(distance / .12));
  let safe = { ...target };
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const point = { x: target.x + (desired.x - target.x) * t, y: target.y + (desired.y - target.y) * t, z: target.z + (desired.z - target.z) * t };
    if (point.y < WALL_HEIGHT + .25 && !isFloor(grid, point)) return safe;
    safe = point;
  }
  return desired;
}
