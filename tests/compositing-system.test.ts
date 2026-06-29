import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { compositingPreset } from '../src/presets/compositing';
import {
  LayerManager,
  PostProcessor,
  blendBrightness,
  compositeCell,
  BLEND_MODES,
  Mask,
} from '../src/compositing';
import type { GridCell } from '../src/core/types';

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    canvas: { width, height },
  };
  return {
    width,
    height,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

function makeCell(x: number, y: number, brightness: number): GridCell {
  return { x, y, char: '.', brightness, phase: brightness, burst: 0 };
}

describe('BlendModes', () => {
  it('blendBrightness produces distinct results per mode', () => {
    const results = BLEND_MODES.map((mode) => blendBrightness(mode, 0.5, 0.8, 1));
    const unique = new Set(results.map((v) => v.toFixed(3)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('compositeCell applies mask opacity', () => {
    const dst = makeCell(0, 0, 0.2);
    const src = makeCell(0, 0, 1);
    compositeCell('add', dst, src, 1, 0, [' ', '#']);
    expect(dst.brightness).toBeCloseTo(0.2, 2);

    compositeCell('add', dst, src, 1, 1, [' ', '#']);
    expect(dst.brightness).toBeGreaterThan(0.2);
  });
});

describe('Mask', () => {
  const grid = {
    cols: 10,
    rows: 10,
    cells: Array.from({ length: 100 }, (_, i) =>
      makeCell(i % 10, Math.floor(i / 10), (i % 10) / 10),
    ),
  };

  it('radial mask fades toward edges', () => {
    const mask = new Mask({ type: 'radial', amount: 1, centerX: 0.5, centerY: 0.5 });
    const center = mask.sample(5, 5, grid);
    const corner = mask.sample(0, 0, grid);
    expect(center).toBeGreaterThan(corner);
  });

  it('noise mask varies across grid', () => {
    const mask = new Mask({ type: 'noise', amount: 1 });
    const a = mask.sample(1, 1, grid);
    const b = mask.sample(7, 3, grid);
    expect(a).not.toBeCloseTo(b, 1);
  });

  it('brightness mask tracks source brightness', () => {
    const mask = new Mask({ type: 'brightness', amount: 1 });
    expect(mask.sample(0, 0, grid, 0.1)).toBeLessThan(mask.sample(9, 0, grid, 0.9));
  });
});

describe('LayerManager', () => {
  it('adds, removes, enables, disables, and reorders layers', () => {
    const manager = new LayerManager();
    manager.addLayer({ id: 'a', opacity: 1 });
    manager.addLayer({ id: 'b', opacity: 0.5 });
    expect(manager.getAll()).toHaveLength(2);

    manager.disableLayer('a');
    expect(manager.getEnabled()).toHaveLength(1);

    manager.enableLayer('a');
    manager.reorderLayer('b', 0);
    expect(manager.getAll()[0].id).toBe('b');

    manager.removeLayer('a');
    expect(manager.getAll()).toHaveLength(1);
  });
});

describe('PostProcessor', () => {
  it('registers default passes', () => {
    const processor = new PostProcessor();
    expect(processor.getAll().length).toBe(9);
    processor.destroy();
  });

  it('threshold pass binarizes brightness', () => {
    const processor = new PostProcessor();
    processor.enablePass('threshold');
    const grid = {
      cols: 4,
      rows: 4,
      cells: Array.from({ length: 16 }, (_, i) =>
        makeCell(i % 4, Math.floor(i / 4), i < 8 ? 0.2 : 0.8),
      ),
    };
    processor.process(grid, [' ', '.', '#'], 0, 0.016, () => 0.5);
    const low = grid.cells[0].brightness;
    const high = grid.cells[15].brightness;
    expect(low).toBe(0);
    expect(high).toBe(1);
    processor.destroy();
  });

  it('feedback pass blends with previous frame', () => {
    const processor = new PostProcessor();
    processor.enablePass('feedback');
    const grid = {
      cols: 2,
      rows: 2,
      cells: [makeCell(0, 0, 1), makeCell(1, 0, 1), makeCell(0, 1, 1), makeCell(1, 1, 1)],
    };
    processor.process(grid, [' ', '#'], 0, 0.016, () => 0.9);
    for (const cell of grid.cells) cell.brightness = 0;
    processor.process(grid, [' ', '#'], 0.016, 0.016, () => 0.9);
    expect(grid.cells[0].brightness).toBeGreaterThan(0);
    processor.destroy();
  });
});

describe('AsciiEngine compositing integration', () => {
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

  function advanceFrames(count: number, msPerFrame = 16): void {
    for (let i = 0; i < count; i++) {
      now += msPerFrame;
      const cb = rafCallbacks.shift();
      if (!cb) break;
      cb(now);
    }
  }

  it('loads compositing preset layers and post passes', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: compositingPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getLayerManager().getEnabled().length).toBe(3);
    expect(engine.getPostProcessor().getEnabled().length).toBe(2);
    engine.destroy();
  });

  it('basic preset has no compositing active by default', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getLayerManager().isCompositingActive()).toBe(false);
    expect(engine.getPostProcessor().isActive()).toBe(false);
    engine.destroy();
  });

  it('getDebugState includes compositing and postProcessing', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: compositingPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    advanceFrames(2);
    const state = engine.getDebugState();
    expect(state.compositing.enabledCount).toBe(3);
    expect(state.postProcessing.enabledPasses).toContain('feedback');
    engine.destroy();
  });

  it('resetComposition restores preset layers', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: compositingPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.getLayerManager().clear();
    expect(engine.getLayerManager().getAll()).toHaveLength(0);
    engine.resetComposition();
    expect(engine.getLayerManager().getEnabled().length).toBe(3);
    engine.destroy();
  });
});
