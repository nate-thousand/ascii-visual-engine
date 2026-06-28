import type { Motion, MotionContext } from '../Motion';
import type { AsciiEngine } from '../../core/AsciiEngine';
import { clamp01 } from '../motionMath';

export class WaveMotion implements Motion {
  readonly id = 'wave';
  readonly name = 'Wave';
  enabled = true;
  weight = 1;
  priority = 5;

  initialize(_engine: AsciiEngine): void {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid, time, getControl } = ctx;
    const speed = getControl('speed', 1);
    const amp = getControl('amplitude', 1) * 8;
    const freq = getControl('frequency', 1);
    const strength = getControl('strength', 0.7);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const waveX = Math.sin(cell.x * 0.3 * freq + time * speed);
      const waveY = Math.sin(cell.y * 0.25 * freq - time * speed * 0.7);
      const wave = (waveX + waveY) * 0.5;

      scratch.dy[i] = wave * amp * strength;
      scratch.dx[i] = Math.cos(cell.y * 0.2 + time * speed * 0.5) * amp * 0.3 * strength;
      scratch.brightness[i] = clamp01(0.3 + (wave + 1) * 0.35);
      scratch.phase[i] = (wave + 1) * 0.5;
      scratch.vy[i] = wave * speed;
    }
  }

  destroy(): void {}
}
