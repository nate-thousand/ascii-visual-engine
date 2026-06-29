export type AudioFeatureName =
  | 'amplitude'
  | 'bass'
  | 'lowMid'
  | 'mid'
  | 'highMid'
  | 'treble'
  | 'spectralCentroid'
  | 'transient'
  | 'beat';

export interface AudioFeatures {
  amplitude: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  spectralCentroid: number;
  transient: number;
  beat: number;
}

export type AudioInputType = 'microphone' | 'audioElement' | 'mediaStream' | 'analyser';

export interface AudioInputOptions {
  type: AudioInputType;
  audioElement?: HTMLAudioElement;
  mediaStream?: MediaStream;
  analyser?: AnalyserNode;
  audioContext?: AudioContext;
  fftSize?: number;
  smoothingTimeConstant?: number;
  microphoneConstraints?: MediaTrackConstraints;
}

export type AudioControlTarget =
  | 'density'
  | 'speed'
  | 'glitchAmount'
  | 'trailAmount'
  | 'strength'
  | 'simSpawnRate'
  | 'postFeedback'
  | 'postSmear'
  | 'postDisplacement'
  | 'postThreshold'
  | 'postEdge'
  | 'postDither';

export interface AudioControlMapping {
  type: 'control';
  control: string;
  base?: number;
  amount?: number;
  min?: number;
  max?: number;
}

export interface AudioLayerOpacityMapping {
  type: 'layerOpacity';
  layerId: string;
  base?: number;
  amount?: number;
  min?: number;
  max?: number;
}

export interface AudioNoteOnMapping {
  type: 'noteOn';
  minIntensity?: number;
  maxIntensity?: number;
  cooldownMs?: number;
}

export interface AudioPostPassMapping {
  type: 'postPass';
  passId: string;
  base?: number;
  amount?: number;
  min?: number;
  max?: number;
}

export type AudioMappingTarget =
  | AudioControlMapping
  | AudioLayerOpacityMapping
  | AudioNoteOnMapping
  | AudioPostPassMapping;

export interface AudioFeatureMapping {
  feature: AudioFeatureName;
  target: AudioMappingTarget;
}

export interface AudioSmoothingConfig {
  attack: number;
  release: number;
  sensitivity: number;
  noiseGate: number;
  minThreshold: number;
  maxClamp: number;
}

export interface AudioMappingConfig {
  mappings: AudioFeatureMapping[];
  smoothing: AudioSmoothingConfig;
  enabled?: boolean;
}

export interface AudioMappingPresetConfig {
  mappings: AudioFeatureMapping[];
  smoothing?: Partial<AudioSmoothingConfig>;
  enabled?: boolean;
}

export interface AudioDebugState {
  connected: boolean;
  inputType: AudioInputType | null;
  ready: boolean;
  error: string | null;
  fftSize: number;
  features: AudioFeatures | null;
  mappingEnabled: boolean;
  updateTimeMs: number;
}

export const DEFAULT_AUDIO_SMOOTHING: AudioSmoothingConfig = {
  attack: 0.08,
  release: 0.25,
  sensitivity: 1,
  noiseGate: 0.02,
  minThreshold: 0,
  maxClamp: 1,
};

export const AUDIO_SMOOTHING_CONTROLS = [
  'audioAttack',
  'audioRelease',
  'audioSensitivity',
  'audioNoiseGate',
  'audioMinThreshold',
  'audioMaxClamp',
] as const;

export type AudioSmoothingControlName = (typeof AUDIO_SMOOTHING_CONTROLS)[number];

export const DEFAULT_AUDIO_SMOOTHING_CONTROLS: Record<AudioSmoothingControlName, number> = {
  audioAttack: DEFAULT_AUDIO_SMOOTHING.attack,
  audioRelease: DEFAULT_AUDIO_SMOOTHING.release,
  audioSensitivity: DEFAULT_AUDIO_SMOOTHING.sensitivity,
  audioNoiseGate: DEFAULT_AUDIO_SMOOTHING.noiseGate,
  audioMinThreshold: DEFAULT_AUDIO_SMOOTHING.minThreshold,
  audioMaxClamp: DEFAULT_AUDIO_SMOOTHING.maxClamp,
};
