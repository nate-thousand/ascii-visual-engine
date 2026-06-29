import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

export type PluginType = 'pattern' | 'effect' | 'input' | 'renderer' | 'utility';

export interface PluginContext {
  engine: AsciiEngine;
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  speed: number;
  glitchAmount: number;
  trailAmount: number;
  getControl: (name: string, fallback?: number) => number;
  glyphLanguageActive?: boolean;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: PluginContext): void;
  destroy(): void;
}

export interface PluginConfig {
  id: string;
  type: PluginType;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
