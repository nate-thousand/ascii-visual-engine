import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01, noise2 } from '../motionMath';

export class WindMotion implements Motion {
  readonly id = 'wind';
  readonly name = 'Wind';
  enabled = true;
  weight = 1;
  priority = 12;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const strength = getControl('strength', 0.7);
    const speed = getControl('speed', 1);
    const flow = getControl('flowStrength', 0.8);
    const randomness = getControl('randomness', 0.3);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const gust = Math.sin(time * speed * 0.8 + ny * 4) * 0.5 + 0.5;
      const turbulence = (noise2(cell.x * 0.1, time * speed * 0.5) - 0.5) * randomness;
      const windX = (flow + gust * 0.5 + turbulence) * strength * 15;

      scratch.dx[i] = windX;
      scratch.dy[i] = Math.sin(time * speed + cell.x * 0.2) * strength * 2;
      scratch.vx[i] = windX * 0.1;
      scratch.brightness[i] = clamp01(0.3 + gust * 0.5);
      scratch.phase[i] = gust;
    }
  }

  destroy(): void {}
}
