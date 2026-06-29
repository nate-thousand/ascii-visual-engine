import type { AsciiPreset } from '../core/types';
import type { InputMappingPresetConfig } from './InputTypes';

export function resolvePresetInputMapping(
  preset: { inputMapping?: InputMappingPresetConfig },
): InputMappingPresetConfig | null {
  if (!preset.inputMapping) return null;
  return preset.inputMapping;
}

export {
  getDevicePresetMapping,
  DEVICE_PRESET_IDS,
} from './devicePresets';

export function isPerformancePreset(preset: AsciiPreset): boolean {
  return preset.id.startsWith('performance') || preset.id.startsWith('input');
}
