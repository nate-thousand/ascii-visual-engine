import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import { estimateBytes, stampCell } from '../simulationUtils';

interface Turtle {
  x: number;
  y: number;
  angle: number;
}

const STACK_MAX = 64;

export class LSystemSimulation implements Simulation {
  readonly id = 'lsystem';
  readonly name = 'L-System';
  enabled = false;

  private axiom = 'F';
  private rules: Record<string, string> = { F: 'F[+F]F[-F]F' };
  private expanded = 'F';
  private growth = 0;
  private maxIterations = 4;
  private branchAngle = 25;
  private segmentLength = 0.04;
  private drawIndex = 0;
  private drawSpeed = 120;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);

    this.growth += dt * speed;
    const iter = Math.min(this.maxIterations, Math.floor(this.growth * 0.3));
    if (iter !== this.lastIter) {
      this.expand(iter);
      this.lastIter = iter;
      this.drawIndex = 0;
    }

    const charsPerFrame = Math.floor(this.drawSpeed * dt * speed);
    this.drawIndex = Math.min(this.expanded.length, this.drawIndex + charsPerFrame);

    const turtle: Turtle = { x: 0.5, y: 0.95, angle: -90 };
    const stack: Turtle[] = new Array(STACK_MAX);
    let stackPtr = 0;
    const rad = (this.branchAngle * Math.PI) / 180;
    const len = this.segmentLength * strength;

    for (let i = 0; i < this.drawIndex; i++) {
      const ch = this.expanded[i];
      switch (ch) {
        case 'F': {
          const nx = turtle.x + Math.cos(turtle.angle) * len;
          const ny = turtle.y + Math.sin(turtle.angle) * len;
          stampCell(
            grid.cells,
            grid.cols,
            grid.rows,
            turtle.x * (grid.cols - 1),
            turtle.y * (grid.rows - 1),
            strength,
            glyphSet,
            Math.min(glyphSet.length - 1, 3 + (i % 3)),
          );
          stampCell(
            grid.cells,
            grid.cols,
            grid.rows,
            nx * (grid.cols - 1),
            ny * (grid.rows - 1),
            strength * 0.9,
            glyphSet,
            Math.min(glyphSet.length - 1, 2 + (i % 2)),
          );
          turtle.x = nx;
          turtle.y = ny;
          break;
        }
        case '+':
          turtle.angle += rad;
          break;
        case '-':
          turtle.angle -= rad;
          break;
        case '[':
          stack[stackPtr++] = { x: turtle.x, y: turtle.y, angle: turtle.angle };
          break;
        case ']': {
          const saved = stack[--stackPtr];
          if (saved) {
            turtle.x = saved.x;
            turtle.y = saved.y;
            turtle.angle = saved.angle;
          }
          break;
        }
      }
    }
  }

  private lastIter = -1;

  reset(): void {
    this.growth = 0;
    this.lastIter = -1;
    this.drawIndex = 0;
    this.expanded = this.axiom;
  }

  destroy(): void {}

  getParticleCount(): number {
    return this.drawIndex;
  }

  getMemoryBytes(): number {
    return estimateBytes() + this.expanded.length * 2;
  }

  private expand(iterations: number): void {
    let current = this.axiom;
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (let j = 0; j < current.length; j++) {
        const c = current[j];
        next += this.rules[c] ?? c;
      }
      current = next.length > 8000 ? current : next;
    }
    this.expanded = current;
  }
}
