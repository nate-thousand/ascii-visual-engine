import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class SpiralMotion implements Motion {
  readonly id = 'spiral';
  readonly name = 'Spiral';
  enabled = true;
  weight = 1;
  priority = 22;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const speed = getControl('speed', 1);
    const amp = getControl('amplitude', 1) * 10;
    const strength = getControl('strength', 0.7);
    const freq = getControl('frequency', 1);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1) - 0.5;
      const ny = cell.y / Math.max(grid.rows - 1, 1) - 0.5;
      const r = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx) + r * 6 * freq + time * speed * 1.5;

      scratch.dx[i] = Math.cos(angle) * r * amp * strength;
      scratch.dy[i] = Math.sin(angle) * r * amp * strength;
      scratch.rotation[i] = angle;
      scratch.brightness[i] = clamp01(0.3 + r * 0.7);
      scratch.phase[i] = (angle / (Math.PI * 2) + r) % 1;
    }
  }

  destroy(): void {}
}
