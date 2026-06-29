import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { clamp01, estimateBytes, stampCell } from '../simulationUtils';

export class CellularAutomataSimulation implements Simulation {
  readonly id = 'cellularAutomata';
  readonly name = 'Cellular Automata';
  enabled = false;

  private current: Uint8Array | null = null;
  private next: Uint8Array | null = null;
  private size = 0;
  private cols = 0;
  private rows = 0;
  private stepAccumulator = 0;
  private useCustom = true;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);
    const density = getControl('simDensity', 0.5);
    const decay = getControl('simDecay', 0.2);

    this.ensureBuffers(grid.cols, grid.rows);
    this.stepAccumulator += dt * speed * 4;
    if (this.stepAccumulator < 1) {
      this.applyToGrid(grid, glyphSet, strength);
      return;
    }
    this.stepAccumulator = 0;

    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const idx = y * this.cols + x;
        const alive = this.current![idx] > 0;
        const neighbors = this.countNeighbors(x, y);
        let next = alive ? 0 : 0;

        if (this.useCustom) {
          if (!alive && (neighbors === 2 || neighbors === 3) && Math.random() < density) next = 255;
          else if (alive && neighbors >= 2 && neighbors <= 4) next = Math.max(0, this.current![idx] - Math.floor(decay * 40));
          else if (alive && neighbors < 2) next = Math.max(0, this.current![idx] - 80);
          else if (alive && neighbors > 4) next = Math.max(0, this.current![idx] - 60);
        } else {
          if (alive && (neighbors === 2 || neighbors === 3)) next = 255;
          else if (!alive && neighbors === 3) next = 255;
        }

        this.next![idx] = next;
      }
    }

    const tmp = this.current;
    this.current = this.next;
    this.next = tmp;
    this.applyToGrid(grid, glyphSet, strength);
  }

  reset(): void {
    if (!this.current) return;
    for (let i = 0; i < this.current.length; i++) {
      this.current[i] = Math.random() < 0.25 ? 255 : 0;
    }
    if (this.next) this.next.fill(0);
  }

  destroy(): void {
    this.current = null;
    this.next = null;
    this.size = 0;
  }

  getParticleCount(): number {
    if (!this.current) return 0;
    let count = 0;
    for (let i = 0; i < this.current.length; i++) {
      if (this.current[i] > 0) count++;
    }
    return count;
  }

  getMemoryBytes(): number {
    return estimateBytes(this.current, this.next);
  }

  private ensureBuffers(cols: number, rows: number): void {
    const size = cols * rows;
    if (size === this.size && this.current) return;
    this.cols = cols;
    this.rows = rows;
    this.size = size;
    this.current = new Uint8Array(size);
    this.next = new Uint8Array(size);
    this.reset();
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.current![(y + dy) * this.cols + (x + dx)] > 0) count++;
      }
    }
    return count;
  }

  private applyToGrid(
    grid: SimulationContext['grid'],
    glyphSet: string[],
    strength: number,
  ): void {
    if (!this.current) return;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v = this.current[y * this.cols + x];
        if (v <= 0) continue;
        const b = clamp01((v / 255) * strength);
        stampCell(grid.cells, grid.cols, grid.rows, x, y, b, glyphSet, Math.floor(b * (glyphSet.length - 1)));
      }
    }
  }
}
