import type { AsciiPreset } from '../../core/types';
import type { AudioMappingPresetConfig } from '../../audio/AudioTypes';

const sharedControls = [
  { name: 'density', label: 'Density', min: 0.3, max: 2, default: 1, step: 0.1 },
  { name: 'speed', label: 'Speed', min: 0.1, max: 3, default: 1, step: 0.1 },
  { name: 'trailAmount', label: 'Trails', min: 0, max: 1, default: 0.35, step: 0.05 },
  { name: 'glitchAmount', label: 'Glitch', min: 0, max: 1, default: 0.15, step: 0.05 },
  { name: 'strength', label: 'Strength', min: 0, max: 1, default: 0.6, step: 0.05 },
  { name: 'audioAttack', label: 'Audio Attack', min: 0.01, max: 1, default: 0.08, step: 0.01 },
  { name: 'audioRelease', label: 'Audio Release', min: 0.01, max: 1, default: 0.25, step: 0.01 },
  { name: 'audioSensitivity', label: 'Sensitivity', min: 0.1, max: 3, default: 1, step: 0.05 },
  { name: 'audioNoiseGate', label: 'Noise Gate', min: 0, max: 0.2, default: 0.02, step: 0.005 },
] as const;

function baseAudioPreset(
  id: string,
  name: string,
  audioMapping: AudioMappingPresetConfig,
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
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    patterns: ['radialSymmetry'],
    motions: [{ id: 'flowField', weight: 0.5 }],
    controls: [...sharedControls],
    density: 1,
    speed: 0.7,
    trailAmount: 0.35,
    glitchAmount: 0.1,
    strength: 0.6,
    audioAttack: 0.08,
    audioRelease: 0.25,
    audioSensitivity: 1,
    audioNoiseGate: 0.02,
    audioMinThreshold: 0,
    audioMaxClamp: 1,
    audioMapping,
    ...extra,
  };
}

export const audioAmbientPreset = baseAudioPreset('audioAmbient', 'Audio — Ambient Slow', {
  enabled: true,
  smoothing: { attack: 0.35, release: 0.6, sensitivity: 0.8, noiseGate: 0.015 },
  mappings: [
    { feature: 'amplitude', target: { type: 'control', control: 'trailAmount', amount: 0.7, min: 0.1, max: 0.9 } },
    { feature: 'bass', target: { type: 'control', control: 'density', amount: 0.4, min: 0.6, max: 1.6 } },
    { feature: 'spectralCentroid', target: { type: 'control', control: 'speed', amount: 0.5, min: 0.3, max: 1.2 } },
  ],
}, { speed: 0.5, trailAmount: 0.5 });

export const audioBassPreset = baseAudioPreset('audioBass', 'Audio — Bass Reactive', {
  enabled: true,
  smoothing: { attack: 0.06, release: 0.2, sensitivity: 1.2, noiseGate: 0.025 },
  mappings: [
    { feature: 'bass', target: { type: 'control', control: 'strength', amount: 1, min: 0.2, max: 1 } },
    { feature: 'bass', target: { type: 'control', control: 'simSpawnRate', amount: 0.9, min: 0, max: 1 } },
    { feature: 'beat', target: { type: 'control', control: 'glitchAmount', amount: 0.5, min: 0, max: 0.6 } },
  ],
}, {
  simulations: [{ id: 'particle', enabled: true }],
  simSpawnRate: 0.3,
});

export const audioGlitchPreset = baseAudioPreset('audioGlitch', 'Audio — Glitch Transient', {
  enabled: true,
  smoothing: { attack: 0.02, release: 0.12, sensitivity: 1.5, noiseGate: 0.01 },
  mappings: [
    { feature: 'transient', target: { type: 'noteOn', minIntensity: 0.8, maxIntensity: 2.2, cooldownMs: 80 } },
    { feature: 'transient', target: { type: 'control', control: 'glitchAmount', amount: 1, min: 0, max: 1 } },
    { feature: 'amplitude', target: { type: 'control', control: 'trailAmount', amount: 0.6, min: 0, max: 0.8 } },
  ],
}, {
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'spiral', type: 'pattern' },
  ],
  glitchAmount: 0.2,
});

export const audioVoicePreset = baseAudioPreset('audioVoice', 'Audio — Voice Reactive', {
  enabled: true,
  smoothing: { attack: 0.1, release: 0.3, sensitivity: 1, noiseGate: 0.03 },
  mappings: [
    { feature: 'mid', target: { type: 'control', control: 'speed', amount: 0.8, min: 0.4, max: 1.8 } },
    { feature: 'highMid', target: { type: 'control', control: 'spiralAmount', amount: 0.9, min: 0, max: 1 } },
    { feature: 'amplitude', target: { type: 'control', control: 'strength', amount: 0.7, min: 0.3, max: 1 } },
  ],
}, {
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'spiral', type: 'pattern' },
  ],
  spiralAmount: 0.4,
});

export const audioFullSpectrumPreset = baseAudioPreset('audioFullSpectrum', 'Audio — Full Spectrum', {
  enabled: true,
  smoothing: { attack: 0.07, release: 0.22, sensitivity: 1.1, noiseGate: 0.02 },
  mappings: [
    { feature: 'bass', target: { type: 'control', control: 'density', amount: 0.5, min: 0.5, max: 1.8 } },
    { feature: 'lowMid', target: { type: 'control', control: 'strength', amount: 0.8, min: 0.2, max: 1 } },
    { feature: 'mid', target: { type: 'control', control: 'speed', amount: 0.7, min: 0.3, max: 2 } },
    { feature: 'highMid', target: { type: 'control', control: 'glitchAmount', amount: 0.6, min: 0, max: 0.8 } },
    { feature: 'treble', target: { type: 'control', control: 'trailAmount', amount: 0.7, min: 0, max: 1 } },
    { feature: 'transient', target: { type: 'noteOn', minIntensity: 0.7, maxIntensity: 1.8, cooldownMs: 100 } },
    { feature: 'beat', target: { type: 'postPass', passId: 'feedback', amount: 0.8, min: 0.2, max: 0.95 } },
  ],
}, {
  postProcessing: [{ id: 'feedback', enabled: true, amount: 0.5 }],
  postFeedback: 0.5,
});
