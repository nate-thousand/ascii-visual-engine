import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { clamp01, estimateBytes, stampCell } from '../simulationUtils';

export class FluidSimulation implements Simulation {
  readonly id = 'fluid';
  readonly name = 'Fluid Field';
  enabled = false;

  private vx: Float32Array | null = null;
  private vy: Float32Array | null = null;
  private density: Float32Array | null = null;
  private cols = 0;
  private rows = 0;
  private size = 0;
  private emitAccumulator = 0;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl, time } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);
    const spawnRate = getControl('simSpawnRate', 0.6);

    this.ensureBuffers(grid.cols, grid.rows);

    this.emitAccumulator += spawnRate * dt * 4;
    while (this.emitAccumulator >= 1) {
      this.emitAccumulator -= 1;
      const ex = Math.floor(this.cols * 0.2);
      const ey = Math.floor(this.rows * 0.8);
      const idx = ey * this.cols + ex;
      this.density![idx] = Math.min(1, this.density![idx] + 0.5);
      this.vx![idx] += 0.3;
      this.vy![idx] -= 0.2;
    }

    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const idx = y * this.cols + x;
        const curl = this.vy![idx + 1] - this.vy![idx - 1] - (this.vx![idx + this.cols] - this.vx![idx - this.cols]);
        this.vx![idx] += curl * 0.05 * speed;
        this.vy![idx] -= curl * 0.05 * speed;
        this.vx![idx] *= 0.99;
        this.vy![idx] *= 0.99;
      }
    }

    const nextDensity = this.density!;
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const idx = y * this.cols + x;
        const sx = x - this.vx![idx] * dt * speed * 2;
        const sy = y - this.vy![idx] * dt * speed * 2;
        const ix = Math.max(0, Math.min(this.cols - 1, Math.floor(sx)));
        const iy = Math.max(0, Math.min(this.rows - 1, Math.floor(sy)));
        nextDensity[idx] = this.density![iy * this.cols + ix] * (1 - 0.02);
      }
    }

    const noise = Math.sin(time * 0.5) * 0.1;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x;
        const d = clamp01(this.density![idx] + noise * 0.05);
        if (d < 0.04) continue;
        stampCell(grid.cells, grid.cols, grid.rows, x, y, d * strength, glyphSet, Math.floor(d * (glyphSet.length - 1)));
      }
    }
  }

  reset(): void {
    if (!this.density) return;
    this.density.fill(0);
    this.vx!.fill(0);
    this.vy!.fill(0);
    const cx = Math.floor(this.cols * 0.2);
    const cy = Math.floor(this.rows * 0.75);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = (cy + dy) * this.cols + (cx + dx);
        if (idx >= 0 && idx < this.density.length) this.density[idx] = 0.8;
      }
    }
    this.emitAccumulator = 0;
  }

  destroy(): void {
    this.vx = null;
    this.vy = null;
    this.density = null;
    this.size = 0;
  }

  getParticleCount(): number {
    if (!this.density) return 0;
    let count = 0;
    for (let i = 0; i < this.density.length; i++) {
      if (this.density[i] > 0.05) count++;
    }
    return count;
  }

  getMemoryBytes(): number {
    return estimateBytes(this.vx, this.vy, this.density);
  }

  private ensureBuffers(cols: number, rows: number): void {
    const size = cols * rows;
    if (size === this.size && this.density) return;
    this.cols = cols;
    this.rows = rows;
    this.size = size;
    this.vx = new Float32Array(size);
    this.vy = new Float32Array(size);
    this.density = new Float32Array(size);
    this.reset();
  }
}
