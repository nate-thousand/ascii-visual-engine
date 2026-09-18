import type { AsciiPreset } from '../../core/types';
import { withLiveControls } from '../controlCatalog';

export const compositingPreset: AsciiPreset = withLiveControls({
  id: 'compositing',
  name: 'Compositing Demo',
  glyphSet: [' ', '.', ':', '-', '=', '+', '*', '#', '@'],
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'spiral', type: 'pattern' },
  ],
  density: 1,
  speed: 0.8,
  trailAmount: 0.4,
  glitchAmount: 0.05,
  motion: {
    behaviors: [
      { id: 'flowField', weight: 0.6 },
    ],
  },
  pattern: { symmetry: 8, spiralAmount: 0.7 },
  post: {
    passes: [
      { id: 'feedback', enabled: true, amount: 0.75 },
      { id: 'smear', enabled: true, amount: 0.35 },
    ],
    postFeedback: 0.75,
    postSmear: 0.35,
  },
  layers: [
    {
      id: 'base',
      name: 'Base Pattern',
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      pattern: 'radialSymmetry',
      mask: { type: 'radial', amount: 1, centerX: 0.5, centerY: 0.5 },
    },
    {
      id: 'overlay',
      name: 'Spiral Overlay',
      enabled: true,
      opacity: 0.65,
      blendMode: 'add',
      pattern: 'spiral',
      mask: { type: 'linear', amount: 0.8, angle: 45 },
    },
    {
      id: 'accent',
      name: 'Noise Accent',
      enabled: true,
      opacity: 0.35,
      blendMode: 'screen',
      fill: 0.6,
      mask: { type: 'noise', amount: 1.2 },
    },
  ],
});
