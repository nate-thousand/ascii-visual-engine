import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { estimateBytes, stampCell } from '../simulationUtils';

const BOID_COUNT = 64;

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class BoidsSimulation implements Simulation {
  readonly id = 'boids';
  readonly name = 'Boids Flocking';
  enabled = false;

  private boids: Boid[] = [];
  private predator = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  private initialized = false;
  private neighborBuffer: number[] = [];

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1) * 0.8 * (ctx.simQualityScale ?? 1);
    const strength = getControl('simStrength', 0.8);

    if (!this.initialized || this.boids.length !== BOID_COUNT) {
      this.resetBoids();
    }

    this.updatePredator(dt, speed);
    const alignR = 0.12;
    const cohereR = 0.15;
    const sepR = 0.06;
    const maxSpeed = 0.35 * speed;
    const spatial = ctx.spatialGrid;

    if (spatial) {
      spatial.clear();
      for (let i = 0; i < this.boids.length; i++) {
        spatial.insert(i, this.boids[i].x, this.boids[i].y);
      }
    }

    for (let i = 0; i < this.boids.length; i++) {
      const b = this.boids[i];
      let ax = 0;
      let ay = 0;
      let alignX = 0;
      let alignY = 0;
      let cohX = 0;
      let cohY = 0;
      let sepX = 0;
      let sepY = 0;
      let alignN = 0;
      let cohN = 0;
      let sepN = 0;

      const processNeighbor = (j: number): void => {
        if (i === j) return;
        const o = this.boids[j];
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < alignR) {
          alignX += o.vx;
          alignY += o.vy;
          alignN++;
        }
        if (d < cohereR) {
          cohX += o.x;
          cohY += o.y;
          cohN++;
        }
        if (d < sepR && d > 0.0001) {
          sepX -= dx / d;
          sepY -= dy / d;
          sepN++;
        }
      };

      if (spatial) {
        const neighbors = spatial.queryRadius(b.x, b.y, cohereR, this.neighborBuffer);
        for (let n = 0; n < neighbors.length; n++) {
          processNeighbor(neighbors[n]);
        }
      } else {
        for (let j = 0; j < this.boids.length; j++) {
          processNeighbor(j);
        }
      }

      if (alignN > 0) {
        ax += (alignX / alignN - b.vx) * 0.8;
        ay += (alignY / alignN - b.vy) * 0.8;
      }
      if (cohN > 0) {
        ax += (cohX / cohN - b.x) * 0.4;
        ay += (cohY / cohN - b.y) * 0.4;
      }
      if (sepN > 0) {
        ax += (sepX / sepN) * 1.2;
        ay += (sepY / sepN) * 1.2;
      }

      const pdx = b.x - this.predator.x;
      const pdy = b.y - this.predator.y;
      const pd = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pd < 0.2 && pd > 0.0001) {
        ax += (pdx / pd) * 2.5;
        ay += (pdy / pd) * 2.5;
      }

      b.vx += ax * dt;
      b.vy += ay * dt;
      const vm = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (vm > maxSpeed) {
        b.vx = (b.vx / vm) * maxSpeed;
        b.vy = (b.vy / vm) * maxSpeed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0) { b.x = 0; b.vx *= -1; }
      if (b.x > 1) { b.x = 1; b.vx *= -1; }
      if (b.y < 0) { b.y = 0; b.vy *= -1; }
      if (b.y > 1) { b.y = 1; b.vy *= -1; }

      if (spatial) spatial.update(i, b.x, b.y);

      stampCell(
        grid.cells,
        grid.cols,
        grid.rows,
        b.x * (grid.cols - 1),
        b.y * (grid.rows - 1),
        strength,
        glyphSet,
        2,
      );
    }

    stampCell(
      grid.cells,
      grid.cols,
      grid.rows,
      this.predator.x * (grid.cols - 1),
      this.predator.y * (grid.rows - 1),
      1,
      glyphSet,
      glyphSet.length - 1,
    );
  }

  reset(): void {
    this.resetBoids();
  }

  destroy(): void {
    this.boids = [];
    this.initialized = false;
  }

  getParticleCount(): number {
    return this.boids.length;
  }

  getMemoryBytes(): number {
    return estimateBytes();
  }

  private resetBoids(): void {
    this.boids = [];
    for (let i = 0; i < BOID_COUNT; i++) {
      this.boids.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      });
    }
    this.initialized = true;
  }

  private updatePredator(dt: number, speed: number): void {
    this.predator.vx += (Math.random() - 0.5) * dt * 0.5;
    this.predator.vy += (Math.random() - 0.5) * dt * 0.5;
    this.predator.x += this.predator.vx * dt * speed;
    this.predator.y += this.predator.vy * dt * speed;
    if (this.predator.x < 0.1 || this.predator.x > 0.9) this.predator.vx *= -1;
    if (this.predator.y < 0.1 || this.predator.y > 0.9) this.predator.vy *= -1;
    this.predator.x = Math.max(0.05, Math.min(0.95, this.predator.x));
    this.predator.y = Math.max(0.05, Math.min(0.95, this.predator.y));
  }
}
