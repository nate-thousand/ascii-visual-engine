import type { AsciiPreset } from '../../core/types';
import { withLiveControls } from '../controlCatalog';

function performancePreset(
  id: string,
  name: string,
  devicePreset: 'akaiMpkMini' | 'novationLaunchkey' | 'genericKeyboard' | 'qwertyKeyboard',
  extra: Partial<AsciiPreset> = {},
): AsciiPreset {
  return withLiveControls({
    id,
    name,
    glyphSet: [' ', '.', ':', '-', '=', '+', '*', '#', '@'],
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'glitch', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    // breathing reads strength, so the device presets' strength knob is live
    motion: { behaviors: [{ id: 'flowField', weight: 0.4 }, { id: 'breathing', weight: 0.3 }], strength: 0.7 },
    input: { enabled: true, devicePreset },
    density: 1,
    speed: 1,
    trailAmount: 0.4,
    glitchAmount: 0.15,
    ...extra,
  });
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
  {
    simulation: { behaviors: [{ id: 'particle', enabled: true }], simSpawnRate: 0.4 },
    // Akai knobs 7 and 8 drive feedback and smear
    post: {
      passes: [
        { id: 'feedback', enabled: true, amount: 0.3 },
        { id: 'smear', enabled: true, amount: 0.2 },
      ],
      postFeedback: 0.3,
      postSmear: 0.2,
    },
  },
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
