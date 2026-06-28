import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class PulseMotion implements Motion {
  readonly id = 'pulse';
  readonly name = 'Pulse';
  enabled = true;
  weight = 1;
  priority = 8;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const speed = getControl('speed', 1);
    const freq = getControl('frequency', 1);
    const amp = getControl('amplitude', 1);
    const strength = getControl('strength', 0.7);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      const pulse = Math.sin(r * 20 * freq - time * speed * 3) * 0.5 + 0.5;
      const ring = Math.sin(r * 30 - time * speed * 4) > 0.7 ? 1 : 0;

      scratch.dx[i] = dx * pulse * amp * 12 * strength;
      scratch.dy[i] = dy * pulse * amp * 12 * strength;
      scratch.scale[i] = 1 + pulse * amp * 0.3 * strength;
      scratch.brightness[i] = clamp01(0.25 + pulse * 0.6 + ring * 0.3);
      scratch.phase[i] = pulse;
      scratch.deformation[i] = ring * strength;
    }
  }

  destroy(): void {}
}
