import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class ScanlinePass implements PostPass {
  readonly id = 'scanline';
  readonly name = 'Scanline';
  enabled = false;
  amount = 0.5;

  apply(ctx: PostPassContext): void {
    const amount = ctx.getControl('postScanline', this.amount);
    const { cols, rows, cells } = ctx.grid;
    for (let y = 0; y < rows; y++) {
      const mod = y % 2 === 0 ? 1 : 1 - amount;
      for (let x = 0; x < cols; x++) {
        const cell = cells[y * cols + x];
        cell.brightness = clamp01(cell.brightness * mod);
        cell.char = brightnessToChar(cell.brightness, ctx.glyphSet);
      }
    }
  }

  reset(): void {}
}
