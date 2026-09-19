import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

export type SourceType = 'image' | 'video' | 'webcam' | 'canvas' | 'text';

export type SourceFitMode = 'fit' | 'fill' | 'stretch' | 'center';

export interface SourceSample {
  brightness: number;
  contrast: number;
  edge: number;
}

export interface SourceContext {
  engine: AsciiEngine;
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  cols: number;
  rows: number;
  getControl: (name: string, fallback?: number) => number;
}

export interface Source {
  readonly id: string;
  readonly name: string;
  readonly type: SourceType;
  initialize(engine: AsciiEngine): void;
  load(input: unknown): Promise<void>;
  update(deltaTime: number, context: SourceContext): void;
  sample(x: number, y: number, context: SourceContext): SourceSample;
  destroy(): void;
  isReady(): boolean;
  getError(): string | null;
  getFitMode(): SourceFitMode;
  setFitMode(mode: SourceFitMode): void;
}

export type SourceMode = 'procedural' | 'source';

/** How a source drives the grid: a brightness ramp, or a shape mask over the procedural look. */
export type SourceApplyMode = 'brightness' | 'mask';

export interface SourceDebugState {
  mode: SourceMode;
  applyMode: SourceApplyMode;
  activeSourceId: string | null;
  activeSourceType: SourceType | null;
  ready: boolean;
  error: string | null;
  width: number;
  height: number;
  fitMode: SourceFitMode;
}

export const SOURCE_CONTROLS = [
  'sourceContrast',
  'sourceEdge',
  'sourceBlend',
  'sourceInvert',
  'sourceMask',
  'sourceThreshold',
] as const;

export type SourceControlName = (typeof SOURCE_CONTROLS)[number];

/**
 * `sourceInvert` flips light and dark (1 = on). `sourceMask` switches from
 * the brightness ramp to the shape mask (1 = on); `sourceThreshold` is the
 * brightness a cell needs to count as inside the shape. `sourceBlend` is
 * the source's share: in ramp mode how much of the ramp replaces the
 * patterns, in mask mode how far cells outside the shape are dimmed.
 */
export const DEFAULT_SOURCE_CONTROLS: Record<SourceControlName, number> = {
  sourceContrast: 1,
  sourceEdge: 0.3,
  sourceBlend: 1,
  sourceInvert: 0,
  sourceMask: 0,
  sourceThreshold: 0.5,
};
