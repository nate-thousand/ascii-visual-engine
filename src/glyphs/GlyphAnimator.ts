import type { Glyph, GlyphAnimationConfig, GlyphAnimationKind, GlyphCellState } from './Glyph';
import { clamp01, glyphUnicode } from './Glyph';

export class GlyphAnimator {
  private time = 0;

  reset(): void {
    this.time = 0;
  }

  update(dt: number, config: GlyphAnimationConfig | undefined): void {
    if (!config?.enabled) return;
    this.time += dt * (config.speed ?? 1);
  }

  applyToStates(
    states: GlyphCellState[],
    glyphs: Glyph[],
    config: GlyphAnimationConfig | undefined,
    gridTime: number,
  ): void {
    if (!config?.enabled) return;
    const kinds = config.kinds ?? ['breathing'];
    const amount = config.amount ?? 0.5;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const glyph = glyphs.find((g) => g.id === state.glyphId);
      const kind = pickAnimationKind(kinds, i, gridTime);
      state.animKind = kind;
      state.animPhase = (state.animPhase + 0.01) % 1;

      switch (kind) {
        case 'breathing': {
          const pulse = 0.5 + 0.5 * Math.sin(this.time * 2 + i * 0.05);
          state.weight = clamp01((glyph?.weight ?? 0.5) * (0.7 + pulse * amount * 0.6));
          break;
        }
        case 'cycle': {
          const chars = glyph?.metadata?.cycle as string[] | undefined;
          if (chars?.length) {
            const idx = Math.floor((this.time + i * 0.02) * chars.length) % chars.length;
            state.character = chars[idx];
          }
          break;
        }
        case 'randomize': {
          if (Math.random() < 0.02 * amount) {
            const pool = glyph?.metadata?.pool as string[] | undefined;
            if (pool?.length) {
              state.character = pool[Math.floor(Math.random() * pool.length)];
            }
          }
          break;
        }
        case 'growth': {
          const t = clamp01(Math.sin(this.time * 0.5 + i * 0.01) * 0.5 + 0.5);
          state.density = clamp01((glyph?.density ?? 0.5) * (0.5 + t * amount));
          break;
        }
        case 'erosion':
        case 'decay': {
          const t = clamp01(1 - (this.time * 0.1 + i * 0.001) % 1);
          state.density = clamp01((glyph?.density ?? 0.5) * t);
          break;
        }
        case 'bloom': {
          if (Math.sin(this.time + i * 0.03) > 0.85) {
            state.character = glyph?.metadata?.bloomChar as string ?? state.character;
          }
          break;
        }
        case 'corruption': {
          if (Math.random() < 0.04 * amount) {
            state.character = String.fromCharCode(33 + Math.floor(Math.random() * 90));
            state.unicode = glyphUnicode(state.character);
          }
          break;
        }
        case 'rotation': {
          state.animPhase = (state.animPhase + amount * 0.02) % 1;
          break;
        }
        default:
          break;
      }
    }
  }

  getAnimationState(config: GlyphAnimationConfig | undefined): string {
    if (!config?.enabled) return 'off';
    return `${(config.kinds ?? ['breathing']).join('+')} t=${this.time.toFixed(1)}`;
  }
}

function pickAnimationKind(
  kinds: GlyphAnimationKind[],
  index: number,
  time: number,
): GlyphAnimationKind {
  if (kinds.length === 1) return kinds[0];
  return kinds[Math.floor((index * 0.17 + time * 0.3) % kinds.length)];
}
