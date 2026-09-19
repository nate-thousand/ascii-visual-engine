import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class RadialSymmetryPattern implements Pattern, Parameterized {
  readonly id = 'radialSymmetry' as const;
  readonly name = 'Radial Symmetry';

  readonly params = new ParamStore<'fold' | 'petal' | 'bloom' | 'ring' | 'ringFrequency'>([
    { name: 'fold', label: 'Fold', min: 0, max: 1, default: 0.35, step: 0.05 },
    { name: 'petal', label: 'Petal', min: 0, max: 1, default: 0.35, step: 0.05 },
    { name: 'bloom', label: 'Bloom', min: 0, max: 1, default: 0.2, step: 0.05 },
    { name: 'ring', label: 'Ring', min: 0, max: 1, default: 0.1, step: 0.05 },
    { name: 'ringFrequency', label: 'Ring frequency', min: 2, max: 30, default: 12, step: 1 },
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
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const angle = Math.atan2(dy, dx);

    const symmetry = Math.max(2, Math.round(context.getControl('symmetry', 6)));
    const petals = Math.max(3, Math.round(context.getControl('petals', 5)));
    const t = context.time * context.speed;

    const fold = Math.abs(Math.cos(symmetry * angle * 0.5 + t * 0.2));
    const petal = Math.pow(
      Math.abs(Math.sin(petals * angle - t * 0.35)),
      0.55,
    );
    const bloom = Math.max(0, 1 - r * 0.85);
    const ring = Math.sin(r * this.params.get('ringFrequency') - t * 1.5) * 0.5 + 0.5;

    return clamp01(
      fold * this.params.get('fold') +
        petal * this.params.get('petal') +
        bloom * this.params.get('bloom') +
        ring * this.params.get('ring'),
    );
  }

  destroy(): void {}
}
