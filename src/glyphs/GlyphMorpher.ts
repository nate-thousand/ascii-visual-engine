import type { GlyphCellState, GlyphMorphChain, GlyphMorphConfig } from './Glyph';
import { clamp01 } from './Glyph';

export class GlyphMorpher {
  private progress = 0;
  private chainIndex = 0;

  reset(): void {
    this.progress = 0;
    this.chainIndex = 0;
  }

  update(dt: number, config: GlyphMorphConfig | undefined): void {
    if (!config?.enabled) return;
    const speed = config.speed ?? 1;
    const chain = config.chains?.[this.chainIndex];
    const duration = chain?.duration ?? 2;
    this.progress += (dt / duration) * speed;

    if (this.progress >= 1) {
      this.progress = 0;
      const chains = config.chains ?? [];
      if (chains.length === 0) return;
      this.chainIndex = (this.chainIndex + 1) % chains.length;
      if (!chain?.loop && this.chainIndex === 0) {
        this.progress = 1;
      }
    }
  }

  applyToStates(states: GlyphCellState[], config: GlyphMorphConfig | undefined, time: number): void {
    if (!config?.enabled) return;
    const chain = config.chains?.[this.chainIndex] ?? config.chains?.[0];
    if (!chain || chain.steps.length === 0) return;

    const steps = chain.steps;
    const smooth = config.smooth !== false;
    const t = smooth ? easeInOut(this.progress) : this.progress;
    const fromIdx = Math.floor(t * (steps.length - 1));
    const toIdx = Math.min(steps.length - 1, fromIdx + 1);
    const localT = smooth
      ? (t * (steps.length - 1)) - fromIdx
      : t > 0.5
        ? 1
        : 0;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const phaseOffset = (i * 0.013 + time * 0.1) % 1;
      const staggeredT = clamp01(localT + phaseOffset * 0.15);

      if (smooth && fromIdx !== toIdx && staggeredT < 1) {
        state.character = staggeredT < 0.5 ? steps[fromIdx] : steps[toIdx];
      } else {
        state.character = steps[fromIdx];
      }
      state.morphProgress = staggeredT;
      state.morphIndex = fromIdx;
    }
  }

  getMorphState(config: GlyphMorphConfig | undefined): string {
    if (!config?.enabled) return 'off';
    const chain = config.chains?.[this.chainIndex];
    return chain
      ? `${chain.id}[${this.chainIndex}] ${(this.progress * 100).toFixed(0)}%`
      : 'active';
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function buildMorphChain(id: string, steps: string[], duration = 2): GlyphMorphChain {
  return { id, steps, duration, loop: true };
}
