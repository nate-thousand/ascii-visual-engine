import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01, curlNoise, noise2 } from '../motionMath';

export class CurlNoiseMotion implements Motion {
  readonly id = 'curlNoise';
  readonly name = 'Curl Noise';
  enabled = true;
  weight = 1;
  priority = 35;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const scale = getControl('noiseScale', 1) * 4;
    const strength = getControl('strength', 0.7);
    const speed = getControl('speed', 1);
    const amp = getControl('amplitude', 1) * 14;

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const curl = curlNoise(nx, ny, time * speed * 0.5, scale);
      const n = noise2(nx * scale, ny * scale + time * speed * 0.1);

      scratch.dx[i] = curl.x * amp * strength;
      scratch.dy[i] = curl.y * amp * strength;
      scratch.vx[i] = curl.x * strength * 2;
      scratch.vy[i] = curl.y * strength * 2;
      scratch.brightness[i] = clamp01(0.25 + n * 0.65);
      scratch.phase[i] = n;
      scratch.deformation[i] = Math.abs(curl.x - curl.y) * strength * 0.1;
    }
  }

  destroy(): void {}
}
