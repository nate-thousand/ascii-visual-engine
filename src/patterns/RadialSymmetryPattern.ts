import type { AsciiEngine } from '../core/AsciiEngine';
import type { Pattern, PatternSampleContext } from './Pattern';
import { clamp01 } from './Pattern';

export class RadialSymmetryPattern implements Pattern {
  readonly id = 'radialSymmetry' as const;
  readonly name = 'Radial Symmetry';

  initialize(_engine: AsciiEngine): void {}

  update(_deltaTime: number, _context: PatternSampleContext): void {}

  sample(x: number, y: number, context: PatternSampleContext): number {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const angle = Math.atan2(dy, dx);

    const symmetry = Math.max(2, Math.round(context.getControl('symmetry', 6)));
    const petals = Math.max(3, Math.round(context.getControl('petals', 5)));
    const t = context.time * context.speed;

    const fold = Math.abs(Math.cos(symmetry * angle * 0.5 + t * 0.2));
    const petal = Math.pow(
      Math.abs(Math.sin(petals * angle - t * 0.35)),
      0.55,
    );
    const bloom = Math.max(0, 1 - r * 0.85);
    const ring = Math.sin(r * 12 - t * 1.5) * 0.5 + 0.5;

    return clamp01(fold * 0.35 + petal * 0.35 + bloom * 0.2 + ring * 0.1);
  }

  destroy(): void {}
}
