import type { PostPass, PostPassContext } from './PostPass';
import { applyBrightnessToGrid } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class SmearPass implements PostPass {
  readonly id = 'smear';
  readonly name = 'Smear';
  enabled = false;
  amount = 0.5;

  apply(ctx: PostPassContext): void {
    const { grid } = ctx;
    const amount = ctx.getControl('postSmear', this.amount);
    const { cols, rows, cells } = grid;
    const temp = new Float32Array(cells.length);
    for (let i = 0; i < cells.length; i++) temp[i] = cells[i].brightness;

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const idx = y * cols + x;
        const avg =
          (temp[idx - 1] + temp[idx + 1] + temp[idx - cols] + temp[idx + cols]) * 0.25;
        cells[idx].brightness = clamp01(cells[idx].brightness * (1 - amount) + avg * amount);
      }
    }
    applyBrightnessToGrid(grid, ctx.glyphSet);
  }

  reset(): void {}
}
