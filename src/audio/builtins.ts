import type { AsciiPreset } from '../core/types';
import type { AudioMappingPresetConfig } from '../audio/AudioTypes';
import { DEFAULT_AUDIO_SMOOTHING } from '../audio/AudioTypes';

export function resolvePresetAudioMapping(
  preset: { audioMapping?: AudioMappingPresetConfig },
): AudioMappingPresetConfig | null {
  if (!preset.audioMapping) return null;
  return preset.audioMapping;
}

export function buildAudioMappingFromPreset(
  preset: { audioMapping?: AudioMappingPresetConfig },
) {
  const config = preset.audioMapping;
  if (!config) return null;
  return {
    enabled: config.enabled !== false,
    mappings: [...config.mappings],
    smoothing: { ...DEFAULT_AUDIO_SMOOTHING, ...config.smoothing },
  };
}

export const AUDIO_PRESET_IDS = [
  'audioAmbient',
  'audioBass',
  'audioGlitch',
  'audioVoice',
  'audioFullSpectrum',
] as const;

export type AudioPresetId = (typeof AUDIO_PRESET_IDS)[number];

export function isAudioPreset(preset: AsciiPreset): boolean {
  return AUDIO_PRESET_IDS.includes(preset.id as AudioPresetId);
}
