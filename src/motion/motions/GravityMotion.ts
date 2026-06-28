import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class GravityMotion implements Motion {
  readonly id = 'gravity';
  readonly name = 'Gravity';
  enabled = true;
  weight = 1;
  priority = 15;

  private velocities: Float32Array | null = null;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: MotionContext): void {
    const { scratch, grid, getControl } = ctx;
    const gravity = getControl('gravity', 0.5) * 120;
    const drag = getControl('drag', 0.05);
    const strength = getControl('strength', 0.7);
    const size = grid.cells.length;

    if (!this.velocities || this.velocities.length !== size) {
      this.velocities = new Float32Array(size);
    }
    const vy = this.velocities;

    for (let i = 0; i < size; i++) {
      vy[i] = (vy[i] + gravity * dt) * (1 - drag);
      scratch.dy[i] = vy[i] * strength;
      scratch.vy[i] = vy[i];
      scratch.brightness[i] = clamp01(0.2 + Math.min(vy[i] / 80, 1) * 0.8);
      scratch.phase[i] = vy[i] * 0.01;
      scratch.deformation[i] = vy[i] * 0.002;
    }
  }

  destroy(): void {
    this.velocities = null;
  }
}
