import type { PostPass, PostPassContext } from './PostPass';
import { applyBrightnessToGrid } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

export class EdgePass implements PostPass {
  readonly id = 'edge';
  readonly name = 'Edge Detect';
  enabled = false;
  amount = 0.6;

  apply(ctx: PostPassContext): void {
    const { grid } = ctx;
    const amount = ctx.getControl('postEdge', this.amount);
    const { cols, rows, cells } = grid;
    const temp = new Float32Array(cells.length);
    for (let i = 0; i < cells.length; i++) temp[i] = cells[i].brightness;

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const idx = y * cols + x;
        const gx = temp[idx + 1] - temp[idx - 1];
        const gy = temp[idx + cols] - temp[idx - cols];
        const edge = clamp01(Math.sqrt(gx * gx + gy * gy) * 2);
        cells[idx].brightness = clamp01(cells[idx].brightness * (1 - amount) + edge * amount);
      }
    }
    applyBrightnessToGrid(grid, ctx.glyphSet);
  }

  reset(): void {}
}
