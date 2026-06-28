import type { AsciiPreset } from '../core/types';

export const organicPreset: AsciiPreset = {
  id: 'organic',
  name: 'Organic',
  glyphSet: ['·', '°', '○', '●', '◦', '∘', '∙', '◉'],
  motionField: 'noise',
  effects: [
    { type: 'noise', enabled: true },
    { type: 'burst', enabled: true },
    { type: 'glitch', enabled: false },
    { type: 'trails', enabled: true },
  ],
  controls: [
    {
      name: 'density',
      label: 'Density',
      min: 0.3,
      max: 2,
      default: 0.9,
      step: 0.1,
    },
    {
      name: 'speed',
      label: 'Speed',
      min: 0.1,
      max: 3,
      default: 0.5,
      step: 0.1,
    },
    {
      name: 'trailAmount',
      label: 'Trails',
      min: 0,
      max: 1,
      default: 0.7,
      step: 0.05,
    },
    {
      name: 'glitchAmount',
      label: 'Glitch',
      min: 0,
      max: 1,
      default: 0,
      step: 0.05,
    },
  ],
  density: 0.9,
  speed: 0.5,
  trailAmount: 0.7,
  glitchAmount: 0,
};
