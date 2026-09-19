import type { Effect, EffectContext } from '../core/types';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class NoiseField implements Effect, Parameterized {
  readonly type = 'noise' as const;

  readonly params = new ParamStore<'scaleX' | 'scaleY' | 'floor'>([
    { name: 'scaleX', label: 'Scale X', min: 0.05, max: 3, default: 0.7, step: 0.05 },
    { name: 'scaleY', label: 'Scale Y', min: 0.05, max: 3, default: 0.5, step: 0.05 },
    { name: 'floor', label: 'Floor', min: 0, max: 1, default: 0.4, step: 0.05 },
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

  update(ctx: EffectContext): void {
    const { grid, glyphSet, speed, time } = ctx;

    const scaleX = this.params.get('scaleX');
    const scaleY = this.params.get('scaleY');
    const floor = this.params.get('floor');
    for (const cell of grid.cells) {
      const noise =
        Math.sin(cell.x * scaleX + time * speed * 0.8) *
        Math.cos(cell.y * scaleY + time * speed * 0.6);
      const index = Math.floor(
        ((noise + 1) * 0.5 * (glyphSet.length - 1) + cell.phase) %
          glyphSet.length,
      );
      cell.char = glyphSet[Math.abs(index) % glyphSet.length];
      cell.brightness = floor + ((noise + 1) * 0.5) * (1 - floor);
    }
  }
}
