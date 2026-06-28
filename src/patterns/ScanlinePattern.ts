import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';

export class ScanlinePattern implements Pattern {
  readonly id = 'scanline' as const;
  readonly name = 'Scanline';

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const amount = context.getControl('scanlineAmount', 0.5);
    if (amount <= 0) return 0.5;

    const t = context.time * context.speed;
    const spacing = 0.035 + (1 - amount) * 0.02;
    const scroll = (t * 0.12) % spacing;
    const linePos = (y + scroll) % spacing;
    const onScanline = linePos < spacing * 0.35 ? 1 : 0;

    const band = Math.sin(y * Math.PI * 60 + t * 2) > 0.85 ? 0.15 : 0.05;
    const staticNoise = Math.sin(x * 120 + y * 90 + t * 30) > 0.92 ? 1 : 0;
    const roll = Math.sin(t * 0.5) * 0.02;

    const terminal = onScanline * 0.85 + band + staticNoise * 0.4;
    return clamp01(terminal * amount + 0.08 * (1 - amount) + roll);
  }

  destroy(): void {}
}
