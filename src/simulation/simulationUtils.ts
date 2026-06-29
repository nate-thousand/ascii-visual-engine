import type { GridCell, GridState } from '../core/types';

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function cellIndex(cols: number, x: number, y: number): number {
  return y * cols + x;
}

export function stampCell(
  cells: GridCell[],
  cols: number,
  rows: number,
  gx: number,
  gy: number,
  brightness: number,
  glyphSet: string[],
  glyphIndex?: number,
  blend = 0.7,
): void {
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return;
  const cell = cells[cellIndex(cols, x, y)];
  if (!cell) return;
  const b = clamp01(brightness);
  const gi =
    glyphIndex !== undefined
      ? Math.max(0, Math.min(glyphSet.length - 1, glyphIndex))
      : Math.floor(b * (glyphSet.length - 1));
  cell.char = glyphSet[gi] ?? cell.char;
  cell.brightness = clamp01(cell.brightness * (1 - blend) + b * blend);
  cell.phase = clamp01(cell.phase * (1 - blend) + b * blend);
}

export function stampDisc(
  grid: GridState,
  nx: number,
  ny: number,
  radius: number,
  brightness: number,
  glyphSet: string[],
  glyphIndex?: number,
): void {
  const cx = nx * (grid.cols - 1);
  const cy = ny * (grid.rows - 1);
  const r = radius * Math.max(grid.cols, grid.rows);
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(grid.rows - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(grid.cols - 1, Math.ceil(cx + r)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        stampCell(grid.cells, grid.cols, grid.rows, x, y, brightness, glyphSet, glyphIndex);
      }
    }
  }
}

export function fillGridBrightness(grid: GridState, value: number): void {
  const b = clamp01(value);
  for (const cell of grid.cells) {
    cell.brightness = b * 0.15;
    cell.phase = b * 0.15;
  }
}

export function gridToNormalized(x: number, y: number, cols: number, rows: number): { nx: number; ny: number } {
  return {
    nx: x / Math.max(cols - 1, 1),
    ny: y / Math.max(rows - 1, 1),
  };
}

export function normalizedToGrid(nx: number, ny: number, cols: number, rows: number): { x: number; y: number } {
  return {
    x: nx * (cols - 1),
    y: ny * (rows - 1),
  };
}

export function estimateBytes(...arrays: Array<ArrayBufferView | null | undefined>): number {
  let total = 0;
  for (const arr of arrays) {
    if (arr) total += arr.byteLength;
  }
  return total;
}
