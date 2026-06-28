import { basicPreset } from './basic';
import { terminalPreset } from './terminal';
import { organicPreset } from './organic';
import type { AsciiPreset } from '../core/types';

export { basicPreset } from './basic';
export { terminalPreset } from './terminal';
export { organicPreset } from './organic';

export const presets = {
  basic: basicPreset,
  terminal: terminalPreset,
  organic: organicPreset,
} as const;

export type PresetId = keyof typeof presets;

export function getPreset(id: PresetId): AsciiPreset {
  return presets[id];
}

export function listPresets(): AsciiPreset[] {
  return Object.values(presets);
}
