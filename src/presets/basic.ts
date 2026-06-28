import type { AsciiPreset } from '../core/types';

export const basicPreset: AsciiPreset = {
  id: 'basic',
  name: 'Basic',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#', '@'],
  motionField: 'wave',
  effects: [
    { type: 'wave', enabled: true },
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
      default: 1,
      step: 0.1,
    },
    {
      name: 'speed',
      label: 'Speed',
      min: 0.1,
      max: 3,
      default: 1,
      step: 0.1,
    },
    {
      name: 'trailAmount',
      label: 'Trails',
      min: 0,
      max: 1,
      default: 0.35,
      step: 0.05,
    },
    {
      name: 'glitchAmount',
      label: 'Glitch',
      min: 0,
      max: 1,
      default: 0.15,
      step: 0.05,
    },
  ],
  density: 1,
  speed: 1,
  trailAmount: 0.35,
  glitchAmount: 0.15,
};
