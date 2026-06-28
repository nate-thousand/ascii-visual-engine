import type { Effect, EffectContext } from '../core/types';

export class Trails implements Effect {
  readonly type = 'trails' as const;

  update(ctx: EffectContext): void {
    const { grid, trailAmount } = ctx;
    if (trailAmount <= 0) return;

    for (const cell of grid.cells) {
      cell.burst *= 1 - trailAmount * 0.15;
      if (cell.burst < 0.01) cell.burst = 0;
    }
  }

  applyFade(ctx: CanvasRenderingContext2D, trailAmount: number): void {
    if (trailAmount <= 0) return;
    const alpha = Math.min(0.98, 0.12 + trailAmount * 0.86);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
