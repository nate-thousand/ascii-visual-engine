import type { AsciiPreset } from '../../core/types';
import type { AudioMappingPresetConfig } from '../../audio/AudioTypes';
import { withLiveControls } from '../controlCatalog';

function baseAudioPreset(
  id: string,
  name: string,
  mapping: AudioMappingPresetConfig,
  extra: Partial<AsciiPreset> = {},
): AsciiPreset {
  return withLiveControls({
    id,
    name,
    glyphSet: [' ', '.', ':', '-', '=', '+', '*', '#', '@'],
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    density: 1,
    speed: 0.7,
    trailAmount: 0.35,
    glitchAmount: 0.1,
    ...extra,
    motion: { behaviors: [{ id: 'flowField', weight: 0.5 }], strength: 0.6, ...extra.motion },
    audio: {
      mapping,
      audioAttack: 0.08,
      audioRelease: 0.25,
      audioSensitivity: 1,
      audioNoiseGate: 0.02,
      audioMinThreshold: 0,
      audioMaxClamp: 1,
      ...extra.audio,
    },
  });
}

export const audioAmbientPreset = baseAudioPreset('audioAmbient', 'Ambient Slow', {
  enabled: true,
  smoothing: { attack: 0.35, release: 0.6, sensitivity: 0.8, noiseGate: 0.015 },
  mappings: [
    { feature: 'amplitude', target: { type: 'control', control: 'trailAmount', amount: 0.7, min: 0.1, max: 0.9 } },
    { feature: 'bass', target: { type: 'control', control: 'density', amount: 0.4, min: 0.6, max: 1.6 } },
    { feature: 'spectralCentroid', target: { type: 'control', control: 'speed', amount: 0.5, min: 0.3, max: 1.2 } },
  ],
}, { speed: 0.5, trailAmount: 0.5 });

export const audioBassPreset = baseAudioPreset('audioBass', 'Bass Reactive', {
  enabled: true,
  smoothing: { attack: 0.06, release: 0.2, sensitivity: 1.2, noiseGate: 0.025 },
  mappings: [
    { feature: 'bass', target: { type: 'control', control: 'amplitude', amount: 1, min: 0.2, max: 1 } },
    { feature: 'bass', target: { type: 'control', control: 'simSpawnRate', amount: 0.9, min: 0, max: 1 } },
    { feature: 'beat', target: { type: 'control', control: 'glitchAmount', amount: 0.5, min: 0, max: 0.6 } },
  ],
}, {
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
  ],
  simulation: { behaviors: [{ id: 'particle', enabled: true }], simSpawnRate: 0.3 },
  glitchAmount: 0,
});

export const audioGlitchPreset = baseAudioPreset('audioGlitch', 'Glitch Transient', {
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

export const audioVoicePreset = baseAudioPreset('audioVoice', 'Voice Reactive', {
  enabled: true,
  smoothing: { attack: 0.1, release: 0.3, sensitivity: 1, noiseGate: 0.03 },
  mappings: [
    { feature: 'mid', target: { type: 'control', control: 'speed', amount: 0.8, min: 0.4, max: 1.8 } },
    { feature: 'highMid', target: { type: 'control', control: 'spiralAmount', amount: 0.9, min: 0, max: 1 } },
    { feature: 'amplitude', target: { type: 'control', control: 'amplitude', amount: 0.7, min: 0.3, max: 1 } },
  ],
}, {
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'spiral', type: 'pattern' },
  ],
  pattern: { spiralAmount: 0.4 },
});

export const audioFullSpectrumPreset = baseAudioPreset('audioFullSpectrum', 'Full Spectrum', {
  enabled: true,
  smoothing: { attack: 0.07, release: 0.22, sensitivity: 1.1, noiseGate: 0.02 },
  mappings: [
    { feature: 'bass', target: { type: 'control', control: 'density', amount: 0.5, min: 0.5, max: 1.8 } },
    { feature: 'lowMid', target: { type: 'control', control: 'amplitude', amount: 0.8, min: 0.2, max: 1 } },
    { feature: 'mid', target: { type: 'control', control: 'speed', amount: 0.7, min: 0.3, max: 2 } },
    { feature: 'highMid', target: { type: 'control', control: 'glitchAmount', amount: 0.6, min: 0, max: 0.8 } },
    { feature: 'treble', target: { type: 'control', control: 'trailAmount', amount: 0.7, min: 0, max: 1 } },
    { feature: 'transient', target: { type: 'noteOn', minIntensity: 0.7, maxIntensity: 1.8, cooldownMs: 100 } },
    { feature: 'beat', target: { type: 'postPass', passId: 'feedback', amount: 0.8, min: 0.2, max: 0.95 } },
  ],
}, {
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
  ],
  post: { passes: [{ id: 'feedback', enabled: true, amount: 0.5 }], postFeedback: 0.5 },
  glitchAmount: 0,
});
