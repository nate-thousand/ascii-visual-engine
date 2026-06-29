import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { estimateBytes, stampCell, stampDisc } from '../simulationUtils';

const BODY_COUNT = 48;

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

interface Well {
  x: number;
  y: number;
  mass: number;
  repulsor: boolean;
}

export class GravitySimulation implements Simulation {
  readonly id = 'gravity';
  readonly name = 'Gravity Wells';
  enabled = false;

  private bodies: Body[] = [];
  private wells: Well[] = [];
  private initialized = false;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);

    if (!this.initialized) this.reset();

    for (const body of this.bodies) {
      let ax = 0;
      let ay = 0;
      for (const well of this.wells) {
        const dx = well.x - body.x;
        const dy = well.y - body.y;
        const distSq = dx * dx + dy * dy + 0.002;
        const force = (well.mass / distSq) * (well.repulsor ? -1 : 1);
        ax += (dx / Math.sqrt(distSq)) * force;
        ay += (dy / Math.sqrt(distSq)) * force;
      }
      body.vx += ax * dt * speed;
      body.vy += ay * dt * speed;
      body.x += body.vx * dt * speed;
      body.y += body.vy * dt * speed;

      if (body.x < 0 || body.x > 1) body.vx *= -0.9;
      if (body.y < 0 || body.y > 1) body.vy *= -0.9;
      body.x = Math.max(0, Math.min(1, body.x));
      body.y = Math.max(0, Math.min(1, body.y));

      stampCell(
        grid.cells,
        grid.cols,
        grid.rows,
        body.x * (grid.cols - 1),
        body.y * (grid.rows - 1),
        strength * 0.8,
        glyphSet,
        1,
      );
    }

    for (const well of this.wells) {
      stampDisc(grid, well.x, well.y, well.repulsor ? 0.04 : 0.06, strength, glyphSet, well.repulsor ? 0 : glyphSet.length - 1);
    }
  }

  reset(): void {
    this.bodies = [];
    this.wells = [
      { x: 0.5, y: 0.5, mass: 0.8, repulsor: false },
      { x: 0.25, y: 0.35, mass: 0.3, repulsor: true },
      { x: 0.75, y: 0.65, mass: 0.4, repulsor: false },
    ];
    for (let i = 0; i < BODY_COUNT; i++) {
      const angle = (i / BODY_COUNT) * Math.PI * 2;
      const r = 0.15 + (i % 5) * 0.02;
      this.bodies.push({
        x: 0.5 + Math.cos(angle) * r,
        y: 0.5 + Math.sin(angle) * r,
        vx: -Math.sin(angle) * 0.25,
        vy: Math.cos(angle) * 0.25,
        mass: 1,
      });
    }
    this.initialized = true;
  }

  destroy(): void {
    this.bodies = [];
    this.wells = [];
    this.initialized = false;
  }

  getParticleCount(): number {
    return this.bodies.length;
  }

  getMemoryBytes(): number {
    return estimateBytes();
  }
}
