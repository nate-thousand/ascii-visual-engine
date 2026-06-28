import type { AsciiPreset } from '../core/types';

export const terminalPreset: AsciiPreset = {
  id: 'terminal',
  name: 'Terminal',
  glyphSet: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'F'],
  motionField: 'noise',
  effects: [
    { type: 'noise', enabled: true },
    { type: 'burst', enabled: true },
    { type: 'glitch', enabled: true },
    { type: 'trails', enabled: true },
  ],
  controls: [
    {
      name: 'density',
      label: 'Density',
      min: 0.3,
      max: 2,
      default: 1.2,
      step: 0.1,
    },
    {
      name: 'speed',
      label: 'Speed',
      min: 0.1,
      max: 3,
      default: 0.8,
      step: 0.1,
    },
    {
      name: 'trailAmount',
      label: 'Trails',
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.05,
    },
    {
      name: 'glitchAmount',
      label: 'Glitch',
      min: 0,
      max: 1,
      default: 0.25,
      step: 0.05,
    },
  ],
  density: 1.2,
  speed: 0.8,
  trailAmount: 0.5,
  glitchAmount: 0.25,
};
