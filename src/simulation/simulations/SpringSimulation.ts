import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { estimateBytes, stampCell } from '../simulationUtils';

const COLS = 12;
const ROWS = 8;

interface Node {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
}

export class SpringSimulation implements Simulation {
  readonly id = 'spring';
  readonly name = 'Spring Network';
  enabled = false;

  private nodes: Node[] = [];
  private restLength = 0;
  private initialized = false;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);
    const decay = getControl('simDecay', 0.2);

    if (!this.initialized) this.reset();

    const substeps = 3;
    const subDt = (dt * speed) / substeps;
    const gravity = 0.6;
    const stiffness = 8;
    const damping = 0.02 + decay * 0.05;

    for (let s = 0; s < substeps; s++) {
      for (const node of this.nodes) {
        if (node.pinned) continue;
        node.py = node.y;
        node.y += gravity * subDt * subDt;
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = y * COLS + x;
          const node = this.nodes[i];
          if (x < COLS - 1) this.applySpring(i, i + 1, stiffness, subDt);
          if (y < ROWS - 1) this.applySpring(i, i + COLS, stiffness, subDt);
          if (x < COLS - 1 && y < ROWS - 1) this.applySpring(i, i + COLS + 1, stiffness * 0.7, subDt);
          if (x > 0 && y < ROWS - 1) this.applySpring(i, i + COLS - 1, stiffness * 0.7, subDt);
          if (node.pinned) continue;
          const vx = (node.x - node.px) * (1 - damping);
          const vy = (node.y - node.py) * (1 - damping);
          node.px = node.x;
          node.py = node.y;
          node.x += vx;
          node.y += vy;
        }
      }
    }

    for (const node of this.nodes) {
      stampCell(
        grid.cells,
        grid.cols,
        grid.rows,
        node.x * (grid.cols - 1),
        node.y * (grid.rows - 1),
        strength,
        glyphSet,
        node.pinned ? glyphSet.length - 1 : 2,
      );
    }
  }

  reset(): void {
    this.nodes = [];
    this.restLength = 1 / COLS;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const nx = (x + 0.5) / COLS;
        const ny = 0.15 + (y / ROWS) * 0.5;
        this.nodes.push({
          x: nx,
          y: ny,
          px: nx,
          py: ny,
          pinned: y === 0 && x % 3 === 0,
        });
      }
    }
    this.initialized = true;
  }

  destroy(): void {
    this.nodes = [];
    this.initialized = false;
  }

  getParticleCount(): number {
    return this.nodes.length;
  }

  getMemoryBytes(): number {
    return estimateBytes();
  }

  private applySpring(a: number, b: number, k: number, dt: number): void {
    const n1 = this.nodes[a];
    const n2 = this.nodes[b];
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
    const diff = (dist - this.restLength) / dist;
    const ox = dx * diff * k * dt;
    const oy = dy * diff * k * dt;
    if (!n1.pinned) {
      n1.x += ox * 0.5;
      n1.y += oy * 0.5;
    }
    if (!n2.pinned) {
      n2.x -= ox * 0.5;
      n2.y -= oy * 0.5;
    }
  }
}
