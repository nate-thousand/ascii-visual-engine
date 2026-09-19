import type { Effect, EffectContext } from '../core/types';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class WaveField implements Effect, Parameterized {
  readonly type = 'wave' as const;

  readonly params = new ParamStore<'scaleX' | 'scaleY' | 'floor'>([
    { name: 'scaleX', label: 'Scale X', min: 0.05, max: 2, default: 0.3, step: 0.05 },
    { name: 'scaleY', label: 'Scale Y', min: 0.05, max: 2, default: 0.25, step: 0.05 },
    { name: 'floor', label: 'Floor', min: 0, max: 1, default: 0.3, step: 0.05 },
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
      const wave =
        Math.sin(cell.x * scaleX + time * speed) +
        Math.sin(cell.y * scaleY - time * speed * 0.7);
      const normalized = (wave + 2) / 4;
      const index = Math.floor(normalized * (glyphSet.length - 1));
      cell.char = glyphSet[index];
      cell.brightness = floor + normalized * (1 - floor);
    }
  }
}
