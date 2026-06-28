import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridState } from '../core/types';
import { clamp01 } from '../plugins/Plugin';
import {
  clearMotionBuffer,
  createMotionBuffer,
  type Motion,
  type MotionBuffer,
  type MotionContext,
  type MotionDebugInfo,
  type MotionManagerDebugState,
} from './Motion';

export class MotionManager {
  private motions = new Map<string, Motion>();
  private engine: AsciiEngine | null = null;
  private accumulator: MotionBuffer | null = null;
  private scratch: MotionBuffer | null = null;
  private bufferSize = 0;
  private lastFrameTimeMs = 0;
  private lastFps = 0;

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
  }

  setFps(fps: number): void {
    this.lastFps = fps;
  }

  registerMotion(motion: Motion): void {
    if (this.motions.has(motion.id)) {
      throw new Error(`MotionManager: motion "${motion.id}" is already registered`);
    }
    this.motions.set(motion.id, motion);
    if (this.engine) {
      motion.initialize(this.engine);
    }
  }

  unregisterMotion(id: string): void {
    const motion = this.motions.get(id);
    if (!motion) return;
    motion.destroy();
    this.motions.delete(id);
  }

  enableMotion(id: string): void {
    const motion = this.motions.get(id);
    if (!motion) {
      throw new Error(`MotionManager: unknown motion "${id}"`);
    }
    motion.enabled = true;
  }

  disableMotion(id: string): void {
    const motion = this.motions.get(id);
    if (!motion) return;
    motion.enabled = false;
  }

  getMotion(id: string): Motion | undefined {
    return this.motions.get(id);
  }

  getAll(): Motion[] {
    return Array.from(this.motions.values());
  }

  getEnabled(): Motion[] {
    return this.getAll().filter((m) => m.enabled);
  }

  setMotionWeight(id: string, weight: number): void {
    const motion = this.motions.get(id);
    if (motion) motion.weight = Math.max(0, weight);
  }

  setMotionPriority(id: string, priority: number): void {
    const motion = this.motions.get(id);
    if (motion) motion.priority = priority;
  }

  setEnabledIds(
    configs: { id: string; enabled?: boolean; weight?: number; priority?: number }[],
  ): void {
    for (const motion of this.motions.values()) {
      motion.enabled = false;
    }
    for (const config of configs) {
      const motion = this.motions.get(config.id);
      if (!motion) continue;
      motion.enabled = config.enabled !== false;
      if (config.weight !== undefined) motion.weight = config.weight;
      if (config.priority !== undefined) motion.priority = config.priority;
    }
  }

  ensureBuffers(cellCount: number): void {
    if (cellCount <= this.bufferSize && this.accumulator && this.scratch) return;
    this.bufferSize = cellCount;
    this.accumulator = createMotionBuffer(cellCount);
    this.scratch = createMotionBuffer(cellCount);
  }

  combineMotions(context: Omit<MotionContext, 'scratch'>): void {
    const start = performance.now();
    const { grid, cellCount } = context;
    this.ensureBuffers(cellCount);

    const acc = this.accumulator!;
    const scratch = this.scratch!;
    clearMotionBuffer(acc, cellCount);

    const enabled = this.getEnabled().sort((a, b) => a.priority - b.priority);
    if (enabled.length === 0) return;

    let totalWeight = 0;
    const blendWeight = context.getControl('blendWeight', 1);

    const motionContext: MotionContext = { ...context, scratch };

    for (const motion of enabled) {
      clearMotionBuffer(scratch, cellCount);
      motion.update(context.dt, motionContext);
      const w = motion.weight * blendWeight;
      if (w <= 0) continue;
      this.blendBuffer(acc, scratch, w, cellCount);
      totalWeight += w;
    }

    if (totalWeight > 0) {
      this.applyToGrid(grid, acc, cellCount, totalWeight);
    }

    this.lastFrameTimeMs = performance.now() - start;
  }

  getDebugState(): MotionManagerDebugState {
    const enabled = this.getEnabled();
    let velSum = 0;
    let count = 0;

    if (this.accumulator) {
      for (let i = 0; i < this.bufferSize; i++) {
        velSum += Math.abs(this.accumulator.vx[i]) + Math.abs(this.accumulator.vy[i]);
        count++;
      }
    }

    return {
      activeMotions: enabled.map(
        (m): MotionDebugInfo => ({
          id: m.id,
          name: m.name,
          enabled: m.enabled,
          weight: m.weight,
          priority: m.priority,
        }),
      ),
      frameTimeMs: this.lastFrameTimeMs,
      avgVelocity: count > 0 ? velSum / count : 0,
      particleCount: count,
      fps: this.lastFps,
    };
  }

  destroy(): void {
    for (const motion of this.motions.values()) {
      motion.destroy();
    }
    this.motions.clear();
    this.accumulator = null;
    this.scratch = null;
    this.engine = null;
  }

  private blendBuffer(
    acc: MotionBuffer,
    src: MotionBuffer,
    weight: number,
    size: number,
  ): void {
    for (let i = 0; i < size; i++) {
      acc.dx[i] += src.dx[i] * weight;
      acc.dy[i] += src.dy[i] * weight;
      acc.vx[i] += src.vx[i] * weight;
      acc.vy[i] += src.vy[i] * weight;
      acc.scale[i] += (src.scale[i] - 1) * weight;
      acc.rotation[i] += src.rotation[i] * weight;
      acc.brightness[i] += src.brightness[i] * weight;
      acc.phase[i] += src.phase[i] * weight;
      acc.density[i] += (src.density[i] - 1) * weight;
      acc.deformation[i] += src.deformation[i] * weight;
    }
  }

  private applyToGrid(
    grid: GridState,
    acc: MotionBuffer,
    size: number,
    totalWeight: number,
  ): void {
    const inv = 1 / totalWeight;
    const { cells } = grid;

    for (let i = 0; i < size; i++) {
      const cell = cells[i];
      cell.ox = acc.dx[i] * inv;
      cell.oy = acc.dy[i] * inv;
      cell.vx = acc.vx[i] * inv;
      cell.vy = acc.vy[i] * inv;
      cell.scale = clamp01(acc.scale[i] * inv + 1);
      cell.rotation = acc.rotation[i] * inv;
      cell.brightness = clamp01(acc.brightness[i] * inv);
      cell.phase = acc.phase[i] * inv;
      cell.deformation = acc.deformation[i] * inv;
    }
  }
}
