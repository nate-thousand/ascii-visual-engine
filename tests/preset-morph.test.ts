import { describe, it, expect, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { PresetMorph, NO_MORPH, resolveEasing } from '../src/core/PresetMorph';
import type { AsciiPreset, MorphState } from '../src';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

const CALM: AsciiPreset = {
  id: 'calm',
  name: 'Calm',
  glyphSet: ['.', ':', '-', '='],
  plugins: [{ id: 'trails', type: 'effect' }],
  density: 1,
  speed: 0.4,
  trailAmount: 0.2,
  glitchAmount: 0,
  motion: { behaviors: [{ id: 'breathing', weight: 1 }], amplitude: 0.2, frequency: 0.5 },
};

const WILD: AsciiPreset = {
  id: 'wild',
  name: 'Wild',
  glyphSet: ['#', '@', '%', '&'],
  plugins: [
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
  ],
  density: 1.4,
  speed: 1.6,
  trailAmount: 0.8,
  glitchAmount: 0.6,
  motion: { behaviors: [{ id: 'pulse', weight: 1 }], amplitude: 1, frequency: 2 },
  post: { passes: [{ id: 'feedback', enabled: true, amount: 0.5 }], postFeedback: 0.5 },
};

function makeEngine(preset: AsciiPreset = CALM) {
  vi.unstubAllGlobals();
  const clock = stubAnimationFrame();
  const engine = new AsciiEngine({
    canvas: createMockCanvas(240, 160),
    preset,
    width: 240,
    height: 160,
    autoStart: false,
    seed: 1,
    fixedTimestep: 10,
  });
  engine.getPerformanceManager().setAdaptiveQuality(false);
  engine.start();
  return { engine, clock };
}

describe('PresetMorph', () => {
  it('blends every target control from its current value and switches at switchAt', () => {
    const morph = new PresetMorph('a', 'b', { x: 0, y: 10 }, { x: 1, y: 0, z: 5 }, { duration: 1, easing: 'linear', switchAt: 0.5 });
    expect(morph.controls().sort()).toEqual(['x', 'y', 'z']);
    let step = morph.advance(0.25);
    expect(step.values).toEqual({ x: 0.25, y: 7.5, z: 5 });
    expect(step.switchNow).toBe(false);
    expect(step.done).toBe(false);
    step = morph.advance(0.25);
    expect(step.switchNow).toBe(true);
    expect(morph.getState().switched).toBe(true);
    step = morph.advance(0.25);
    expect(step.switchNow).toBe(false);
    step = morph.advance(1);
    expect(step.values).toEqual({ x: 1, y: 0, z: 5 });
    expect(step.done).toBe(true);
    expect(morph.getState().active).toBe(false);
    expect(morph.advance(1).done).toBe(true);
  });

  it('release, exclude, zero duration, easing', () => {
    const morph = new PresetMorph('a', 'b', { x: 0, y: 0 }, { x: 1, y: 1 }, { duration: 2, easing: 'linear', exclude: ['y'] });
    expect(morph.controls()).toEqual(['x']);
    morph.release('x');
    expect(morph.advance(1).values).toEqual({});

    const instant = new PresetMorph('a', 'b', { x: 0 }, { x: 1 }, { duration: 0 });
    const step = instant.advance(0);
    expect(step).toEqual({ values: { x: 1 }, switchNow: true, done: true });

    expect(resolveEasing('linear')(0.3)).toBeCloseTo(0.3);
    expect(resolveEasing('easeIn')(0.5)).toBeCloseTo(0.25);
    expect(resolveEasing('easeOut')(0.5)).toBeCloseTo(0.75);
    expect(resolveEasing('easeInOut')(0.5)).toBeCloseTo(0.5);
    expect(resolveEasing('easeInOut')(1)).toBe(1);
    expect(resolveEasing((t) => t * 2)(0.5)).toBe(1);
    expect(resolveEasing(undefined)(0.25)).toBeCloseTo(0.125);
  });
});

describe('engine.morphTo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('interpolates controls per frame, switches structure midway, and lands exactly on the target', async () => {
    const { engine, clock } = makeEngine();
    const events: MorphState[] = [];
    engine.on('morph', (s) => events.push(s));

    // 10 fps fixed timestep: a one second morph is ten frames.
    const done = engine.morphTo(WILD, { duration: 1, easing: 'linear' });
    expect(engine.getMorphState()).toMatchObject({ active: true, from: 'calm', to: 'wild', progress: 0 });

    clock.advanceFrames(3);
    expect(engine.getControl('speed')).toBeCloseTo(0.4 + (1.6 - 0.4) * 0.3);
    expect(engine.getControl('glitchAmount')).toBeCloseTo(0.18);
    expect(engine.getControl('amplitude')).toBeCloseTo(0.2 + 0.8 * 0.3);
    // The structure is still the source look.
    expect(engine.getPreset().id).toBe('calm');
    expect(engine.getPlugin('glitch')?.enabled).toBe(false);
    expect(engine.getEnabledMotions().map((m) => m.id)).toEqual(['breathing']);
    expect(engine.getMorphState().switched).toBe(false);

    clock.advanceFrames(2);
    // At 0.5 the target's structure is in and the blended values survived setPreset.
    expect(engine.getPreset().id).toBe('wild');
    expect(engine.getPlugin('glitch')?.enabled).toBe(true);
    expect(engine.getEnabledMotions().map((m) => m.id)).toEqual(['pulse']);
    expect(engine.getPostProcessor().getEnabled().map((p) => p.id)).toEqual(['feedback']);
    expect(engine.getControl('speed')).toBeCloseTo(1.0);
    expect(engine.getControl('glitchAmount')).toBeCloseTo(0.3);
    expect(engine.getMorphState().switched).toBe(true);

    clock.advanceFrames(5);
    expect(await done).toBe(true);
    expect(engine.getMorphState()).toEqual(NO_MORPH);

    // End state equals a plain setPreset(WILD) for every control.
    const reference = makeEngine(WILD).engine;
    for (const name of ['density', 'speed', 'trailAmount', 'glitchAmount', 'amplitude', 'frequency', 'postFeedback', 'symmetry']) {
      expect(engine.getControl(name), name).toBe(reference.getControl(name));
    }
    expect(engine.getRendererManager().getGridState(0).cols).toBe(reference.getRendererManager().getGridState(0).cols);
    reference.destroy();

    expect(events.map((e) => [e.active, e.switched, e.progress])).toEqual([
      [true, false, 0],
      [true, true, 0.5],
      [false, true, 1],
    ]);
    engine.destroy();
  });

  it('accepts a built in id, leaves source and performance controls alone, and honors exclude', async () => {
    const { engine, clock } = makeEngine();
    engine.setControl('sourceBlend', 0.25);
    engine.setControl('fpsTarget', 30);
    const trailBefore = engine.getControl('trailAmount');
    const done = engine.morphTo('glyphCrtTerminal', { duration: 0.5, exclude: ['trailAmount'] });
    expect(engine.getMorphState().to).toBe('glyphCrtTerminal');
    clock.advanceFrames(6);
    expect(await done).toBe(true);
    expect(engine.getPreset().id).toBe('glyphCrtTerminal');
    expect(engine.getControl('sourceBlend')).toBe(0.25);
    expect(engine.getControl('fpsTarget')).toBe(30);
    expect(engine.getControl('trailAmount')).toBe(trailBefore);
    engine.destroy();
  });

  it('an unknown id warns and resolves false without touching anything', async () => {
    const { engine } = makeEngine();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await engine.morphTo('nope')).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
    expect(engine.getMorphState().active).toBe(false);
    expect(engine.getPreset().id).toBe('calm');
    warn.mockRestore();
    engine.destroy();
  });

  it('a host setControl during the morph takes that control out of the blend', () => {
    const { engine, clock } = makeEngine();
    engine.morphTo(WILD, { duration: 1, easing: 'linear' });
    clock.advanceFrames(2);
    engine.setControl('speed', 3);
    clock.advanceFrames(2);
    expect(engine.getControl('speed')).toBe(3);
    expect(engine.getControl('glitchAmount')).toBeCloseTo(0.24);
    clock.advanceFrames(10);
    expect(engine.getControl('speed')).toBe(3);
    expect(engine.getControl('glitchAmount')).toBeCloseTo(0.6);
    engine.destroy();
  });

  it('cancelMorph, setPreset, and a second morphTo cancel the running one', async () => {
    const { engine, clock } = makeEngine();
    const first = engine.morphTo(WILD, { duration: 1, easing: 'linear' });
    clock.advanceFrames(2);
    const speedAt = engine.getControl('speed');
    engine.cancelMorph();
    expect(await first).toBe(false);
    expect(engine.getMorphState().active).toBe(false);
    clock.advanceFrames(3);
    expect(engine.getControl('speed')).toBe(speedAt);
    expect(engine.getPreset().id).toBe('calm');

    const second = engine.morphTo(WILD, { duration: 1 });
    engine.setPreset(CALM);
    expect(await second).toBe(false);
    expect(engine.getControl('speed')).toBe(0.4);

    const third = engine.morphTo(WILD, { duration: 1 });
    const fourth = engine.morphTo(CALM, { duration: 0.2 });
    expect(await third).toBe(false);
    expect(engine.getMorphState().to).toBe('calm');
    clock.advanceFrames(3);
    expect(await fourth).toBe(true);
    engine.destroy();
  });

  it('switchAt 0 switches on the first frame, switchAt 1 at the end; destroy cancels', async () => {
    const early = makeEngine();
    early.engine.morphTo(WILD, { duration: 1, switchAt: 0 });
    early.clock.advanceFrames(1);
    expect(early.engine.getPreset().id).toBe('wild');
    expect(early.engine.getControl('speed')).toBeLessThan(1);
    early.engine.destroy();

    const late = makeEngine();
    const done = late.engine.morphTo(WILD, { duration: 1, switchAt: 1 });
    late.clock.advanceFrames(9);
    expect(late.engine.getPreset().id).toBe('calm');
    late.clock.advanceFrames(1);
    expect(late.engine.getPreset().id).toBe('wild');
    expect(await done).toBe(true);
    late.engine.destroy();

    const killed = makeEngine();
    const pending = killed.engine.morphTo(WILD, { duration: 1 });
    killed.engine.destroy();
    expect(await pending).toBe(false);
  });

  it('is reachable from the facade', async () => {
    vi.unstubAllGlobals();
    const clock = stubAnimationFrame();
    const handle = createEngine(createMockCanvas(240, 160), { preset: CALM, width: 240, height: 160, seed: 1, fixedTimestep: 10 });
    handle.engine.getPerformanceManager().setAdaptiveQuality(false);
    const done = handle.morphTo('glyphMinimalZen', { duration: 0.3 });
    expect(handle.getMorphState().active).toBe(true);
    clock.advanceFrames(4);
    expect(await done).toBe(true);
    expect(handle.getPreset().id).toBe('glyphMinimalZen');
    handle.cancelMorph();
    handle.destroy();
  });
});
