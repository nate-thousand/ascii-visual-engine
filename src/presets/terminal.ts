import type { AsciiPreset } from '../core/types';
import { withLiveControls } from './controlCatalog';

export const terminalPreset: AsciiPreset = withLiveControls({
  id: 'terminal',
  name: 'Terminal Classic',
  glyphSet: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'F'],
  plugins: [
    { id: 'noise', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'scanline', type: 'pattern' },
    { id: 'grid', type: 'pattern' },
  ],
  density: 1.2,
  speed: 0.8,
  trailAmount: 0.5,
  glitchAmount: 0.25,
  motion: { field: 'noise' },
  pattern: { symmetry: 4, petals: 4, spiralAmount: 0.2, cellularAmount: 0.15, scanlineAmount: 0.75 },
});
