import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

export type PatternId =
  | 'radialSymmetry'
  | 'spiral'
  | 'wave'
  | 'grid'
  | 'cellular'
  | 'scanline';

export interface PatternSampleContext {
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  speed: number;
  getControl: (name: string, fallback?: number) => number;
}

export interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: PatternSampleContext): void;
  sample(x: number, y: number, context: PatternSampleContext): number;
  destroy(): void;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function hashNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashNoise(ix, iy);
  const b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1);
  const d = hashNoise(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
