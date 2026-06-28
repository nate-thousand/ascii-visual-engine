import { basicPreset } from './basic';
import { terminalPreset } from './terminal';
import { organicPreset } from './organic';
import {
  ambientPreset,
  motionOrganicPreset,
  mechanicalPreset,
  motionTerminalPreset,
  chaoticPreset,
  minimalPreset,
} from './motion';
import type { AsciiPreset } from '../core/types';

export { basicPreset } from './basic';
export { terminalPreset } from './terminal';
export { organicPreset } from './organic';
export {
  ambientPreset,
  motionOrganicPreset,
  mechanicalPreset,
  motionTerminalPreset,
  chaoticPreset,
  minimalPreset,
} from './motion';

export const presets = {
  basic: basicPreset,
  terminal: terminalPreset,
  organic: organicPreset,
  ambient: ambientPreset,
  motionOrganic: motionOrganicPreset,
  mechanical: mechanicalPreset,
  motionTerminal: motionTerminalPreset,
  chaotic: chaoticPreset,
  minimal: minimalPreset,
} as const;

export type PresetId = keyof typeof presets;

export function getPreset(id: PresetId): AsciiPreset {
  return presets[id];
}

export function listPresets(): AsciiPreset[] {
  return Object.values(presets);
}

export function listMotionPresets(): AsciiPreset[] {
  return [
    ambientPreset,
    motionOrganicPreset,
    mechanicalPreset,
    motionTerminalPreset,
    chaoticPreset,
    minimalPreset,
  ];
}
