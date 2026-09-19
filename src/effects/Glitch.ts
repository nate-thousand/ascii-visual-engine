import type { Effect, EffectContext } from '../core/types';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

const GLITCH_CHARS = '@#$%&!?<>{}[]|\\/~';

export class Glitch implements Effect, Parameterized {
  readonly type = 'glitch' as const;

  readonly params = new ParamStore<'rate' | 'symbolShare'>([
    { name: 'rate', label: 'Rate', min: 0, max: 1, default: 0.28, step: 0.01 },
    { name: 'symbolShare', label: 'Symbol share', min: 0, max: 1, default: 0.5, step: 0.05 },
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
    const { grid, glyphSet, glitchAmount } = ctx;
    if (glitchAmount <= 0) return;

    const chance = glitchAmount * this.params.get('rate');
    const symbolShare = this.params.get('symbolShare');

    for (const cell of grid.cells) {
      if (Math.random() < chance) {
        if (Math.random() < symbolShare) {
          cell.char =
            GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        } else {
          cell.char = glyphSet[Math.floor(Math.random() * glyphSet.length)];
        }
        cell.brightness = Math.random();
      }
    }
  }
}
