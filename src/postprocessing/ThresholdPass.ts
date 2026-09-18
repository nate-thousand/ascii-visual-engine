import type { PostPass, PostPassContext } from './PostPass';
import { brightnessToChar } from './PostPass';
import { clamp01 } from '../compositing/BlendModes';

const THRESHOLD_FLOOR = 0.25;
const THRESHOLD_CEIL = 0.75;

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export class ThresholdPass implements PostPass {
  readonly id = 'threshold';
  readonly name = 'Threshold';
  enabled = false;
  amount = 0.5;

  apply(ctx: PostPassContext): void {
    const threshold = ctx.getControl('postThreshold', this.amount);
    const softness = 0.04;
    const low = Math.max(THRESHOLD_FLOOR, threshold - softness);
    const high = Math.min(THRESHOLD_CEIL, threshold + softness);

    for (const cell of ctx.grid.cells) {
      const decoded = smoothstep(low, high, cell.brightness);
      cell.brightness = decoded;
      cell.char = brightnessToChar(decoded, ctx.glyphSet);
    }
  }

  reset(): void {}
}
