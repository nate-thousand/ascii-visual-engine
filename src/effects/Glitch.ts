import type { Effect, EffectContext } from '../core/types';

const GLITCH_CHARS = '@#$%&!?<>{}[]|\\/~';

export class Glitch implements Effect {
  readonly type = 'glitch' as const;

  update(ctx: EffectContext): void {
    const { grid, glyphSet, glitchAmount } = ctx;
    if (glitchAmount <= 0) return;

    const chance = glitchAmount * 0.28;

    for (const cell of grid.cells) {
      if (Math.random() < chance) {
        if (Math.random() < 0.5) {
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
