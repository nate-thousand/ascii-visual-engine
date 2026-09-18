/** Backing store scale is capped here: 3x and 4x screens cost four to sixteen times the fill for no visible gain in a glyph grid. */
export const MAX_PIXEL_RATIO = 2;

export type PixelRatioOption = number | 'auto';

/**
 * Resolve the backing store scale. `auto` reads `devicePixelRatio` (1 outside
 * a browser). Numbers are clamped to [0.5, MAX_PIXEL_RATIO].
 */
export function resolvePixelRatio(requested: PixelRatioOption = 'auto'): number {
  const raw =
    requested === 'auto'
      ? typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : 1
      : requested;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(0.5, Math.min(MAX_PIXEL_RATIO, raw));
}
