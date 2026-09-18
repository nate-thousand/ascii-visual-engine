import type { AsciiPreset } from '../../core/types';
import { withLiveControls } from '../controlCatalog';

export const ambientPreset: AsciiPreset = withLiveControls({
  id: 'ambient',
  name: 'Ambient',
  glyphSet: ['.', ':', '-', '~', '≈', '∿', '◦', '○'],
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'wavePattern', type: 'pattern' },
  ],
  density: 1,
  speed: 0.6,
  trailAmount: 0.55,
  glitchAmount: 0.1,
  motion: {
    behaviors: [
      { id: 'flowField', weight: 0.6, priority: 10 },
      { id: 'breathing', weight: 0.8, priority: 18 },
      { id: 'wave', weight: 0.4, priority: 5 },
    ],
    strength: 0.5,
    randomness: 0.3,
    frequency: 1,
    amplitude: 0.8,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.6,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
});

export const motionOrganicPreset: AsciiPreset = withLiveControls({
  id: 'motionOrganic',
  name: 'Organic',
  glyphSet: ['·', '°', '○', '●', '◦', '∘', '∙', '◉'],
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern' },
  ],
  density: 1,
  speed: 0.5,
  trailAmount: 0.65,
  glitchAmount: 0.1,
  motion: {
    behaviors: [
      { id: 'organicGrowth', weight: 1, priority: 20 },
      { id: 'breathing', weight: 0.7, priority: 18 },
      { id: 'flowField', weight: 0.3, priority: 10 },
    ],
    strength: 0.75,
    randomness: 0.3,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 8, petals: 7, spiralAmount: 0.5, cellularAmount: 0.65, scanlineAmount: 0.5 },
});

export const mechanicalPreset: AsciiPreset = withLiveControls({
  id: 'mechanical',
  name: 'Mechanical',
  glyphSet: ['|', '-', '+', '#', '█', '▓', '▒', '░'],
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'grid', type: 'pattern' },
    { id: 'scanline', type: 'pattern' },
  ],
  density: 1,
  speed: 1.2,
  trailAmount: 0.4,
  glitchAmount: 0.2,
  motion: {
    behaviors: [
      { id: 'orbital', weight: 0.8, priority: 30 },
      { id: 'pulse', weight: 0.6, priority: 8 },
      { id: 'spiral', weight: 0.5, priority: 22 },
    ],
    strength: 0.85,
    randomness: 0.3,
    frequency: 1.5,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.7 },
});

export const motionTerminalPreset: AsciiPreset = withLiveControls({
  id: 'motionTerminal',
  name: 'Terminal',
  glyphSet: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'F'],
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'scanline', type: 'pattern' },
    { id: 'grid', type: 'pattern' },
  ],
  density: 1.2,
  speed: 0.9,
  trailAmount: 0.4,
  glitchAmount: 0.3,
  motion: {
    behaviors: [
      { id: 'wind', weight: 0.9, priority: 12 },
      { id: 'pulse', weight: 0.4, priority: 8 },
      { id: 'brownian', weight: 0.3, priority: 40 },
    ],
    strength: 0.7,
    randomness: 0.4,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.9,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.8 },
});

export const chaoticPreset: AsciiPreset = withLiveControls({
  id: 'chaotic',
  name: 'Chaotic',
  glyphSet: ['@', '#', '$', '%', '&', '!', '?', '*'],
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
  ],
  density: 1,
  speed: 1.5,
  trailAmount: 0.5,
  glitchAmount: 0.45,
  motion: {
    behaviors: [
      { id: 'brownian', weight: 1, priority: 40 },
      { id: 'curlNoise', weight: 0.8, priority: 35 },
      { id: 'flocking', weight: 0.6, priority: 25 },
      { id: 'gravity', weight: 0.5, priority: 15 },
    ],
    strength: 0.9,
    randomness: 0.8,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 1.2,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
});

export const minimalPreset: AsciiPreset = withLiveControls({
  id: 'minimal',
  name: 'Minimal',
  glyphSet: ['.', '·', ' '],
  plugins: [
    { id: 'trails', type: 'effect' },
  ],
  density: 0.7,
  speed: 0.4,
  trailAmount: 0.25,
  glitchAmount: 0.1,
  motion: {
    behaviors: [
      { id: 'wave', weight: 1, priority: 5 },
    ],
    strength: 0.35,
    randomness: 0.3,
    frequency: 1,
    amplitude: 0.6,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
});

