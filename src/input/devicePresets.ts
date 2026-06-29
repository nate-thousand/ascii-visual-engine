import type { DevicePresetId, InputMappingConfig } from './InputTypes';
import { MOD_WHEEL_CC } from './InputTypes';

export function getDevicePresetMapping(presetId: DevicePresetId): InputMappingConfig {
  switch (presetId) {
    case 'akaiMpkMini':
      return {
        enabled: true,
        defaultNoteOn: true,
        modWheel: { type: 'control', control: 'glitchAmount', min: 0, max: 1, amount: 1 },
        ccMappings: [
          { controller: 1, target: { type: 'control', control: 'glitchAmount', min: 0, max: 1 } },
          { controller: 2, target: { type: 'control', control: 'trailAmount', min: 0, max: 1 } },
          { controller: 3, target: { type: 'control', control: 'density', min: 0.5, max: 2 } },
          { controller: 4, target: { type: 'control', control: 'speed', min: 0.2, max: 3 } },
          { controller: 5, target: { type: 'control', control: 'strength', min: 0, max: 1 } },
          { controller: 6, target: { type: 'control', control: 'simSpawnRate', min: 0, max: 1 } },
          { controller: 7, target: { type: 'control', control: 'postFeedback', min: 0, max: 1 } },
          { controller: 8, target: { type: 'control', control: 'postSmear', min: 0, max: 1 } },
        ],
        noteMappings: [
          { minNote: 48, maxNote: 63, target: { type: 'noteOn', mapPitchToX: true, mapPitchToY: true } },
        ],
        pitchBend: { target: { type: 'control', control: 'flowStrength', min: 0, max: 1 } },
      };

    case 'novationLaunchkey':
      return {
        enabled: true,
        defaultNoteOn: true,
        modWheel: { type: 'control', control: 'glitchAmount', min: 0, max: 1, amount: 1 },
        ccMappings: [
          { controller: 7, target: { type: 'control', control: 'density', min: 0.5, max: 2 } },
          { controller: 10, target: { type: 'control', control: 'trailAmount', min: 0, max: 1 } },
          { controller: 91, target: { type: 'control', control: 'speed', min: 0.2, max: 3 } },
          { controller: 93, target: { type: 'control', control: 'strength', min: 0, max: 1 } },
        ],
        pitchBend: { target: { type: 'control', control: 'flowStrength', min: 0, max: 1 } },
      };

    case 'qwertyKeyboard':
      return {
        enabled: true,
        defaultNoteOn: true,
        defaultNoteOff: true,
      };

    case 'genericKeyboard':
    default:
      return {
        enabled: true,
        defaultNoteOn: true,
        defaultNoteOff: true,
        modWheel: { type: 'control', control: 'glitchAmount', min: 0, max: 1, amount: 1 },
        ccMappings: [
          { controller: MOD_WHEEL_CC, target: { type: 'control', control: 'glitchAmount', min: 0, max: 1 } },
          { controller: 7, target: { type: 'control', control: 'trailAmount', min: 0, max: 1 } },
          { controller: 74, target: { type: 'control', control: 'speed', min: 0.2, max: 3 } },
          { controller: 71, target: { type: 'control', control: 'density', min: 0.5, max: 2 } },
        ],
        pitchBend: { target: { type: 'control', control: 'flowStrength', min: 0, max: 1 } },
      };
  }
}

export const DEVICE_PRESET_IDS: DevicePresetId[] = [
  'akaiMpkMini',
  'novationLaunchkey',
  'genericKeyboard',
  'qwertyKeyboard',
];

export { DEVICE_PRESET_IDS as INPUT_DEVICE_PRESETS };
