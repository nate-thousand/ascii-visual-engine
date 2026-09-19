import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class ScanlinePattern implements Pattern, Parameterized {
  readonly id = 'scanline' as const;
  readonly name = 'Scanline';

  readonly params = new ParamStore<'spacing' | 'lineWidth' | 'staticAmount'>([
    { name: 'spacing', label: 'Spacing', min: 0.01, max: 0.1, default: 0.035, step: 0.005 },
    { name: 'lineWidth', label: 'Line width', min: 0.1, max: 0.9, default: 0.35, step: 0.05 },
    { name: 'staticAmount', label: 'Static', min: 0, max: 1, default: 0.4, step: 0.05 },
  ]);

  describeParams(): ParamDef[] {
    return this.params.describeParams();
  }

  getParams(): Record<string, number> {
    return this.params.getParams();
  }

  setParams(params: Record<string, number>): void {
    this.params.setParams(params);
  }

  resetParams(): void {
    this.params.resetParams();
  }

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const amount = context.getControl('scanlineAmount', 0.5);
    if (amount <= 0) return 0.5;

    const t = context.time * context.speed;
    const spacing = this.params.get('spacing') + (1 - amount) * 0.02;
    const scroll = (t * 0.12) % spacing;
    const linePos = (y + scroll) % spacing;
    const onScanline = linePos < spacing * this.params.get('lineWidth') ? 1 : 0;

    const band = Math.sin(y * Math.PI * 60 + t * 2) > 0.85 ? 0.15 : 0.05;
    const staticNoise = Math.sin(x * 120 + y * 90 + t * 30) > 0.92 ? 1 : 0;
    const roll = Math.sin(t * 0.5) * 0.02;

    const terminal = onScanline * 0.85 + band + staticNoise * this.params.get('staticAmount');
    return clamp01(terminal * amount + 0.08 * (1 - amount) + roll);
  }

  destroy(): void {}
}
