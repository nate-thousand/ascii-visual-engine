import type { AsciiPreset } from '../../core/types';
import { baseMotionDefaults, motionControlDefs } from '../motionShared';

export const particlePreset: AsciiPreset = {
  id: 'particleSim',
  name: 'Particle Sim',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#', '@'],
  motionField: 'none',
  plugins: [
    { id: 'trails', type: 'effect' },
    { id: 'burst', type: 'effect' },
  ],
  simulations: [{ id: 'particle' }],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  simStrength: 0.9,
  simSpawnRate: 0.8,
  trailAmount: 0.6,
};

export const reactionDiffusionPreset: AsciiPreset = {
  id: 'reactionDiffusionSim',
  name: 'Reaction Diffusion',
  glyphSet: ['.', ':', '-', '~', '≈', '∿', '◦', '○'],
  motionField: 'none',
  plugins: [{ id: 'trails', type: 'effect' }],
  simulations: [{ id: 'reactionDiffusion' }],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  simSpeed: 0.8,
  simStrength: 0.85,
  trailAmount: 0.4,
};

export const lsystemPreset: AsciiPreset = {
  id: 'lsystemSim',
  name: 'L-System Growth',
  glyphSet: ['|', '/', '\\', 'Y', 'y', 'F', '+', '-'],
  motionField: 'none',
  plugins: [{ id: 'trails', type: 'effect' }],
  simulations: [{ id: 'lsystem' }],
  controls: motionControlDefs,
  ...baseMotionDefaults,
  simSpeed: 0.6,
  simStrength: 0.9,
  trailAmount: 0.35,
};

export const simulationPresets = [particlePreset, reactionDiffusionPreset, lsystemPreset];
