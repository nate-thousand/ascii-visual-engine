import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from '../src/plugins/PluginManager';
import { EffectPlugin } from '../src/plugins/EffectPlugin';
import { createBuiltInPlugins, resolvePresetPlugins } from '../src/plugins/builtins';
import { basicPreset } from '../src/presets/basic';
import { terminalPreset } from '../src/presets/terminal';
import { organicPreset } from '../src/presets/organic';
import type { GridCell, GridState } from '../src/core/types';
import type { PluginContext } from '../src/plugins/Plugin';

function makeGrid(cols = 10, rows = 8): GridState {
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

function makeContext(
  grid: GridState,
  overrides: Partial<PluginContext> = {},
): PluginContext {
  return {
    engine: null as never,
    grid,
    glyphSet: ['.', ':', '-', '=', '+', '*', '#'],
    time: 1,
    dt: 0.016,
    speed: 1,
    glitchAmount: 0.5,
    trailAmount: 0.5,
    getControl: (_name, fallback) => fallback ?? 0,
    ...overrides,
  };
}

describe('Effect plugins', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
    for (const plugin of createBuiltInPlugins()) {
      if (plugin.type === 'effect') {
        manager.register(plugin);
      }
    }
  });

  it('registers all five built-in effect plugins', () => {
    const effects = manager.getByType('effect');
    expect(effects.map((p) => p.id).sort()).toEqual([
      'burst',
      'glitch',
      'noise',
      'trails',
      'wave',
    ]);
  });

  it('enables plugins from preset plugins array', () => {
    manager.setEnabledIds(resolvePresetPlugins(basicPreset));
    const enabled = manager.getEnabledByType('effect').map((p) => p.id).sort();
    expect(enabled).toEqual(['burst', 'glitch', 'trails', 'wave']);
  });

  it('migrates legacy preset effects and motionField', () => {
    manager.setEnabledIds(resolvePresetPlugins(terminalPreset));
    const enabled = new Set(manager.getEnabledByType('effect').map((p) => p.id));
    expect(enabled.has('noise')).toBe(true);
    expect(enabled.has('burst')).toBe(true);
    expect(enabled.has('glitch')).toBe(true);
    expect(enabled.has('trails')).toBe(true);
    expect(enabled.has('wave')).toBe(false);
  });

  it('respects disabled glitch in organic legacy preset via plugins array', () => {
    manager.setEnabledIds(resolvePresetPlugins(organicPreset));
    const enabled = manager.getEnabledByType('effect').map((p) => p.id);
    expect(enabled).toContain('noise');
    expect(enabled).toContain('burst');
    expect(enabled).not.toContain('glitch');
  });

  it('motion effect (wave) modifies grid cells when enabled', () => {
    manager.setEnabledIds(['wave']);
    const grid = makeGrid();
    const before = grid.cells[0].char;
    manager.runMotionEffects(makeContext(grid, { time: 2, speed: 1 }));
    expect(grid.cells[0].char).not.toBe(before);
  });

  it('motion effect does not run when disabled', () => {
    manager.setEnabledIds([]);
    manager.enable('wave');
    manager.disable('wave');
    const grid = makeGrid();
    const before = grid.cells.map((c) => c.char);
    manager.runMotionEffects(makeContext(grid, { time: 2 }));
    expect(grid.cells.map((c) => c.char)).toEqual(before);
  });

  it('noise runs before wave when both enabled (wave wins on overlap)', () => {
    manager.setEnabledIds(['noise', 'wave']);
    const grid = makeGrid();
    manager.runMotionEffects(makeContext(grid, { time: 1, speed: 1 }));

    const waveOnly = makeGrid();
    manager.setEnabledIds(['wave']);
    manager.runMotionEffects(makeContext(waveOnly, { time: 1, speed: 1 }));

    expect(grid.cells[0].char).toBe(waveOnly.cells[0].char);
  });

  it('glitch corrupts cells when enabled and glitchAmount > 0', () => {
    manager.setEnabledIds(['glitch']);
    const grid = makeGrid();
    manager.runPostEffects(
      makeContext(grid, {
        glitchAmount: 1,
        getControl: (name) => (name === 'glitchAmount' ? 1 : 0),
      }),
    );
    const glitchChars = '@#$%&!?<>{}[]|\\/~'.split('');
    const corrupted = grid.cells.some((c) => glitchChars.includes(c.char));
    expect(corrupted).toBe(true);
  });

  it('glitch does nothing when glitchAmount is 0', () => {
    manager.setEnabledIds(['glitch']);
    const grid = makeGrid();
    const before = grid.cells.map((c) => c.char);
    manager.runPostEffects(
      makeContext(grid, {
        glitchAmount: 0,
        getControl: () => 0,
      }),
    );
    expect(grid.cells.map((c) => c.char)).toEqual(before);
  });

  it('burst plugin creates visible burst on noteOn', () => {
    manager.setEnabledIds(['burst']);
    const grid = makeGrid();
    manager.dispatchNoteOn({ x: 0.5, y: 0.5, intensity: 1.2 });
    manager.runPostEffects(makeContext(grid));

    const center = grid.cells.find((c) => c.x === 5 && c.y === 4)!;
    expect(center.burst).toBeGreaterThan(0);
    expect(center.brightness).toBeGreaterThan(0.5);
  });

  it('burst does not respond to noteOn when disabled', () => {
    manager.setEnabledIds(['burst']);
    manager.disable('burst');
    const grid = makeGrid();
    manager.dispatchNoteOn({ x: 0.5, y: 0.5, intensity: 1.2 });
    manager.runPostEffects(makeContext(grid));
    expect(grid.cells.every((c) => c.burst === 0)).toBe(true);
  });

  it('trails decays burst values over frames', () => {
    manager.setEnabledIds(['burst', 'trails']);
    const grid = makeGrid();
    manager.dispatchNoteOn({ x: 0.5, y: 0.5, intensity: 1 });
    manager.runPostEffects(
      makeContext(grid, {
        trailAmount: 1,
        getControl: (name) => (name === 'trailAmount' ? 1 : 0),
      }),
    );
    const burstAfterHit = grid.cells.find((c) => c.x === 5 && c.y === 4)!.burst;
    expect(burstAfterHit).toBeGreaterThan(0);

    for (let i = 0; i < 5; i++) {
      manager.runPostEffects(
        makeContext(grid, {
          trailAmount: 1,
          getControl: (name) => (name === 'trailAmount' ? 1 : 0),
        }),
      );
    }
    const burstAfterDecay = grid.cells.find((c) => c.x === 5 && c.y === 4)!.burst;
    expect(burstAfterDecay).toBeLessThan(burstAfterHit);
  });

  it('post effects run in order: burst then glitch then trails', () => {
    const calls: string[] = [];
    const tracking = (id: string, phase: 'motion' | 'post') =>
      new EffectPlugin(
        {
          type: id as 'glitch',
          update: () => {
            calls.push(id);
          },
        },
        { id, name: id, version: '1', phase },
      );

    const trackManager = new PluginManager();
    trackManager.register(tracking('burst', 'post'));
    trackManager.register(tracking('glitch', 'post'));
    trackManager.register(tracking('trails', 'post'));
    trackManager.setEnabledIds(['burst', 'glitch', 'trails']);

    trackManager.runPostEffects(makeContext(makeGrid()));
    expect(calls).toEqual(['burst', 'glitch', 'trails']);
  });

  it('disabling effect plugin resets internal state', () => {
    manager.setEnabledIds(['burst']);
    manager.dispatchNoteOn({ x: 0.5, y: 0.5, intensity: 1 });
    manager.disable('burst');

    manager.enable('burst');
    const grid = makeGrid();
    manager.runPostEffects(makeContext(grid));
    expect(grid.cells.every((c) => c.burst === 0)).toBe(true);
  });
});

describe('EffectPlugin wrapper', () => {
  it('forwards update to underlying effect', () => {
    let updated = false;
    const plugin = new EffectPlugin(
      { type: 'glitch', update: () => { updated = true; } },
      { id: 'test', name: 'Test', version: '1', phase: 'post' },
    );
    plugin.update(0.016, makeContext(makeGrid()));
    expect(updated).toBe(true);
  });

  it('skips update when disabled', () => {
    let updated = false;
    const plugin = new EffectPlugin(
      { type: 'glitch', update: () => { updated = true; } },
      { id: 'test', name: 'Test', version: '1', phase: 'post' },
    );
    plugin.enabled = false;
    plugin.update(0.016, makeContext(makeGrid()));
    expect(updated).toBe(false);
  });
});
