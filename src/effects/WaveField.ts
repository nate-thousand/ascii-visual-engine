import type { Effect, EffectContext } from '../core/types';

export class WaveField implements Effect {
  readonly type = 'wave' as const;

  update(ctx: EffectContext): void {
    const { grid, glyphSet, speed, time } = ctx;

    for (const cell of grid.cells) {
      const wave =
        Math.sin(cell.x * 0.3 + time * speed) +
        Math.sin(cell.y * 0.25 - time * speed * 0.7);
      const normalized = (wave + 2) / 4;
      const index = Math.floor(normalized * (glyphSet.length - 1));
      cell.char = glyphSet[index];
      cell.brightness = 0.3 + normalized * 0.7;
    }
  }
}
