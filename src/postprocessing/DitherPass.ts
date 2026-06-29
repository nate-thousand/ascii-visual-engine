import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class DitherPass implements PostPass {
  readonly id = 'dither';
  readonly name = 'Dither';
  enabled = false;
  amount = 0.5;

  private bayer = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ];

  apply(ctx: PostPassContext): void {
    const amount = ctx.getControl('postDither', this.amount);
    const { cells } = ctx.grid;
    for (const cell of cells) {
      const bx = cell.x % 4;
      const by = cell.y % 4;
      const threshold = (this.bayer[by * 4 + bx] / 16 - 0.5) * amount;
      cell.brightness = clamp01(cell.brightness + threshold);
      cell.char = brightnessToChar(cell.brightness, ctx.glyphSet);
    }
  }

  reset(): void {}
}
