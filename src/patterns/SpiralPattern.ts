import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';

export class SpiralPattern implements Pattern {
  readonly id = 'spiral' as const;
  readonly name = 'Spiral';

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const amount = context.getControl('spiralAmount', 0.5);
    if (amount <= 0) return 0.5;

    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const t = context.time * context.speed;

    const arms = 3;
    const spiral = Math.sin(angle * arms - r * (8 + amount * 12) - t * 2);
    const orbit = Math.sin(r * 16 - t * 1.2) * 0.5 + 0.5;
    const value = (spiral + 1) * 0.5 * 0.7 + orbit * 0.3;

    return clamp01(value * amount + 0.5 * (1 - amount));
  }

  destroy(): void {}
}
