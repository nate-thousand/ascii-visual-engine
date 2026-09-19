import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { ParamStore } from '../src/plugins/ParamStore';
import { SpiralPattern } from '../src/patterns/SpiralPattern';
import { Glitch } from '../src/effects/Glitch';
import { validatePreset } from '../src/core/validate';
import { exportPreset } from '../src/presets/presetIO';
import { getPreset } from '../src/presets';
import { pluginCatalog } from '../src/plugins/builtins';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

describe('ParamStore', () => {
  it('starts at defaults, clamps, ignores unknown names, resets, and reports changes', () => {
    const store = new ParamStore<'a' | 'b'>([
      { name: 'a', min: 0, max: 1, default: 0.5, step: 0.1 },
      { name: 'b', min: 1, max: 10, default: 3, step: 1 },
    ]);
    expect(store.getParams()).toEqual({ a: 0.5, b: 3 });
    store.setParams({ a: 5, b: 0, c: 9, d: Number.NaN } as Record<string, number>);
    expect(store.get('a')).toBe(1);
    expect(store.get('b')).toBe(1);
    expect(store.changedParams()).toEqual({ a: 1, b: 1 });
    store.resetParams();
    expect(store.changedParams()).toEqual({});
    expect(store.describeParams()[1]).toMatchObject({ name: 'b', min: 1, max: 10, default: 3 });
  });
});

describe('built in params', () => {
  it('every pattern and effect plugin declares params with defaults inside their range', () => {
    const engine = new AsciiEngine({ canvas: createMockCanvas(100, 60), preset: getPreset('basic'), width: 100, height: 60, autoStart: false });
    for (const id of Object.keys(pluginCatalog)) {
      const defs = engine.describePluginParams(id);
      expect(defs.length, `${id} declares params`).toBeGreaterThan(0);
      for (const d of defs) {
        expect(d.default, `${id}.${d.name}`).toBeGreaterThanOrEqual(d.min);
        expect(d.default, `${id}.${d.name}`).toBeLessThanOrEqual(d.max);
      }
    }
    engine.destroy();
  });

  it('params change the output', () => {
    const spiral = new SpiralPattern();
    const ctx = { grid: { cells: [], cols: 1, rows: 1, time: 0, width: 1, height: 1 }, glyphSet: ['.'], time: 1, dt: 0.016, speed: 1, getControl: () => 1 };
    const before = spiral.sample(0.3, 0.7, ctx);
    spiral.setParams({ arms: 7, twist: 20 });
    expect(spiral.sample(0.3, 0.7, ctx)).not.toBe(before);

    const glitch = new Glitch();
    glitch.setParams({ rate: 0 });
    const cells = [{ char: 'x', brightness: 0.5 }] as never;
    glitch.update({ grid: { cells, cols: 1, rows: 1, time: 0, width: 1, height: 1 }, glyphSet: ['.'], speed: 1, glitchAmount: 1, trailAmount: 0, dt: 0.016, time: 0 });
    expect((cells as { char: string }[])[0].char).toBe('x');
  });
});

describe('params through presets and the engine', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function run(preset: unknown) {
    vi.unstubAllGlobals();
    frames = stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(200, 120), preset: preset as never, width: 200, height: 120, autoStart: true });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    frames.advanceFrames(3);
    const fp = gridFingerprint(engine.getRendererManager().getGridState(0).cells);
    engine.destroy();
    return fp;
  }

  it('a preset with params renders differently from the same preset without them, and resets on the next preset', () => {
    const base = { id: 'p', name: 'P', glyphSet: ['.', ':', '#'], plugins: [{ id: 'spiral', type: 'pattern' as const }], pattern: { spiralAmount: 0.8 } };
    const tuned = { ...base, id: 'p2', plugins: [{ id: 'spiral', type: 'pattern' as const, params: { arms: 6, twist: 20 } }] };
    expect(run(base)).not.toBe(run(tuned));

    const engine = new AsciiEngine({ canvas: createMockCanvas(200, 120), preset: tuned, width: 200, height: 120, autoStart: false });
    expect(engine.getPluginParams('spiral')).toMatchObject({ arms: 6, twist: 20 });
    engine.setPreset(base);
    expect(engine.getPluginParams('spiral')).toMatchObject({ arms: 3, twist: 8 });
    engine.destroy();
  });

  it('setPluginParams clamps, emits plugin, and exportPreset carries only the changes', () => {
    const engine = new AsciiEngine({ canvas: createMockCanvas(200, 120), preset: getPreset('glyphCrtTerminal'), width: 200, height: 120, autoStart: false });
    const events: string[] = [];
    engine.on('plugin', (e) => events.push(e.id));
    engine.setPluginParams('scanline', { spacing: 0.06, staticAmount: 5 });
    engine.setPluginParams('nope', { x: 1 });
    expect(engine.getPluginParams('scanline')).toMatchObject({ spacing: 0.06, staticAmount: 1, lineWidth: 0.35 });
    expect(events).toEqual(['scanline']);

    const out = exportPreset(engine);
    const scanline = out.plugins?.find((p) => p.id === 'scanline');
    expect(scanline?.params).toEqual({ spacing: 0.06, staticAmount: 1 });
    expect(out.plugins?.find((p) => p.id === 'glitch')?.params).toBeUndefined();
    expect(validatePreset(out).ok).toBe(true);
    engine.destroy();
  });

  it('validation rejects non numeric params', () => {
    const r = validatePreset({ id: 'x', name: 'X', glyphSet: ['.'], plugins: [{ id: 'spiral', type: 'pattern', params: { arms: 'many' } }] });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/params\.arms must be a finite number/);
    const r2 = validatePreset({ id: 'x', name: 'X', glyphSet: ['.'], plugins: [{ id: 'spiral', type: 'pattern', params: 3 }] });
    expect(r2.errors.join()).toMatch(/params must be an object/);
  });
});
