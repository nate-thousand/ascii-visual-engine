import type { GridCell } from '../core/types';

export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'difference'
  | 'max'
  | 'min'
  | 'overlay';

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function blendBrightness(mode: BlendMode, base: number, layer: number, opacity: number): number {
  const a = clamp01(base);
  const b = clamp01(layer) * opacity;
  switch (mode) {
    case 'add':
      return clamp01(a + b);
    case 'multiply':
      return clamp01(a * (1 - opacity + b * opacity));
    case 'screen':
      return clamp01(1 - (1 - a) * (1 - b));
    case 'difference':
      return clamp01(Math.abs(a - b));
    case 'max':
      return clamp01(Math.max(a, b));
    case 'min':
      return clamp01(Math.min(a, 1 - opacity + b));
    case 'overlay':
      return clamp01(a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b));
    case 'normal':
    default:
      return clamp01(a * (1 - opacity) + b);
  }
}

export function blendChar(
  mode: BlendMode,
  baseChar: string,
  layerChar: string,
  baseBrightness: number,
  layerBrightness: number,
  opacity: number,
): string {
  if (opacity <= 0) return baseChar;
  if (mode === 'normal' || layerBrightness * opacity >= baseBrightness) {
    return layerBrightness * opacity > baseBrightness * 0.5 ? layerChar : baseChar;
  }
  if (mode === 'add' || mode === 'max') {
    return layerBrightness * opacity >= baseBrightness ? layerChar : baseChar;
  }
  return layerChar;
}

export function compositeCell(
  mode: BlendMode,
  dst: GridCell,
  src: GridCell,
  opacity: number,
  mask: number,
  glyphSet: string[],
): void {
  const effectiveOpacity = opacity * clamp01(mask);
  if (effectiveOpacity <= 0) return;

  const blended = blendBrightness(mode, dst.brightness, src.brightness, effectiveOpacity);
  dst.brightness = blended;
  dst.phase = blendBrightness(mode, dst.phase, src.phase, effectiveOpacity);

  const srcIndex = Math.floor(clamp01(src.brightness) * (glyphSet.length - 1));
  const srcChar = glyphSet[Math.max(0, Math.min(glyphSet.length - 1, srcIndex))];
  dst.char = blendChar(mode, dst.char, srcChar, dst.brightness, src.brightness, effectiveOpacity);
}

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'add',
  'multiply',
  'screen',
  'difference',
  'max',
  'min',
  'overlay',
];
