export type {
  AudioFeatureName,
  AudioFeatures,
  AudioInputType,
  AudioInputOptions,
  AudioControlTarget,
  AudioControlMapping,
  AudioLayerOpacityMapping,
  AudioNoteOnMapping,
  AudioPostPassMapping,
  AudioMappingTarget,
  AudioFeatureMapping,
  AudioSmoothingConfig,
  AudioMappingConfig,
  AudioMappingPresetConfig,
  AudioDebugState,
  AudioSmoothingControlName,
} from './AudioTypes';
export {
  DEFAULT_AUDIO_SMOOTHING,
  AUDIO_SMOOTHING_CONTROLS,
  DEFAULT_AUDIO_SMOOTHING_CONTROLS,
} from './AudioTypes';
export { AudioInput, type AudioInputState } from './AudioInput';
export { AudioAnalyzer } from './AudioAnalyzer';
export { AudioFeatureExtractor } from './AudioFeatureExtractor';
export { BeatDetector } from './BeatDetector';
export type { BeatState, BeatDetectorOptions } from './BeatDetector';
export { normalizeBpm } from './AudioReactiveMapper';
export { BPM_MAP_RANGE } from './AudioTypes';
export {
  AudioReactiveMapper,
  resolveAudioMappingPreset,
  createDefaultMappings,
  type AudioEngineBridge,
} from './AudioReactiveMapper';
