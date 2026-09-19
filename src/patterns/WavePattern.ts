import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class WavePattern implements Pattern, Parameterized {
  readonly id = 'wave' as const;
  readonly name = 'Wave';

  readonly params = new ParamStore<'frequencyX' | 'frequencyY' | 'frequencyDiagonal'>([
    { name: 'frequencyX', label: 'Frequency X', min: 0.5, max: 12, default: 4, step: 0.5 },
    { name: 'frequencyY', label: 'Frequency Y', min: 0.5, max: 12, default: 3, step: 0.5 },
    { name: 'frequencyDiagonal', label: 'Frequency diagonal', min: 0.5, max: 12, default: 5, step: 0.5 },
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
    const t = context.time * context.speed;
    const waveX = Math.sin(x * Math.PI * this.params.get('frequencyX') + t * 1.2);
    const waveY = Math.sin(y * Math.PI * this.params.get('frequencyY') - t * 0.9);
    const waveDiag = Math.sin((x + y) * Math.PI * this.params.get('frequencyDiagonal') + t * 0.6);

    return clamp01((waveX + waveY + waveDiag + 3) / 6);
  }

  destroy(): void {}
}
