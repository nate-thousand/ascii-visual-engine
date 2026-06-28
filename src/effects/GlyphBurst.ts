import type { Effect, EffectContext, NoteEvent } from '../core/types';

interface ActiveBurst {
  x: number;
  y: number;
  intensity: number;
  age: number;
  maxAge: number;
}

export class GlyphBurst implements Effect {
  readonly type = 'burst' as const;
  private bursts: ActiveBurst[] = [];

  onNoteOn(event: NoteEvent): void {
    const intensity = event.intensity ?? 1;
    this.bursts.push({
      x: event.x ?? Math.random(),
      y: event.y ?? Math.random(),
      intensity,
      age: 0,
      maxAge: 0.9 + intensity * 0.7,
    });
  }

  update(ctx: EffectContext): void {
    const { grid, dt } = ctx;

    for (const burst of this.bursts) {
      burst.age += dt;
    }
    this.bursts = this.bursts.filter((b) => b.age < b.maxAge);

    if (this.bursts.length === 0) return;

    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);

      for (const burst of this.bursts) {
        const dx = nx - burst.x;
        const dy = ny - burst.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const progress = burst.age / burst.maxAge;
        const radius = (0.1 + burst.intensity * 0.5) * (1 + progress * 2.5);
        const falloff = Math.max(0, 1 - dist / radius) * (1 - progress);

        if (falloff > 0) {
          cell.burst = Math.max(cell.burst, falloff * burst.intensity * 1.4);
          cell.brightness = Math.min(1, cell.brightness + falloff * 1.2);
        }
      }
    }
  }

  reset(): void {
    this.bursts = [];
  }
}
