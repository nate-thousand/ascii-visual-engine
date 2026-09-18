import type { AsciiPreset } from '../core/types';
import { withLiveControls } from './controlCatalog';

export const basicPreset: AsciiPreset = withLiveControls({
  id: 'basic',
  name: 'Basic',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#', '@'],
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
  ],
  density: 1,
  speed: 1,
  trailAmount: 0.35,
  glitchAmount: 0.15,
  motion: { field: 'wave' },
  pattern: { symmetry: 6, petals: 5, spiralAmount: 0.3, cellularAmount: 0.2, scanlineAmount: 0.1 },
});
