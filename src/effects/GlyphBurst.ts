import type { Effect, EffectContext, NoteEvent } from '../core/types';
import { ParamStore, type ParamDef, type Parameterized } from '../plugins/ParamStore';

interface ActiveBurst {
  x: number;
  y: number;
  intensity: number;
  age: number;
  maxAge: number;
}

export class GlyphBurst implements Effect, Parameterized {
  readonly type = 'burst' as const;

  readonly params = new ParamStore<'radius' | 'spread' | 'life' | 'gain'>([
    { name: 'radius', label: 'Radius', min: 0.05, max: 2, default: 0.5, step: 0.05 },
    { name: 'spread', label: 'Spread', min: 0, max: 6, default: 2.5, step: 0.1 },
    { name: 'life', label: 'Life', min: 0.2, max: 4, default: 0.9, step: 0.1 },
    { name: 'gain', label: 'Gain', min: 0.2, max: 3, default: 1.4, step: 0.1 },
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
  private bursts: ActiveBurst[] = [];

  onNoteOn(event: NoteEvent): void {
    const intensity = event.intensity ?? 1;
    this.bursts.push({
      x: event.x ?? Math.random(),
      y: event.y ?? Math.random(),
      intensity,
      age: 0,
      maxAge: this.params.get('life') + intensity * 0.7,
    });
  }

  update(ctx: EffectContext): void {
    const { grid, dt } = ctx;

    for (const burst of this.bursts) {
      burst.age += dt;
    }
    this.bursts = this.bursts.filter((b) => b.age < b.maxAge);

    if (this.bursts.length === 0) return;

    const radiusScale = this.params.get('radius');
    const spread = this.params.get('spread');
    const gain = this.params.get('gain');
    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);

      for (const burst of this.bursts) {
        const dx = nx - burst.x;
        const dy = ny - burst.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const progress = burst.age / burst.maxAge;
        const radius = (0.1 + burst.intensity * radiusScale) * (1 + progress * spread);
        const falloff = Math.max(0, 1 - dist / radius) * (1 - progress);

        if (falloff > 0) {
          cell.burst = Math.max(cell.burst, falloff * burst.intensity * gain);
          cell.brightness = Math.min(1, cell.brightness + falloff * 1.2);
        }
      }
    }
  }

  reset(): void {
    this.bursts = [];
  }
}
