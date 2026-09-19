import type { Effect, EffectContext } from '../core/types';
import type { AsciiEngine } from '../core/AsciiEngine';
import { Random } from '../core/Random';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

const GLITCH_CHARS = '@#$%&!?<>{}[]|\\/~';

export class Glitch implements Effect, Parameterized {
  readonly type = 'glitch' as const;
  private random = new Random('glitch');

  initialize(engine: AsciiEngine): void {
    this.random = engine.getRandom('glitch');
  }

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
      if (this.random.next() < chance) {
        if (this.random.next() < symbolShare) {
          cell.char =
            GLITCH_CHARS[this.random.int(GLITCH_CHARS.length)];
        } else {
          cell.char = glyphSet[this.random.int(glyphSet.length)];
        }
        cell.brightness = this.random.next();
      }
    }
  }
}
