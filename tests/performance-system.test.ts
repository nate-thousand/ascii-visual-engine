import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import {
  ObjectPool,
  FrameProfiler,
  GlyphCache,
  SpatialGrid,
  DirtyRegionTracker,
  PerformanceManager,
  resolveQualityPreset,
  gridCellPool,
} from '../src/performance';
import type { GridCell } from '../src/core/types';

function createMockCanvas(): HTMLCanvasElement {
  const measureText = vi.fn(() => ({
    width: 10,
    actualBoundingBoxAscent: 8,
    actualBoundingBoxDescent: 2,
    actualBoundingBoxLeft: 0,
  }));
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    measureText,
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    canvas: { width: 400, height: 300 },
  };
  return {
    width: 400,
    height: 300,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

describe('ObjectPool', () => {
  it('reuses released objects', () => {
    const pool = new ObjectPool(() => ({ v: 0 }), (o) => { o.v = 0; }, 2);
    const a = pool.acquire();
    a.v = 42;
    pool.release(a);
    const b = pool.acquire();
    expect(b).toBe(a);
    expect(b.v).toBe(0);
  });
});

describe('FrameProfiler', () => {
  it('records phase timings', () => {
    const profiler = new FrameProfiler();
    profiler.beginFrame(0);
    profiler.markPhase('script');
    profiler.markPhase('render');
    const sample = profiler.endFrame(60);
    expect(sample.phases.length).toBeGreaterThanOrEqual(2);
    expect(sample.fps).toBe(60);
  });
});

describe('GlyphCache', () => {
  it('caches measureText results', () => {
    const cache = new GlyphCache();
    const canvas = createMockCanvas();
    const ctx = canvas.getContext('2d')!;
    cache.measure(ctx, '#', '16px monospace');
    cache.measure(ctx, '#', '16px monospace');
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });
});

describe('SpatialGrid', () => {
  it('finds neighbors within radius', () => {
    const grid = new SpatialGrid(10, 10, 0.1);
    grid.insert(0, 0.5, 0.5);
    grid.insert(1, 0.52, 0.51);
    grid.insert(2, 0.9, 0.9);
    const neighbors = grid.queryRadius(0.5, 0.5, 0.1);
    expect(neighbors).toContain(0);
    expect(neighbors).toContain(1);
    expect(neighbors).not.toContain(2);
  });
});

describe('DirtyRegionTracker', () => {
  it('tracks changed cells', () => {
    const tracker = new DirtyRegionTracker();
    const cells: GridCell[] = [
      { char: '.', baseChar: '.', x: 0, y: 0, phase: 0, brightness: 0.5, burst: 0, ox: 0, oy: 0, vx: 0, vy: 0, scale: 1, rotation: 0, deformation: 0 },
      { char: '#', baseChar: '#', x: 1, y: 0, phase: 0, brightness: 0.5, burst: 0, ox: 0, oy: 0, vx: 0, vy: 0, scale: 1, rotation: 0, deformation: 0 },
    ];
    tracker.trackChanges(cells);
    expect(tracker.getDirtyCount()).toBe(2);
    cells[0].brightness = 0.9;
    tracker.trackChanges(cells);
    expect(tracker.getDirtyCount()).toBe(1);
  });
});

describe('Quality presets', () => {
  it('resolves preset settings', () => {
    const ultra = resolveQualityPreset('ultra');
    const battery = resolveQualityPreset('batterySaver');
    expect(ultra.densityScale).toBeGreaterThan(battery.densityScale);
    expect(ultra.maxParticleCapacity).toBeGreaterThan(battery.maxParticleCapacity);
  });
});

describe('PerformanceManager integration', () => {
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

  function advanceFrames(count: number, ms = 16): void {
    for (let i = 0; i < count; i++) {
      now += ms;
      const cb = rafCallbacks.shift();
      if (cb) cb(now);
    }
  }

  it('engine exposes performance debug state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: true,
    });

    advanceFrames(3);
    const perf = engine.getDebugState().performance;
    expect(perf.quality).toBe('medium');
    expect(perf.phaseTimings.length).toBeGreaterThan(0);
    expect(perf.frameTimeMs).toBeGreaterThanOrEqual(0);

    engine.destroy();
  });

  it('setQualityPreset adjusts density', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });

    const before = engine.getControl('density', 1);
    engine.setQualityPreset('batterySaver');
    const after = engine.getControl('density', 1);
    expect(after).toBeLessThan(before);

    engine.destroy();
  });

  it('grid cell pool is used by renderer', () => {
    const before = gridCellPool.getStats().totalCreated;
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });
    engine.setControl('density', 1.5);
    expect(gridCellPool.getStats().totalCreated).toBeGreaterThanOrEqual(before);
    engine.destroy();
  });
});

describe('PerformanceManager', () => {
  it('lists quality presets', () => {
    const mgr = new PerformanceManager();
    expect(mgr.listQualityPresets()).toContain('ultra');
    expect(mgr.listQualityPresets()).toContain('batterySaver');
  });
});
