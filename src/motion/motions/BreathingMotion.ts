import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class BreathingMotion implements Motion {
  readonly id = 'breathing';
  readonly name = 'Breathing';
  enabled = true;
  weight = 1;
  priority = 18;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const speed = getControl('speed', 1);
    const amp = getControl('amplitude', 1);
    const strength = getControl('strength', 0.7);
    const breath = Math.sin(time * speed * 1.2) * 0.5 + 0.5;
    const inhale = Math.sin(time * speed * 0.6);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1) - 0.5;
      const ny = cell.y / Math.max(grid.rows - 1, 1) - 0.5;
      const r = Math.sqrt(nx * nx + ny * ny);
      const local = breath * (1 - r * 0.5);

      scratch.dx[i] = nx * inhale * amp * 8 * strength;
      scratch.dy[i] = ny * inhale * amp * 8 * strength;
      scratch.scale[i] = 1 + local * amp * 0.35 * strength;
      scratch.brightness[i] = clamp01(0.35 + local * 0.55);
      scratch.phase[i] = local;
      scratch.density[i] = 1 + local * 0.2;
    }
  }

  destroy(): void {}
}
