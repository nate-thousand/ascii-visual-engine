import type { PostPass, PostPassContext } from './PostPass';
import { applyBrightnessToGrid } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class FeedbackPass implements PostPass {
  readonly id = 'feedback';
  readonly name = 'Feedback';
  enabled = false;
  amount = 0.7;

  apply(ctx: PostPassContext): void {
    const { grid, previousBrightness } = ctx;
    if (!previousBrightness || previousBrightness.length !== grid.cells.length) return;
    const amount = ctx.getControl('postFeedback', this.amount);
    for (let i = 0; i < grid.cells.length; i++) {
      grid.cells[i].brightness = clamp01(
        grid.cells[i].brightness * (1 - amount) + previousBrightness[i] * amount,
      );
    }
    applyBrightnessToGrid(grid, ctx.glyphSet);
  }

  reset(): void {}
}
