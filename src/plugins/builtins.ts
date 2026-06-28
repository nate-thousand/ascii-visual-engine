import { NoiseField } from '../effects/NoiseField';
import { WaveField } from '../effects/WaveField';
import { GlyphBurst } from '../effects/GlyphBurst';
import { Glitch } from '../effects/Glitch';
import { Trails } from '../effects/Trails';
import {
  RadialSymmetryPattern,
  SpiralPattern,
  WavePattern,
  GridPattern,
  CellularPattern,
  ScanlinePattern,
} from '../patterns';
import { EffectPlugin } from './EffectPlugin';
import { PatternPlugin } from './PatternPlugin';
import type { Plugin } from './Plugin';

export function createBuiltInPlugins(): Plugin[] {
  return [
    new EffectPlugin(new NoiseField(), {
      id: 'noise',
      name: 'Noise Field',
      version: '1.0.0',
      phase: 'motion',
    }),
    new EffectPlugin(new WaveField(), {
      id: 'wave',
      name: 'Wave Field',
      version: '1.0.0',
      phase: 'motion',
    }),
    new EffectPlugin(new GlyphBurst(), {
      id: 'burst',
      name: 'Glyph Burst',
      version: '1.0.0',
      phase: 'post',
    }),
    new EffectPlugin(new Glitch(), {
      id: 'glitch',
      name: 'Glitch',
      version: '1.0.0',
      phase: 'post',
    }),
    new EffectPlugin(new Trails(), {
      id: 'trails',
      name: 'Trails',
      version: '1.0.0',
      phase: 'post',
    }),
    new PatternPlugin(new RadialSymmetryPattern(), { version: '1.0.0' }),
    new PatternPlugin(new SpiralPattern(), { version: '1.0.0' }),
    new PatternPlugin(new WavePattern(), { id: 'wavePattern', version: '1.0.0' }),
    new PatternPlugin(new GridPattern(), { version: '1.0.0' }),
    new PatternPlugin(new CellularPattern(), { version: '1.0.0' }),
    new PatternPlugin(new ScanlinePattern(), { version: '1.0.0' }),
  ];
}

export const pluginCatalog = {
  noise: { id: 'noise', name: 'Noise Field', type: 'effect' as const },
  wave: { id: 'wave', name: 'Wave Field', type: 'effect' as const },
  burst: { id: 'burst', name: 'Glyph Burst', type: 'effect' as const },
  glitch: { id: 'glitch', name: 'Glitch', type: 'effect' as const },
  trails: { id: 'trails', name: 'Trails', type: 'effect' as const },
  radialSymmetry: { id: 'radialSymmetry', name: 'Radial Symmetry', type: 'pattern' as const },
  spiral: { id: 'spiral', name: 'Spiral', type: 'pattern' as const },
  wavePattern: { id: 'wavePattern', name: 'Wave Pattern', type: 'pattern' as const },
  grid: { id: 'grid', name: 'Grid', type: 'pattern' as const },
  cellular: { id: 'cellular', name: 'Cellular', type: 'pattern' as const },
  scanline: { id: 'scanline', name: 'Scanline', type: 'pattern' as const },
};

export function listPluginIds(): string[] {
  return [
    'noise',
    'wave',
    'burst',
    'glitch',
    'trails',
    'radialSymmetry',
    'spiral',
    'wavePattern',
    'grid',
    'cellular',
    'scanline',
  ];
}

const LEGACY_PATTERN_IDS: Record<string, string> = {
  wave: 'wavePattern',
};

export function resolvePresetPlugins(preset: {
  plugins?: { id: string; type: string; enabled?: boolean }[];
  motionField?: string;
  effects?: { type: string; enabled?: boolean }[];
  patterns?: string[];
}): string[] {
  if (preset.plugins?.length) {
    return preset.plugins
      .filter((p) => p.enabled !== false)
      .map((p) => p.id);
  }

  const ids = new Set<string>();

  if (preset.motionField === 'noise') ids.add('noise');
  if (preset.motionField === 'wave') ids.add('wave');

  for (const effect of preset.effects ?? []) {
    if (effect.enabled !== false) ids.add(effect.type);
  }

  for (const pattern of preset.patterns ?? []) {
    ids.add(LEGACY_PATTERN_IDS[pattern] ?? pattern);
  }

  return Array.from(ids);
}
