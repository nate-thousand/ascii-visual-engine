import type { GridState } from '../core/types';
import { clamp01 } from '../compositing/BlendModes';

export interface PostPassContext {
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  getControl: (name: string, fallback?: number) => number;
  previousBrightness: Float32Array | null;
}

export interface PostPass {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  amount: number;
  apply(ctx: PostPassContext): void;
  reset(): void;
}

export function brightnessToChar(brightness: number, glyphSet: string[]): string {
  if (glyphSet.length === 0) return ' ';
  const index = Math.floor(clamp01(brightness) * (glyphSet.length - 1));
  return glyphSet[Math.max(0, Math.min(glyphSet.length - 1, index))];
}

export function applyBrightnessToGrid(grid: GridState, glyphSet: string[]): void {
  for (const cell of grid.cells) {
    cell.char = brightnessToChar(cell.brightness, glyphSet);
    cell.phase = cell.brightness;
  }
}
