import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { curlNoise, noise2 } from '../motionMath';

export class FlowFieldMotion implements Motion {
  readonly id = 'flowField';
  readonly name = 'Flow Field';
  enabled = true;
  weight = 1;
  priority = 10;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const strength = getControl('flowStrength', 0.8);
    const speed = getControl('speed', 1);
    const scale = getControl('noiseScale', 1);
    const amp = getControl('amplitude', 1) * 12;

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const curl = curlNoise(nx, ny, time * speed, scale * 3);
      scratch.dx[i] = curl.x * amp * strength;
      scratch.dy[i] = curl.y * amp * strength;
      scratch.vx[i] = curl.x * strength;
      scratch.vy[i] = curl.y * strength;
      scratch.phase[i] = noise2(nx * 4 + time * 0.2, ny * 4);
      scratch.brightness[i] = 0.35 + noise2(nx * 2, ny * 2 + time * 0.1) * 0.5;
    }
  }

  destroy(): void {}
}
