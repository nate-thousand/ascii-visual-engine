import type { AsciiPreset } from '../core/types';
import { withLiveControls } from './controlCatalog';

export const organicPreset: AsciiPreset = withLiveControls({
  id: 'organic',
  name: 'Organic Classic',
  glyphSet: ['·', '°', '○', '●', '◦', '∘', '∙', '◉'],
  plugins: [
    { id: 'noise', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern' },
  ],
  density: 0.9,
  speed: 0.5,
  trailAmount: 0.7,
  glitchAmount: 0,
  motion: { field: 'noise' },
  pattern: { symmetry: 8, petals: 7, spiralAmount: 0.25, cellularAmount: 0.65, scanlineAmount: 0 },
});
