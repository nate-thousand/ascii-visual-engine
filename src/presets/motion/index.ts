import type { AsciiPreset } from '../../core/types';
import { baseMotionDefaults, motionControlDefs } from '../motionShared';

export const ambientPreset: AsciiPreset = {
  id: 'ambient',
  name: 'Ambient',
  glyphSet: ['.', ':', '-', '~', '≈', '∿', '◦', '○'],
  motionField: 'none',
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'wavePattern', type: 'pattern' },
  ],
  motions: [
    { id: 'flowField', weight: 0.6, priority: 10 },
    { id: 'breathing', weight: 0.8, priority: 18 },
    { id: 'wave', weight: 0.4, priority: 5 },
  ],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 0.6,
  strength: 0.5,
  flowStrength: 0.6,
  amplitude: 0.8,
  trailAmount: 0.55,
};

export const motionOrganicPreset: AsciiPreset = {
  id: 'motionOrganic',
  name: 'Organic',
  glyphSet: ['·', '°', '○', '●', '◦', '∘', '∙', '◉'],
  motionField: 'none',
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern' },
  ],
  motions: [
    { id: 'organicGrowth', weight: 1, priority: 20 },
    { id: 'breathing', weight: 0.7, priority: 18 },
    { id: 'flowField', weight: 0.3, priority: 10 },
  ],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 0.5,
  strength: 0.75,
  cellularAmount: 0.65,
  symmetry: 8,
  petals: 7,
  trailAmount: 0.65,
};

export const mechanicalPreset: AsciiPreset = {
  id: 'mechanical',
  name: 'Mechanical',
  glyphSet: ['|', '-', '+', '#', '█', '▓', '▒', '░'],
  motionField: 'none',
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'grid', type: 'pattern' },
    { id: 'scanline', type: 'pattern' },
  ],
  motions: [
    { id: 'orbital', weight: 0.8, priority: 30 },
    { id: 'pulse', weight: 0.6, priority: 8 },
    { id: 'spiral', weight: 0.5, priority: 22 },
  ],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 1.2,
  strength: 0.85,
  frequency: 1.5,
  scanlineAmount: 0.7,
  glitchAmount: 0.2,
};

export const motionTerminalPreset: AsciiPreset = {
  id: 'motionTerminal',
  name: 'Terminal',
  glyphSet: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'F'],
  motionField: 'none',
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'scanline', type: 'pattern' },
    { id: 'grid', type: 'pattern' },
  ],
  motions: [
    { id: 'wind', weight: 0.9, priority: 12 },
    { id: 'pulse', weight: 0.4, priority: 8 },
    { id: 'brownian', weight: 0.3, priority: 40 },
  ],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 0.9,
  flowStrength: 0.9,
  randomness: 0.4,
  scanlineAmount: 0.8,
  glitchAmount: 0.3,
  density: 1.2,
};

export const chaoticPreset: AsciiPreset = {
  id: 'chaotic',
  name: 'Chaotic',
  glyphSet: ['@', '#', '$', '%', '&', '!', '?', '*'],
  motionField: 'none',
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
  ],
  motions: [
    { id: 'brownian', weight: 1, priority: 40 },
    { id: 'curlNoise', weight: 0.8, priority: 35 },
    { id: 'flocking', weight: 0.6, priority: 25 },
    { id: 'gravity', weight: 0.5, priority: 15 },
  ],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 1.5,
  strength: 0.9,
  randomness: 0.8,
  gravity: 1.2,
  glitchAmount: 0.45,
  trailAmount: 0.5,
};

export const minimalPreset: AsciiPreset = {
  id: 'minimal',
  name: 'Minimal',
  glyphSet: ['.', '·', ' '],
  motionField: 'none',
  plugins: [{ id: 'trails', type: 'effect' }],
  motions: [{ id: 'wave', weight: 1, priority: 5 }],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  speed: 0.4,
  strength: 0.35,
  amplitude: 0.6,
  density: 0.7,
  trailAmount: 0.25,
};
