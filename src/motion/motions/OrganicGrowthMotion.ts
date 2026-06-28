import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class OrganicGrowthMotion implements Motion {
  readonly id = 'organicGrowth';
  readonly name = 'Organic Growth';
  enabled = true;
  weight = 1;
  priority = 20;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const strength = getControl('strength', 0.7);
    const speed = getControl('speed', 1);
    const freq = getControl('frequency', 1);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const growth = Math.sin(r * 8 * freq - time * speed * 1.5) * 0.5 + 0.5;
      const tendril = Math.sin(angle * 5 + time * speed * 0.8) * 0.3;
      const expand = (growth + tendril) * strength;

      scratch.dx[i] = dx * expand * 20;
      scratch.dy[i] = dy * expand * 20;
      scratch.scale[i] = 1 + expand * 0.4;
      scratch.brightness[i] = clamp01(0.3 + growth * 0.7);
      scratch.phase[i] = r + time * speed * 0.1;
      scratch.deformation[i] = tendril * strength;
    }
  }

  destroy(): void {}
}
