import { RadialSymmetryPattern } from './RadialSymmetryPattern';
import { SpiralPattern } from './SpiralPattern';
import { WavePattern } from './WavePattern';
import { GridPattern } from './GridPattern';
import { CellularPattern } from './CellularPattern';
import { ScanlinePattern } from './ScanlinePattern';
import type { Pattern, PatternId } from './Pattern';

export type { Pattern, PatternId, PatternSampleContext } from './Pattern';
export { clamp01, hashNoise, smoothNoise } from './Pattern';
export { PatternRegistry } from './PatternRegistry';
export { RadialSymmetryPattern } from './RadialSymmetryPattern';
export { SpiralPattern } from './SpiralPattern';
export { WavePattern } from './WavePattern';
export { GridPattern } from './GridPattern';
export { CellularPattern } from './CellularPattern';
export { ScanlinePattern } from './ScanlinePattern';

export function createBuiltInPatterns(): Pattern[] {
  return [
    new RadialSymmetryPattern(),
    new SpiralPattern(),
    new WavePattern(),
    new GridPattern(),
    new CellularPattern(),
    new ScanlinePattern(),
  ];
}

export const patternCatalog = {
  radialSymmetry: { id: 'radialSymmetry', name: 'Radial Symmetry' },
  spiral: { id: 'spiral', name: 'Spiral' },
  wave: { id: 'wave', name: 'Wave' },
  grid: { id: 'grid', name: 'Grid' },
  cellular: { id: 'cellular', name: 'Cellular' },
  scanline: { id: 'scanline', name: 'Scanline' },
} as const;

export function listPatternIds(): PatternId[] {
  return Object.keys(patternCatalog) as PatternId[];
}
