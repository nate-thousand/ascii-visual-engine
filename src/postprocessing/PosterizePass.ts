import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';

export class PosterizePass implements PostPass {
  readonly id = 'posterize';
  readonly name = 'Posterize';
  enabled = false;
  amount = 4;

  apply(ctx: PostPassContext): void {
    const levels = Math.max(2, Math.floor(ctx.getControl('postPosterize', this.amount)));
    const step = 1 / (levels - 1);
    for (const cell of ctx.grid.cells) {
      cell.brightness = Math.round(cell.brightness / step) * step;
      cell.char = brightnessToChar(cell.brightness, ctx.glyphSet);
    }
  }

  reset(): void {}
}
