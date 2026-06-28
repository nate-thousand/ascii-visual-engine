import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class BrownianMotion implements Motion {
  readonly id = 'brownian';
  readonly name = 'Brownian Motion';
  enabled = true;
  weight = 1;
  priority = 40;

  private offsets: Float32Array | null = null;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: MotionContext): void {
    const { scratch, grid, getControl } = ctx;
    const randomness = getControl('randomness', 0.3);
    const strength = getControl('strength', 0.7);
    const decay = getControl('decay', 0.1);
    const size = grid.cells.length;

    if (!this.offsets || this.offsets.length !== size * 2) {
      this.offsets = new Float32Array(size * 2);
    }
    const off = this.offsets;
    const jitter = randomness * strength * 40 * dt;

    for (let i = 0; i < size; i++) {
      const ix = i * 2;
      off[ix] = off[ix] * (1 - decay) + (Math.random() - 0.5) * jitter;
      off[ix + 1] = off[ix + 1] * (1 - decay) + (Math.random() - 0.5) * jitter;
      scratch.dx[i] = off[ix];
      scratch.dy[i] = off[ix + 1];
      scratch.vx[i] = off[ix] * 0.1;
      scratch.vy[i] = off[ix + 1] * 0.1;
      scratch.brightness[i] = clamp01(0.35 + Math.abs(off[ix]) * 0.02);
      scratch.phase[i] = Math.abs(off[ix] + off[ix + 1]) * 0.05;
    }
  }

  destroy(): void {
    this.offsets = null;
  }
}
