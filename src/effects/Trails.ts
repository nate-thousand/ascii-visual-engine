import type { Effect, EffectContext } from '../core/types';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class Trails implements Effect, Parameterized {
  readonly type = 'trails' as const;

  readonly params = new ParamStore<'decay' | 'fade'>([
    { name: 'decay', label: 'Burst decay', min: 0.01, max: 1, default: 0.15, step: 0.01 },
    { name: 'fade', label: 'Fade', min: 0, max: 1, default: 0.86, step: 0.02 },
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
    const { grid, trailAmount } = ctx;
    if (trailAmount <= 0) return;

    for (const cell of grid.cells) {
      cell.burst *= 1 - trailAmount * this.params.get('decay');
      if (cell.burst < 0.01) cell.burst = 0;
    }
  }

  applyFade(ctx: CanvasRenderingContext2D, trailAmount: number): void {
    if (trailAmount <= 0) return;
    const alpha = Math.min(0.98, 0.12 + trailAmount * this.params.get('fade'));
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    // The context may be scaled for HiDPI; fade the whole backing store.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}
