import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

export class GridPattern implements Pattern, Parameterized {
  readonly id = 'grid' as const;
  readonly name = 'Grid';

  readonly params = new ParamStore<'cols' | 'rows' | 'lineWidth'>([
    { name: 'cols', label: 'Columns', min: 2, max: 40, default: 10, step: 1 },
    { name: 'rows', label: 'Rows', min: 2, max: 30, default: 8, step: 1 },
    { name: 'lineWidth', label: 'Line width', min: 0.01, max: 0.3, default: 0.08, step: 0.01 },
  ]);

  describeParams(): ParamDef[] {
    return this.params.describeParams();
  }

  getParams(): Record<string, number> {
    return this.params.getParams();
  }

  setParams(params: Record<string, number>): void {
    this.params.setParams(params);
  }

  resetParams(): void {
    this.params.resetParams();
  }

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const density = context.getControl('density', 1);
    const cols = Math.max(4, Math.round(this.params.get('cols') * density));
    const rows = Math.max(4, Math.round(this.params.get('rows') * density));
    const t = context.time * context.speed * 0.1;

    const gx = Math.floor(x * cols);
    const gy = Math.floor(y * rows);
    const checker = (gx + gy) % 2 === 0 ? 0.75 : 0.25;

    const lx = Math.abs((x * cols) % 1 - 0.5);
    const ly = Math.abs((y * rows) % 1 - 0.5);
    const lw = this.params.get('lineWidth');
    const line = lx < lw || ly < lw ? 0.95 : checker;

    const pulse = Math.sin(t + gx * 0.3 + gy * 0.2) * 0.1;
    return clamp01(line + pulse);
  }

  destroy(): void {}
}
