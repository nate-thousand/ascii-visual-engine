import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { exportPreset, loadPresetFromUrl, parsePreset, presetToJson } from '../src/presets/presetIO';
import { validatePreset } from '../src/core/validate';
import { getPreset } from '../src/presets';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

function make(presetId: Parameters<typeof getPreset>[0] = 'glyphOrganicBloom') {
  const engine = new AsciiEngine({ canvas: createMockCanvas(320, 240), preset: getPreset(presetId), width: 320, height: 240, autoStart: false });
  engine.getPerformanceManager().setAdaptiveQuality(false);
  return engine;
}

describe('exportPreset', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('captures the composition and every live control at its current value', () => {
    const engine = make();
    engine.setControl('speed', 1.3);
    engine.setControl('symmetry', 9);
    engine.setControl('trailAmount', 0.7);
    engine.enablePlugin('glitch');
    engine.setControl('glitchAmount', 0.25);
    engine.enableMotion('breathing');
    engine.setMotionWeight('breathing', 0.55);

    const out = exportPreset(engine, { id: 'bloom-live', name: 'Bloom Live' });
    expect(out.id).toBe('bloom-live');
    expect(out.name).toBe('Bloom Live');
    expect(out.plugins?.map((p) => p.id).sort()).toEqual(['burst', 'cellular', 'glitch', 'radialSymmetry', 'trails']);
    expect(out.motion?.behaviors?.map((b) => [b.id, b.weight])).toEqual([
      ['organicGrowth', 0.7],
      ['breathing', 0.55],
    ]);
    expect(out.speed).toBe(1.3);
    expect(out.trailAmount).toBe(0.7);
    expect(out.glitchAmount).toBe(0.25);
    expect(out.pattern?.symmetry).toBe(9);
    expect(out.motion?.strength).toBe(0.7);
    expect(out.glyphs?.language).toBe('organicBloom');
    // Only live controls are exported; nothing from simulations or post.
    expect(out.simulation).toBeUndefined();
    expect(out.post).toBeUndefined();
    expect(Object.keys(out.pattern ?? {}).sort()).toEqual(['cellularAmount', 'petals', 'symmetry']);
    expect(out.controls?.map((c) => c.name)).toContain('glitchAmount');
    expect(validatePreset(out).ok).toBe(true);
    engine.destroy();
  });

  it('round trips: applying the export reproduces the frames', () => {
    const a = make('glyphCrtTerminal');
    a.setControl('scanlineAmount', 0.35);
    a.setControl('speed', 0.5);
    a.enableMotion('breathing');
    const exported = JSON.parse(presetToJson(exportPreset(a)));
    a.start();
    frames.advanceFrames(4);
    const fpA = gridFingerprint(a.getRendererManager().getGridState(0).cells);
    a.destroy();

    // A fresh clock so both engines see the same dt sequence.
    vi.unstubAllGlobals();
    frames = stubAnimationFrame();
    const b = make('basic');
    b.setPreset(exported);
    expect(b.getEnabledMotions().map((m) => m.id).sort()).toEqual(['breathing', 'organicGrowth']);
    expect(b.getControl('scanlineAmount')).toBe(0.35);
    expect(b.getControl('speed')).toBe(0.5);
    b.start();
    frames.advanceFrames(4);
    expect(gridFingerprint(b.getRendererManager().getGridState(0).cells)).toBe(fpA);
    b.destroy();
  });

  it('a host glyph override exports as a plain glyphSet without a language', () => {
    const engine = make();
    engine.setGlyphSet(['a', 'b', 'c']);
    const out = exportPreset(engine);
    expect(out.glyphSet).toEqual(['a', 'b', 'c']);
    expect(out.glyphs).toBeUndefined();
    engine.destroy();
  });

  it('exports simulations, passes, layers, and their controls', () => {
    const engine = make('compositing');
    engine.enableSimulation('particle');
    engine.setControl('simSpawnRate', 0.9);
    engine.setControl('postFeedback', 0.2);
    const out = exportPreset(engine);
    expect(out.simulation?.behaviors?.map((s) => s.id)).toEqual(['particle']);
    expect(out.simulation?.simSpawnRate).toBe(0.9);
    expect(out.post?.passes?.map((p) => p.id)).toEqual(['feedback', 'smear']);
    expect(out.post?.postFeedback).toBe(0.2);
    expect(out.layers?.map((l) => l.id)).toEqual(['base', 'overlay', 'accent']);
    expect(out.layers?.[1]).toMatchObject({ blendMode: 'add', opacity: 0.65, pattern: 'spiral' });
    engine.destroy();
  });
});

describe('loadPresetFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches, validates, normalizes, and returns the preset', async () => {
    const flat = { id: 'remote', name: 'Remote', glyphSet: ['.', '#'], motionField: 'wave', plugins: [], controls: [], density: 1, speed: 1, trailAmount: 0.3, glitchAmount: 0 };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => flat, url })));
    const preset = await loadPresetFromUrl('https://example.test/remote.json');
    expect(preset.id).toBe('remote');
    expect(preset.motion?.field).toBe('wave');
    expect(preset.controls?.map((c) => c.name)).toEqual(['density', 'speed', 'strength', 'frequency', 'amplitude']);
  });

  it('rejects on HTTP errors, non JSON, and invalid presets with the reasons', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await expect(loadPresetFromUrl('x')).rejects.toThrow(/HTTP 404/);

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad token'); } })));
    await expect(loadPresetFromUrl('x')).rejects.toThrow(/not JSON/);

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'nope', glyphSet: [] }) })));
    await expect(loadPresetFromUrl('x')).rejects.toThrow(/name must be a non-empty string[\s\S]*glyphSet must be/);
  });

  it('the engine applies a loaded preset and leaves the look alone on failure', async () => {
    stubAnimationFrame();
    const handle = createEngine(createMockCanvas(200, 100), { width: 200, height: 100, autoStart: false });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'tiny', name: 'Tiny', glyphSet: ['.', '#'] }) })));
    await handle.loadPresetFromUrl('tiny.json');
    expect(handle.getPreset().id).toBe('tiny');

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'broken' }) })));
    await expect(handle.loadPresetFromUrl('broken.json')).rejects.toThrow();
    expect(handle.getPreset().id).toBe('tiny');
    handle.destroy();
  });

  it('parsePreset validates already parsed JSON', () => {
    expect(parsePreset({ id: 'p', name: 'P', glyphSet: ['.'] }).id).toBe('p');
    expect(() => parsePreset({ id: 'p' }, 'inline')).toThrow(/inline is not a valid preset/);
  });
});
