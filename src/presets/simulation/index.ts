import type { AsciiPreset } from '../../core/types';
import { withLiveControls } from '../controlCatalog';

export const particlePreset: AsciiPreset = withLiveControls({
  id: 'particleSim',
  name: 'Particle Sim',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#', '@'],
  plugins: [
    { id: 'trails', type: 'effect' },
    { id: 'burst', type: 'effect' },
  ],
  density: 1,
  speed: 1,
  trailAmount: 0.6,
  glitchAmount: 0.1,
  motion: {
    strength: 0.7,
    randomness: 0.3,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
  simulation: {
    behaviors: [
      { id: 'particle' },
    ],
    simStrength: 0.9,
    simSpawnRate: 0.8,
  },
});

export const reactionDiffusionPreset: AsciiPreset = withLiveControls({
  id: 'reactionDiffusionSim',
  name: 'Reaction Diffusion',
  glyphSet: ['.', ':', '-', '~', '≈', '∿', '◦', '○'],
  plugins: [
    { id: 'trails', type: 'effect' },
  ],
  density: 1,
  speed: 1,
  trailAmount: 0.4,
  glitchAmount: 0.1,
  motion: {
    strength: 0.7,
    randomness: 0.3,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
  simulation: {
    behaviors: [
      { id: 'reactionDiffusion' },
    ],
    simStrength: 0.85,
    simSpeed: 0.8,
  },
});

export const lsystemPreset: AsciiPreset = withLiveControls({
  id: 'lsystemSim',
  name: 'L-System Growth',
  glyphSet: ['|', '/', '\\', 'Y', 'y', 'F', '+', '-'],
  plugins: [
    { id: 'trails', type: 'effect' },
  ],
  density: 1,
  speed: 1,
  trailAmount: 0.35,
  glitchAmount: 0.1,
  motion: {
    strength: 0.7,
    randomness: 0.3,
    frequency: 1,
    amplitude: 1,
    decay: 0.1,
    drag: 0.05,
    gravity: 0.5,
    noiseScale: 1,
    flowStrength: 0.8,
  },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.5, cellularAmount: 0.5, scanlineAmount: 0.5 },
  simulation: {
    behaviors: [
      { id: 'lsystem' },
    ],
    simStrength: 0.9,
    simSpeed: 0.6,
  },
});

export const simulationPresets = [particlePreset, reactionDiffusionPreset, lsystemPreset];
