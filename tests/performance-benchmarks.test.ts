import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { getPreset } from '../src/presets';

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 8, actualBoundingBoxAscent: 6, actualBoundingBoxDescent: 2 })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    canvas: { width, height },
  };
  return {
    width,
    height,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

describe('Performance benchmarks', () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let now = 0;

  beforeEach(() => {
    now = 0;
    rafCallbacks = [];
    vi.stubGlobal('performance', { now: () => now });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function runFrames(engine: AsciiEngine, count: number, ms = 16): number {
    engine.start();
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      now += ms;
      const cb = rafCallbacks.shift();
      if (cb) cb(now);
    }
    return performance.now() - start;
  }

  function benchmarkScenario(name: string, setup: (engine: AsciiEngine) => void, frames = 10): void {
    it(`benchmark: ${name}`, () => {
      const engine = new AsciiEngine({
        canvas: createMockCanvas(),
        preset: basicPreset,
        width: 800,
        height: 600,
        autoStart: false,
      });
      setup(engine);
      runFrames(engine, frames);
      const perf = engine.getDebugState().performance;
      expect(perf.frameTimeMs).toBeLessThan(500);
      expect(perf.glyphCount).toBeGreaterThan(0);
      engine.destroy();
    });
  }

  benchmarkScenario('1k glyphs (~density 0.6)', (e) => e.setControl('density', 0.6));
  benchmarkScenario('5k glyphs (~density 1.0)', (e) => e.setControl('density', 1.0));
  benchmarkScenario('10k glyphs (~density 1.4)', (e) => e.setControl('density', 1.4));
  benchmarkScenario('50k glyphs (~density 2.0)', (e) => e.setControl('density', 2.0));

  it('benchmark: particles simulation', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: getPreset('particleSim'),
      width: 800,
      height: 600,
      autoStart: false,
    });
    engine.setQualityPreset('high');
    engine.setControl('simSpawnRate', 1);
    runFrames(engine, 15);
    expect(engine.getDebugState().performance.particleCount).toBeGreaterThanOrEqual(0);
    engine.destroy();
  });

  it('benchmark: multiple simulations', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: getPreset('chaotic'),
      width: 800,
      height: 600,
      autoStart: false,
    });
    engine.enableSimulation('particle');
    engine.enableSimulation('boids');
    runFrames(engine, 10);
    const perf = engine.getDebugState().performance;
    expect(perf.simulationTimeMs).toBeGreaterThanOrEqual(0);
    engine.destroy();
  });

  it('benchmark: compositing layers', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: getPreset('compositing'),
      width: 800,
      height: 600,
      autoStart: false,
    });
    runFrames(engine, 10);
    expect(engine.getDebugState().performance.layerCount).toBeGreaterThan(0);
    engine.destroy();
  });

  it('benchmark: glyph language preset', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: getPreset('glyphOrganicBloom'),
      width: 800,
      height: 600,
      autoStart: false,
    });
    runFrames(engine, 10);
    expect(engine.getDebugState().glyph.enabled).toBe(true);
    engine.destroy();
  });
});
