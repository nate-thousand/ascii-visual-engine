import type { PostPass, PostPassContext } from './PostPass';
import { applyBrightnessToGrid } from './PostPass';

export class DisplacementPass implements PostPass {
  readonly id = 'displacement';
  readonly name = 'Displacement';
  enabled = false;
  amount = 0.3;

  apply(ctx: PostPassContext): void {
    const { grid, time } = ctx;
    const amount = ctx.getControl('postDisplacement', this.amount);
    const { cols, rows, cells } = grid;
    const temp = new Float32Array(cells.length);
    for (let i = 0; i < cells.length; i++) temp[i] = cells[i].brightness;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const nx = x / Math.max(cols - 1, 1);
        const ny = y / Math.max(rows - 1, 1);
        const ox = Math.floor(Math.sin(ny * 8 + time) * amount * 3);
        const oy = Math.floor(Math.cos(nx * 8 + time) * amount * 3);
        const sx = Math.max(0, Math.min(cols - 1, x + ox));
        const sy = Math.max(0, Math.min(rows - 1, y + oy));
        cells[idx].brightness = temp[sy * cols + sx];
      }
    }
    applyBrightnessToGrid(grid, ctx.glyphSet);
  }

  reset(): void {}
}
