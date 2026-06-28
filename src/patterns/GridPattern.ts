import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';

export class GridPattern implements Pattern {
  readonly id = 'grid' as const;
  readonly name = 'Grid';

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const density = context.getControl('density', 1);
    const cols = Math.max(4, Math.round(10 * density));
    const rows = Math.max(4, Math.round(8 * density));
    const t = context.time * context.speed * 0.1;

    const gx = Math.floor(x * cols);
    const gy = Math.floor(y * rows);
    const checker = (gx + gy) % 2 === 0 ? 0.75 : 0.25;

    const lx = Math.abs((x * cols) % 1 - 0.5);
    const ly = Math.abs((y * rows) % 1 - 0.5);
    const line = lx < 0.08 || ly < 0.08 ? 0.95 : checker;

    const pulse = Math.sin(t + gx * 0.3 + gy * 0.2) * 0.1;
    return clamp01(line + pulse);
  }

  destroy(): void {}
}
