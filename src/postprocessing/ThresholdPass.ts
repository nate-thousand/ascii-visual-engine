import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';

export class ThresholdPass implements PostPass {
  readonly id = 'threshold';
  readonly name = 'Threshold';
  enabled = false;
  amount = 0.5;

  apply(ctx: PostPassContext): void {
    const threshold = ctx.getControl('postThreshold', this.amount);
    for (const cell of ctx.grid.cells) {
      cell.brightness = cell.brightness >= threshold ? 1 : 0;
      cell.char = brightnessToChar(cell.brightness, ctx.glyphSet);
    }
  }

  reset(): void {}
}
