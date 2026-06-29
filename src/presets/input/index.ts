import type { AsciiPreset } from '../../core/types';

function performancePreset(
  id: string,
  name: string,
  devicePreset: 'akaiMpkMini' | 'novationLaunchkey' | 'genericKeyboard' | 'qwertyKeyboard',
  extra: Partial<AsciiPreset> = {},
): AsciiPreset {
  return {
    id,
    name,
    glyphSet: [' ', '.', ':', '-', '=', '+', '*', '#', '@'],
    motionField: 'wave',
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'glitch', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    patterns: ['radialSymmetry'],
    motions: [{ id: 'flowField', weight: 0.4 }],
    inputMapping: { enabled: true, devicePreset },
    controls: [
      { name: 'density', label: 'Density', min: 0.3, max: 2, default: 1, step: 0.1 },
      { name: 'speed', label: 'Speed', min: 0.1, max: 3, default: 1, step: 0.1 },
      { name: 'trailAmount', label: 'Trails', min: 0, max: 1, default: 0.4, step: 0.05 },
      { name: 'glitchAmount', label: 'Glitch', min: 0, max: 1, default: 0.15, step: 0.05 },
      { name: 'strength', label: 'Strength', min: 0, max: 1, default: 0.7, step: 0.05 },
    ],
    density: 1,
    speed: 1,
    trailAmount: 0.4,
    glitchAmount: 0.15,
    strength: 0.7,
    ...extra,
  };
}

export const performanceGenericPreset = performancePreset(
  'performanceGeneric',
  'Performance — Generic MIDI',
  'genericKeyboard',
);

export const performanceAkaiPreset = performancePreset(
  'performanceAkai',
  'Performance — Akai MPK Mini',
  'akaiMpkMini',
  { simulations: [{ id: 'particle', enabled: true }], simSpawnRate: 0.4 },
);

export const performanceLaunchkeyPreset = performancePreset(
  'performanceLaunchkey',
  'Performance — Novation Launchkey',
  'novationLaunchkey',
);

export const performanceQwertyPreset = performancePreset(
  'performanceQwerty',
  'Performance — QWERTY Keyboard',
  'qwertyKeyboard',
  {
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'spiral', type: 'pattern' },
    ],
  },
);
