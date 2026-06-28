import type { Effect, EffectContext } from '../core/types';

export class NoiseField implements Effect {
  readonly type = 'noise' as const;

  update(ctx: EffectContext): void {
    const { grid, glyphSet, speed, time } = ctx;

    for (const cell of grid.cells) {
      const noise =
        Math.sin(cell.x * 0.7 + time * speed * 0.8) *
        Math.cos(cell.y * 0.5 + time * speed * 0.6);
      const index = Math.floor(
        ((noise + 1) * 0.5 * (glyphSet.length - 1) + cell.phase) %
          glyphSet.length,
      );
      cell.char = glyphSet[Math.abs(index) % glyphSet.length];
      cell.brightness = 0.4 + ((noise + 1) * 0.5) * 0.6;
    }
  }
}
