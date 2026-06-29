import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class InvertPass implements PostPass {
  readonly id = 'invert';
  readonly name = 'Invert';
  enabled = false;
  amount = 1;

  apply(ctx: PostPassContext): void {
    const amount = ctx.getControl('postInvert', this.amount);
    for (const cell of ctx.grid.cells) {
      cell.brightness = clamp01(cell.brightness * (1 - amount) + (1 - cell.brightness) * amount);
      cell.char = brightnessToChar(cell.brightness, ctx.glyphSet);
    }
  }

  reset(): void {}
}
