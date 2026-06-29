import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

export type SourceType = 'image' | 'video' | 'webcam' | 'canvas';

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

export interface SourceDebugState {
  mode: SourceMode;
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
] as const;

export type SourceControlName = (typeof SOURCE_CONTROLS)[number];

export const DEFAULT_SOURCE_CONTROLS: Record<SourceControlName, number> = {
  sourceContrast: 1,
  sourceEdge: 0.3,
  sourceBlend: 1,
};
