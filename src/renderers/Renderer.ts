import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';

export type RendererType = 'canvas' | 'dom' | 'offscreen-canvas' | 'webgl';

export type RendererId = 'canvas' | 'dom' | 'offscreen-canvas' | 'webgl';

export type RendererOption = RendererId;

export interface RenderFrame {
  trailAmount: number;
  time: number;
}

export interface RenderContext {
  engine: AsciiEngine;
  dt: number;
  getControl: (name: string, fallback?: number) => number;
  glyphCache?: import('../performance/GlyphCache').GlyphCache;
  dirtyTracker?: import('../performance/DirtyRegionTracker').DirtyRegionTracker;
  dirtyRendering?: boolean;
  onRenderComplete?: (metrics: import('../performance/PerformanceTypes').RenderMetrics) => void;
}

export interface RendererDebugState {
  activeRendererId: RendererId | null;
  activeRendererType: RendererType | null;
  activeRendererName: string | null;
  available: boolean;
  supportsLiveSwitch: boolean;
  switchWarning: string | null;
  offscreenSupported: boolean;
  cellCount: number;
  drawCalls: number;
  renderTimeMs: number;
  partialUpdate: boolean;
}

export interface RendererSwitchResult {
  ok: boolean;
  warning: string | null;
  activeId: RendererId | null;
}

export interface Renderer {
  readonly id: RendererId;
  readonly name: string;
  readonly type: RendererType;
  initialize(engine: AsciiEngine): void;
  resize(width: number, height: number): void;
  render(frame: RenderFrame, context: RenderContext): void;
  destroy(): void;
  getGridState(time: number): GridState;
  getDimensions(): GridDimensions;
  setDensity(density: number): void;
  setGlyphSet(glyphSet: string[]): void;
  importGridState(state: GridState): void;
  isAvailable(): boolean;
  supportsLiveSwitch(): boolean;
  getSwitchWarning(): string | null;
}
