import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

export type { SimulationConfig } from '../core/types';

export interface SimulationContext {
  engine: AsciiEngine;
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  cols: number;
  rows: number;
  cellCount: number;
  getControl: (name: string, fallback?: number) => number;
  spatialGrid?: import('../performance/SpatialGrid').SpatialGrid;
  particleCapScale?: number;
  simQualityScale?: number;
}

export interface Simulation {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: SimulationContext): void;
  reset(): void;
  destroy(): void;
  getParticleCount(): number;
  getMemoryBytes(): number;
}

export interface SimulationDebugInfo {
  id: string;
  name: string;
  enabled: boolean;
  particleCount: number;
  memoryBytes: number;
  updateTimeMs: number;
}

export interface SimulationManagerDebugState {
  activeSimulations: SimulationDebugInfo[];
  totalParticles: number;
  totalMemoryBytes: number;
  updateTimeMs: number;
  fps: number;
}

export const SIMULATION_CONTROLS = [
  'simStrength',
  'simSpeed',
  'simDensity',
  'simDecay',
  'simSpawnRate',
] as const;

export type SimulationControlName = (typeof SIMULATION_CONTROLS)[number];

export const DEFAULT_SIMULATION_CONTROLS: Record<SimulationControlName, number> = {
  simStrength: 0.8,
  simSpeed: 1,
  simDensity: 0.5,
  simDecay: 0.2,
  simSpawnRate: 0.6,
};
