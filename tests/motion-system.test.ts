import { describe, it, expect, beforeEach } from 'vitest';
import { MotionManager } from '../src/motion/MotionManager';
import { createBuiltInMotions, resolvePresetMotions } from '../src/motion/builtins';
import { ambientPreset, chaoticPreset, minimalPreset } from '../src/presets/motion';
import type { GridCell, GridState } from '../src/core/types';

function makeGrid(cols = 12, rows = 8): GridState {
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
  return { cells, cols, rows, time: 0, width: 800, height: 600 };
}

function makeMotionContext(grid: GridState) {
  return {
    engine: null as never,
    grid,
    time: 2,
    dt: 0.016,
    cols: grid.cols,
    rows: grid.rows,
    cellCount: grid.cells.length,
    getControl: (_name: string, fallback?: number) => fallback ?? 0.7,
  };
}

describe('Motion system', () => {
  let manager: MotionManager;

  beforeEach(() => {
    manager = new MotionManager();
    for (const motion of createBuiltInMotions()) {
      manager.registerMotion(motion);
    }
  });

  it('registers all twelve built-in motions', () => {
    expect(manager.getAll().map((m) => m.id).sort()).toEqual([
      'breathing',
      'brownian',
      'curlNoise',
      'flocking',
      'flowField',
      'gravity',
      'orbital',
      'organicGrowth',
      'pulse',
      'spiral',
      'wave',
      'wind',
    ]);
  });

  it('enables motions from preset config', () => {
    manager.setEnabledIds(resolvePresetMotions(ambientPreset));
    const ids = manager.getEnabled().map((m) => m.id).sort();
    expect(ids).toEqual(['breathing', 'flowField', 'wave']);
  });

  it('combines multiple motions without throwing', () => {
    manager.setEnabledIds(resolvePresetMotions(chaoticPreset));
    const grid = makeGrid();
    manager.combineMotions(makeMotionContext(grid));
    const moved = grid.cells.some((c) => c.ox !== 0 || c.oy !== 0 || c.brightness !== 0.5);
    expect(moved).toBe(true);
  });

  it('wave motion produces distinct offsets from breathing', () => {
    const gridA = makeGrid();
    const gridB = makeGrid();

    manager.setEnabledIds([{ id: 'wave', weight: 1 }]);
    manager.combineMotions(makeMotionContext(gridA));

    manager.setEnabledIds([{ id: 'breathing', weight: 1 }]);
    manager.combineMotions(makeMotionContext(gridB));

    const snapA = gridA.cells.map((c) => `${c.ox.toFixed(2)},${c.oy.toFixed(2)}`).join('|');
    const snapB = gridB.cells.map((c) => `${c.ox.toFixed(2)},${c.oy.toFixed(2)}`).join('|');
    expect(snapA).not.toBe(snapB);
  });

  it('blended motions accumulate weights', () => {
    manager.setEnabledIds([
      { id: 'wave', weight: 0.5, priority: 5 },
      { id: 'breathing', weight: 0.5, priority: 18 },
    ]);
    const grid = makeGrid();
    manager.combineMotions(makeMotionContext(grid));
    const debug = manager.getDebugState();
    expect(debug.activeMotions).toHaveLength(2);
    expect(debug.particleCount).toBe(grid.cells.length);
  });

  it('minimal preset uses single wave motion', () => {
    manager.setEnabledIds(resolvePresetMotions(minimalPreset));
    expect(manager.getEnabled()).toHaveLength(1);
    expect(manager.getEnabled()[0].id).toBe('wave');
  });

  it('disableMotion stops motion contribution', () => {
    manager.setEnabledIds([{ id: 'wave', weight: 1 }]);
    manager.disableMotion('wave');
    const grid = makeGrid();
    const before = grid.cells.map((c) => c.brightness);
    manager.combineMotions(makeMotionContext(grid));
    expect(grid.cells.map((c) => c.brightness)).toEqual(before);
  });

  it('setMotionWeight adjusts blend contribution', () => {
    manager.setEnabledIds([{ id: 'wave', weight: 1 }]);
    const gridFull = makeGrid();
    manager.combineMotions(makeMotionContext(gridFull));

    manager.setMotionWeight('wave', 0.1);
    const gridWeak = makeGrid();
    manager.combineMotions(makeMotionContext(gridWeak));

    const ampFull = gridFull.cells.reduce((s, c) => s + Math.abs(c.oy), 0);
    const ampWeak = gridWeak.cells.reduce((s, c) => s + Math.abs(c.oy), 0);
    expect(ampFull).toBeGreaterThan(ampWeak);
  });
});
