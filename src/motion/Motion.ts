import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';

/** Per-cell motion contribution buffer — reused each frame, no allocations. */
export interface MotionBuffer {
  dx: Float32Array;
  dy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  scale: Float32Array;
  rotation: Float32Array;
  brightness: Float32Array;
  phase: Float32Array;
  density: Float32Array;
  deformation: Float32Array;
}

export function createMotionBuffer(size: number): MotionBuffer {
  return {
    dx: new Float32Array(size),
    dy: new Float32Array(size),
    vx: new Float32Array(size),
    vy: new Float32Array(size),
    scale: new Float32Array(size),
    rotation: new Float32Array(size),
    brightness: new Float32Array(size),
    phase: new Float32Array(size),
    density: new Float32Array(size),
    deformation: new Float32Array(size),
  };
}

export function clearMotionBuffer(buf: MotionBuffer, size: number): void {
  buf.dx.fill(0, 0, size);
  buf.dy.fill(0, 0, size);
  buf.vx.fill(0, 0, size);
  buf.vy.fill(0, 0, size);
  buf.scale.fill(1, 0, size);
  buf.rotation.fill(0, 0, size);
  buf.brightness.fill(0.5, 0, size);
  buf.phase.fill(0, 0, size);
  buf.density.fill(1, 0, size);
  buf.deformation.fill(0, 0, size);
}

export interface MotionContext {
  engine: AsciiEngine;
  grid: GridState;
  time: number;
  dt: number;
  cols: number;
  rows: number;
  cellCount: number;
  /** Scratch buffer for the current motion — cleared before each update. */
  scratch: MotionBuffer;
  getControl: (name: string, fallback?: number) => number;
}

export interface Motion {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  weight: number;
  priority: number;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: MotionContext): void;
  destroy(): void;
}

export interface MotionConfig {
  id: string;
  enabled?: boolean;
  weight?: number;
  priority?: number;
}

export interface MotionDebugInfo {
  id: string;
  name: string;
  enabled: boolean;
  weight: number;
  priority: number;
}

export interface MotionManagerDebugState {
  activeMotions: MotionDebugInfo[];
  frameTimeMs: number;
  avgVelocity: number;
  particleCount: number;
  fps: number;
}

/** Motion control names exposed via engine.setControl. */
export const MOTION_CONTROLS = [
  'speed',
  'strength',
  'randomness',
  'frequency',
  'amplitude',
  'decay',
  'drag',
  'gravity',
  'noiseScale',
  'flowStrength',
  'blendWeight',
] as const;

export type MotionControlName = (typeof MOTION_CONTROLS)[number];

export const DEFAULT_MOTION_CONTROLS: Record<MotionControlName, number> = {
  speed: 1,
  strength: 0.7,
  randomness: 0.3,
  frequency: 1,
  amplitude: 1,
  decay: 0.1,
  drag: 0.05,
  gravity: 0.5,
  noiseScale: 1,
  flowStrength: 0.8,
  blendWeight: 1,
};
