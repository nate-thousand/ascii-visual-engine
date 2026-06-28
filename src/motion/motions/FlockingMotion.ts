import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class FlockingMotion implements Motion {
  readonly id = 'flocking';
  readonly name = 'Flocking';
  enabled = true;
  weight = 1;
  priority = 25;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const strength = getControl('strength', 0.7);
    const speed = getControl('speed', 1);
    const { cols, rows } = grid;

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      let avgVx = 0;
      let avgVy = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const ni = ny * cols + nx;
          const angle = Math.atan2(dy, dx) + Math.sin(time * speed + ni * 0.1) * 0.5;
          avgVx += Math.cos(angle);
          avgVy += Math.sin(angle);
          count++;
        }
      }

      if (count > 0) {
        avgVx /= count;
        avgVy /= count;
      }

      const amp = 8 * strength;
      scratch.dx[i] = avgVx * amp;
      scratch.dy[i] = avgVy * amp;
      scratch.vx[i] = avgVx * speed;
      scratch.vy[i] = avgVy * speed;
      scratch.brightness[i] = clamp01(0.4 + Math.sqrt(avgVx * avgVx + avgVy * avgVy) * 0.3);
      scratch.phase[i] = Math.atan2(avgVy, avgVx) / (Math.PI * 2);
    }
  }

  destroy(): void {}
}
