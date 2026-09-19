import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class SpiralPattern implements Pattern, Parameterized {
  readonly id = 'spiral' as const;
  readonly name = 'Spiral';

  readonly params = new ParamStore<'arms' | 'twist' | 'orbit'>([
    { name: 'arms', label: 'Arms', min: 1, max: 8, default: 3, step: 1 },
    { name: 'twist', label: 'Twist', min: 2, max: 24, default: 8, step: 0.5 },
    { name: 'orbit', label: 'Orbit rings', min: 2, max: 32, default: 16, step: 1 },
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
    const amount = context.getControl('spiralAmount', 0.5);
    if (amount <= 0) return 0.5;

    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const t = context.time * context.speed;

    const arms = Math.round(this.params.get('arms'));
    const spiral = Math.sin(angle * arms - r * (this.params.get('twist') + amount * 12) - t * 2);
    const orbit = Math.sin(r * this.params.get('orbit') - t * 1.2) * 0.5 + 0.5;
    const value = (spiral + 1) * 0.5 * 0.7 + orbit * 0.3;

    return clamp01(value * amount + 0.5 * (1 - amount));
  }

  destroy(): void {}
}
