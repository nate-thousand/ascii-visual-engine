import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';

export class WavePattern implements Pattern {
  readonly id = 'wave' as const;
  readonly name = 'Wave';

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const t = context.time * context.speed;
    const waveX = Math.sin(x * Math.PI * 4 + t * 1.2);
    const waveY = Math.sin(y * Math.PI * 3 - t * 0.9);
    const waveDiag = Math.sin((x + y) * Math.PI * 5 + t * 0.6);

    return clamp01((waveX + waveY + waveDiag + 3) / 6);
  }

  destroy(): void {}
}
