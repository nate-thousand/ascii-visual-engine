import type { AsciiEngine } from '../../core/AsciiEngine';
import { Random } from '../../core/Random';
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

  private random = new Random('reactionDiffusion');

  initialize(engine: AsciiEngine): void {
    this.random = engine.getRandom('reactionDiffusion');
  }

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
    // Gray-Scott with the usual 3x3 kernel (weights sum to zero) and a unit
    // step. The old four neighbour Laplacian at 0.6 was past the explicit
    // Euler stability limit, so the fields blew up to NaN within seconds
    // and the renderer threw on buckets[NaN].

    for (let s = 0; s < steps; s++) {
      for (let y = 1; y < this.rows - 1; y++) {
        for (let x = 1; x < this.cols - 1; x++) {
          const idx = y * this.cols + x;
          const lapA = this.laplacian(this.a!, x, y);
          const lapB = this.laplacian(this.b!, x, y);
          const aVal = this.a![idx];
          const bVal = this.b![idx];
          const reaction = aVal * bVal * bVal;
          this.nextA![idx] = clamp01(aVal + (da * lapA - reaction + feed * (1 - aVal)));
          this.nextB![idx] = clamp01(bVal + (db * lapB + reaction - (kill + feed) * bVal));
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
      const rx = this.random.int(this.cols);
      const ry = this.random.int(this.rows);
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
    const c = this.cols;
    return (
      0.2 * (field[idx - 1] + field[idx + 1] + field[idx - c] + field[idx + c]) +
      0.05 * (field[idx - c - 1] + field[idx - c + 1] + field[idx + c - 1] + field[idx + c + 1]) -
      field[idx]
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
