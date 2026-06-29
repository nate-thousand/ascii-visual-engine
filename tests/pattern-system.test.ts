import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatternRegistry,
  createBuiltInPatterns,
  listPatternIds,
  patternCatalog,
  clamp01,
  hashNoise,
  smoothNoise,
} from '../src/patterns';
import type { GridCell, GridState } from '../src/core/types';
import type { PatternSampleContext } from '../src/patterns';

function makeGrid(cols = 16, rows = 12): GridState {
  const cells: GridCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        char: '.',
        baseChar: '.',
        x,
        y,
        phase: 0,
        brightness: 0.5,
        burst: 0,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        rotation: 0,
        deformation: 0,
      });
    }
  }
  return { cells, cols, rows, time: 0, width: 640, height: 480 };
}

function makePatternContext(grid: GridState): PatternSampleContext {
  return {
    grid,
    glyphSet: ['.', ':', '-', '=', '+', '*', '#'],
    time: 1.5,
    dt: 0.016,
    speed: 1,
    getControl: (_name: string, fallback?: number) => fallback ?? 0.5,
  };
}

describe('Pattern system', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
    for (const pattern of createBuiltInPatterns()) {
      registry.registerPattern(pattern);
    }
  });

  it('registers all six built-in patterns', () => {
    expect(listPatternIds().sort()).toEqual([
      'cellular',
      'grid',
      'radialSymmetry',
      'scanline',
      'spiral',
      'wave',
    ]);
    expect(Object.keys(patternCatalog).sort()).toEqual(listPatternIds().sort());
    expect(registry.getAllPatterns()).toHaveLength(6);
  });

  it('rejects duplicate pattern registration', () => {
    const [first] = createBuiltInPatterns();
    expect(() => registry.registerPattern(first)).toThrow(/already registered/);
  });

  it('throws for unknown pattern lookup via enablePattern', () => {
    expect(() => registry.enablePattern('missing' as never)).toThrow(/unknown pattern/);
  });

  it('samples normalized brightness for every built-in pattern', () => {
    const grid = makeGrid();
    const context = makePatternContext(grid);

    for (const pattern of createBuiltInPatterns()) {
      pattern.initialize(null as never);
      pattern.update(0.016, context);

      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          const nx = x / grid.cols;
          const ny = y / grid.rows;
          const value = pattern.sample(nx, ny, context);
          expect(value, `${pattern.id} at (${nx}, ${ny})`).toBeGreaterThanOrEqual(0);
          expect(value, `${pattern.id} at (${nx}, ${ny})`).toBeLessThanOrEqual(1);
        }
      }

      pattern.destroy();
    }
  });

  it('produces distinct samples across the grid for radial symmetry', () => {
    const pattern = registry.getPattern('radialSymmetry')!;
    const context = makePatternContext(makeGrid());
    const samples = new Set<number>();

    for (let i = 0; i < 8; i++) {
      samples.add(pattern.sample(i / 8, 0.5, context));
    }

    expect(samples.size).toBeGreaterThan(1);
  });

  it('utility helpers stay in range', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(hashNoise(3, 7)).toBeGreaterThanOrEqual(0);
    expect(hashNoise(3, 7)).toBeLessThan(1);
    expect(smoothNoise(1.25, 2.75)).toBeGreaterThanOrEqual(0);
    expect(smoothNoise(1.25, 2.75)).toBeLessThanOrEqual(1);
  });
});
