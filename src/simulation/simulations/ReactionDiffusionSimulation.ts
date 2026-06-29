import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { clamp01, estimateBytes, stampCell } from '../simulationUtils';

export class ReactionDiffusionSimulation implements Simulation {
  readonly id = 'reactionDiffusion';
  readonly name = 'Reaction Diffusion';
  enabled = false;

  private a: Float32Array | null = null;
  private b: Float32Array | null = null;
  private nextA: Float32Array | null = null;
  private nextB: Float32Array | null = null;
  private cols = 0;
  private rows = 0;
  private size = 0;
  private stepAccumulator = 0;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);

    this.ensureBuffers(grid.cols, grid.rows);
    this.stepAccumulator += dt * speed * 8;
    const steps = Math.floor(this.stepAccumulator);
    if (steps <= 0) {
      this.applyToGrid(grid, glyphSet, strength);
      return;
    }
    this.stepAccumulator -= steps;

    const feed = 0.055;
    const kill = 0.062;
    const da = 1.0;
    const db = 0.5;

    for (let s = 0; s < steps; s++) {
      for (let y = 1; y < this.rows - 1; y++) {
        for (let x = 1; x < this.cols - 1; x++) {
          const idx = y * this.cols + x;
          const lapA = this.laplacian(this.a!, x, y);
          const lapB = this.laplacian(this.b!, x, y);
          const aVal = this.a![idx];
          const bVal = this.b![idx];
          const reaction = aVal * bVal * bVal;
          this.nextA![idx] = aVal + (da * lapA - reaction + feed * (1 - aVal)) * 0.6;
          this.nextB![idx] = bVal + (db * lapB + reaction - (kill + feed) * bVal) * 0.6;
        }
      }
      const tmpA = this.a;
      const tmpB = this.b;
      this.a = this.nextA;
      this.b = this.nextB;
      this.nextA = tmpA!;
      this.nextB = tmpB!;
    }

    this.applyToGrid(grid, glyphSet, strength);
  }

  reset(): void {
    if (!this.a || !this.b) return;
    this.a.fill(1);
    this.b.fill(0);
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    for (let y = cy - 4; y <= cy + 4; y++) {
      for (let x = cx - 4; x <= cx + 4; x++) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
        this.b[y * this.cols + x] = 1;
      }
    }
    for (let i = 0; i < 8; i++) {
      const rx = Math.floor(Math.random() * this.cols);
      const ry = Math.floor(Math.random() * this.rows);
      this.b[ry * this.cols + rx] = 1;
    }
  }

  destroy(): void {
    this.a = null;
    this.b = null;
    this.nextA = null;
    this.nextB = null;
    this.size = 0;
  }

  getParticleCount(): number {
    if (!this.b) return 0;
    let count = 0;
    for (let i = 0; i < this.b.length; i++) {
      if (this.b[i] > 0.1) count++;
    }
    return count;
  }

  getMemoryBytes(): number {
    return estimateBytes(this.a, this.b, this.nextA, this.nextB);
  }

  private ensureBuffers(cols: number, rows: number): void {
    const size = cols * rows;
    if (size === this.size && this.a) return;
    this.cols = cols;
    this.rows = rows;
    this.size = size;
    this.a = new Float32Array(size);
    this.b = new Float32Array(size);
    this.nextA = new Float32Array(size);
    this.nextB = new Float32Array(size);
    this.reset();
  }

  private laplacian(field: Float32Array, x: number, y: number): number {
    const idx = y * this.cols + x;
    return (
      field[idx - 1] +
      field[idx + 1] +
      field[idx - this.cols] +
      field[idx + this.cols] -
      4 * field[idx]
    );
  }

  private applyToGrid(
    grid: SimulationContext['grid'],
    glyphSet: string[],
    strength: number,
  ): void {
    if (!this.b) return;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v = this.b[y * this.cols + x];
        if (v < 0.05) continue;
        const b = clamp01(v * strength);
        stampCell(grid.cells, grid.cols, grid.rows, x, y, b, glyphSet, Math.floor(b * (glyphSet.length - 1)));
      }
    }
  }
}
