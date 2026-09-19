import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01, smoothNoise } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class CellularPattern implements Pattern, Parameterized {
  readonly id = 'cellular' as const;
  readonly name = 'Cellular';

  readonly params = new ParamStore<'scale' | 'threshold'>([
    { name: 'scale', label: 'Scale', min: 2, max: 16, default: 6, step: 0.5 },
    { name: 'threshold', label: 'Threshold', min: 0.2, max: 0.7, default: 0.42, step: 0.01 },
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

  private crawlPhase = 0;

  initialize(_engine: AsciiEngine): void {}

  update(deltaTime: number, context: PatternSampleContext): void {
    const amount = context.getControl('cellularAmount', 0.5);
    this.crawlPhase += deltaTime * context.speed * (0.2 + amount * 0.6);
  }

  sample(x: number, y: number, context: PatternSampleContext): number {
    const amount = context.getControl('cellularAmount', 0.5);
    if (amount <= 0) return 0.5;

    const t = this.crawlPhase;
    const scale = this.params.get('scale') * (1 + amount);

    const n1 = smoothNoise(x * scale + t * 0.4, y * scale - t * 0.3);
    const n2 = smoothNoise(x * scale * 2.1 - t * 0.2, y * scale * 2.1 + t * 0.15);
    const n3 = smoothNoise(x * scale * 0.5, y * scale * 0.5 + t * 0.5);

    const organic = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
    const threshold = this.params.get('threshold') + Math.sin(t * 0.3) * 0.08;
    const colony = organic > threshold ? organic : organic * 0.25;
    const edge = Math.abs(organic - threshold) < 0.06 ? 0.9 : colony;
    const decay = edge * (0.6 + n3 * 0.4);

    return clamp01(decay * amount + 0.12 * (1 - amount));
  }

  destroy(): void {
    this.crawlPhase = 0;
  }
}
