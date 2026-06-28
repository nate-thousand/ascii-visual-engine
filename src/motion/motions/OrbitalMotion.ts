import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class OrbitalMotion implements Motion {
  readonly id = 'orbital';
  readonly name = 'Orbital';
  enabled = true;
  weight = 1;
  priority = 30;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const speed = getControl('speed', 1);
    const amp = getControl('amplitude', 1) * 10;
    const strength = getControl('strength', 0.7);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const cx = 0.5 + Math.sin(time * speed * 0.3) * 0.2;
      const cy = 0.5 + Math.cos(time * speed * 0.25) * 0.2;
      const dx = nx - cx;
      const dy = ny - cy;
      const r = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const angle = Math.atan2(dy, dx) + time * speed * (0.5 + r);
      const orbitR = r * amp * strength;

      scratch.dx[i] = Math.cos(angle) * orbitR;
      scratch.dy[i] = Math.sin(angle) * orbitR;
      scratch.vx[i] = -Math.sin(angle) * speed;
      scratch.vy[i] = Math.cos(angle) * speed;
      scratch.rotation[i] = angle;
      scratch.brightness[i] = clamp01(0.4 + (1 - r) * 0.6);
      scratch.phase[i] = angle / (Math.PI * 2);
    }
  }

  destroy(): void {}
}
