import { describe, it, expect, afterEach, vi } from 'vitest';
import { Random, deriveSeed, hashString, normalizeSeed } from '../src/core/Random';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { buildSceneDocument } from '../src/export/JsonExporter';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

describe('Random', () => {
  it('is reproducible per seed, uniform in [0, 1), and different across seeds and names', () => {
    const a = new Random(42);
    const b = new Random(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(seqA).size).toBeGreaterThan(45);
    expect(Array.from({ length: 50 }, () => new Random(43).next())).not.toEqual(seqA);
    expect(Array.from({ length: 5 }, () => new Random('bloom').next())).toEqual(Array.from({ length: 5 }, () => new Random('bloom').next()));
    expect(new Random(1).fork('glitch').next()).not.toBe(new Random(1).fork('burst').next());
    expect(new Random(1).fork('glitch').next()).toBe(new Random(1).fork('glitch').next());
  });

  it('helpers: range, int, reseed, hashing', () => {
    const r = new Random(9);
    for (let i = 0; i < 100; i++) {
      const v = r.range(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
      const n = r.int(3);
      expect([0, 1, 2]).toContain(n);
    }
    const first = new Random(5).next();
    r.reseed(5);
    expect(r.next()).toBe(first);
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(normalizeSeed('x')).toBe(hashString('x'));
    expect(normalizeSeed(Number.NaN)).toBe(0);
    expect(deriveSeed(1, 'a')).not.toBe(deriveSeed(2, 'a'));
  });

  it('a mean near one half over many draws', () => {
    const r = new Random(2024);
    let sum = 0;
    for (let i = 0; i < 20000; i++) sum += r.next();
    expect(sum / 20000).toBeGreaterThan(0.49);
    expect(sum / 20000).toBeLessThan(0.51);
  });
});

/** A preset that uses every seeded subsystem at once. */
const NOISY = {
  id: 'noisy',
  name: 'Noisy',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#', '@'],
  plugins: [
    { id: 'glitch', type: 'effect' as const },
    { id: 'burst', type: 'effect' as const },
    { id: 'trails', type: 'effect' as const },
  ],
  glitchAmount: 0.4,
  motion: { behaviors: [{ id: 'brownian', weight: 1 }], randomness: 0.8 },
  simulation: { behaviors: [{ id: 'particle' }], simSpawnRate: 0.9 },
  glyphs: { language: 'corruptedBroadcast' },
};

function runFrames(opts: { seed?: number | string; frames?: number; fixedTimestep?: number | null; presetId?: string; burst?: boolean }) {
  vi.unstubAllGlobals();
  const clock = stubAnimationFrame();
  const engine = new AsciiEngine({
    canvas: createMockCanvas(240, 160),
    preset: NOISY,
    width: 240,
    height: 160,
    autoStart: false,
    seed: opts.seed,
    fixedTimestep: opts.fixedTimestep ?? 60,
  });
  engine.getPerformanceManager().setAdaptiveQuality(false);
  engine.start();
  if (opts.burst) engine.noteOn({});
  clock.advanceFrames(opts.frames ?? 12, 16 + (opts.seed === 'jitter' ? 5 : 0));
  const fp = gridFingerprint(engine.getRendererManager().getGridState(0).cells);
  const particles = engine.getDebugState().simulation.totalParticles;
  const seed = engine.getSeed();
  engine.destroy();
  return { fp, particles, seed };
}

describe('deterministic looks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('same seed and fixed timestep give identical frames; a different seed does not', () => {
    const a = runFrames({ seed: 'show-night', burst: true });
    const b = runFrames({ seed: 'show-night', burst: true });
    const c = runFrames({ seed: 'rehearsal', burst: true });
    expect(a.fp).toBe(b.fp);
    expect(a.particles).toBeGreaterThan(0);
    expect(c.fp).not.toBe(a.fp);
  });

  it('without a seed two engines differ; with a seed the wall clock no longer matters', () => {
    const a = runFrames({});
    const b = runFrames({});
    expect(a.seed).not.toBe(b.seed);

    // Fixed timestep: irregular frame gaps still produce the same frames.
    vi.unstubAllGlobals();
    const clock = stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(240, 160), preset: NOISY, width: 240, height: 160, autoStart: false, seed: 3, fixedTimestep: 60 });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    engine.start();
    for (let i = 0; i < 12; i++) clock.advanceFrames(1, i % 2 ? 9 : 31);
    const irregular = gridFingerprint(engine.getRendererManager().getGridState(0).cells);
    engine.destroy();
    expect(irregular).toBe(runFrames({ seed: 3 }).fp);
  });

  it('setSeed restarts every stream and the scene document carries the seed', () => {
    vi.unstubAllGlobals();
    const clock = stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(240, 160), preset: NOISY, width: 240, height: 160, autoStart: true, seed: 11, fixedTimestep: 60 });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    clock.advanceFrames(6);
    const glitch = engine.getRandom('glitch');
    const before = glitch.next();
    engine.setSeed(11);
    expect(engine.getRandom('glitch')).toBe(glitch);
    // Reseeded in place: the stream starts over.
    const fresh = new Random(11).fork('glitch').next();
    expect(glitch.next()).toBe(fresh);
    expect(before).not.toBe(fresh);
    expect(engine.getDebugState().seed).toBe(11);
    expect(engine.getDebugState().fixedTimestep).toBe(60);

    const doc = buildSceneDocument(engine);
    expect(doc.seed).toBe(11);
    engine.setSeed('other');
    engine.applySceneDocument(doc);
    expect(engine.getSeed()).toBe(11);
    engine.destroy();
  });

  it('the facade exposes seed and timestep', () => {
    stubAnimationFrame();
    const handle = createEngine(createMockCanvas(100, 60), { width: 100, height: 60, autoStart: false, seed: 'x', fixedTimestep: 30 });
    expect(handle.getSeed()).toBe(new Random('x').getSeed());
    expect(handle.engine.getFixedTimestep()).toBe(30);
    handle.setFixedTimestep(null);
    expect(handle.engine.getFixedTimestep()).toBeNull();
    handle.setSeed(5);
    expect(handle.getSeed()).toBe(5);
    handle.destroy();
  });
});
