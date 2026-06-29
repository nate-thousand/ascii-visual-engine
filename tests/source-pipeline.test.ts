import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SourceManager,
  SourceSampler,
  ImageSource,
  WebcamSource,
  mapNormalizedToSource,
  mapBrightnessToGlyph,
  pixelBrightness,
  pixelEdge,
  pixelContrast,
} from '../src/sources';
import type { SourceContext } from '../src/sources';

function createImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
}

describe('SourceSampler', () => {
  const sampler = new SourceSampler();

  it('maps brightness to glyph set', () => {
    const glyphs = [' ', '.', '#'];
    expect(mapBrightnessToGlyph(0, glyphs)).toBe(' ');
    expect(mapBrightnessToGlyph(1, glyphs)).toBe('#');
  });

  it('samples pixel brightness from ImageData', () => {
    const img = createImageData(2, 2, () => [255, 255, 255]);
    expect(pixelBrightness(img.data, 0)).toBeCloseTo(1, 2);
  });

  it('computes edge strength between neighbors', () => {
    const img = createImageData(3, 3, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
    expect(pixelEdge(img.data, 3, 3, 1, 1)).toBeGreaterThan(0);
  });

  it('computes local contrast', () => {
    const img = createImageData(3, 3, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
    expect(pixelContrast(img.data, 3, 3, 1, 1)).toBeGreaterThan(0);
  });

  it('maps normalized coords with fit mode', () => {
    const mapped = mapNormalizedToSource(0.5, 0.5, 'fit', 100, 50, 80, 40);
    expect(mapped.inBounds).toBe(true);
    expect(mapped.sx).toBeGreaterThanOrEqual(0);
    expect(mapped.sy).toBeGreaterThanOrEqual(0);
  });

  it('applies source samples to grid cells', () => {
    const img = createImageData(4, 4, (x, y) => {
      const v = Math.floor(((x + y) / 6) * 255);
      return [v, v, v];
    });

    const grid = {
      cells: [
        { x: 0, y: 0, char: ' ', brightness: 0, phase: 0 },
        { x: 1, y: 0, char: ' ', brightness: 0, phase: 0 },
        { x: 0, y: 1, char: ' ', brightness: 0, phase: 0 },
        { x: 1, y: 1, char: ' ', brightness: 0, phase: 0 },
      ],
    };

    sampler.applyToGrid(img, grid, 2, 2, [' ', '.', '#'], 'stretch', 2, 2);
    const chars = new Set(grid.cells.map((c) => c.char));
    expect(chars.size).toBeGreaterThan(1);
  });
});

describe('SourceManager', () => {
  let manager: SourceManager;

  beforeEach(() => {
    manager = new SourceManager();
    manager.registerSource(new ImageSource());
    manager.registerSource(new WebcamSource());
  });

  afterEach(() => {
    manager.destroy();
  });

  it('registers and retrieves sources', () => {
    expect(manager.getSource('image')).toBeDefined();
    expect(manager.getSourceByType('image')?.type).toBe('image');
  });

  it('switches between procedural and source mode', () => {
    manager.setActiveSource('image');
    expect(manager.getMode()).toBe('source');
    manager.setMode('procedural');
    expect(manager.getMode()).toBe('procedural');
    expect(manager.getActiveSource()).toBeUndefined();
  });

  it('returns debug state', () => {
    manager.setActiveSource('image');
    const debug = manager.getDebugState();
    expect(debug.mode).toBe('source');
    expect(debug.activeSourceId).toBe('image');
    expect(debug.ready).toBe(false);
  });
});

describe('WebcamSource', () => {
  it('fails gracefully when camera API is unavailable', async () => {
    const source = new WebcamSource();
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    await source.load({});
    expect(source.isReady()).toBe(false);
    expect(source.getError()).toContain('not available');

    Object.defineProperty(navigator, 'mediaDevices', {
      value: original,
      configurable: true,
    });
    source.destroy();
  });

  it('fails gracefully when permission is denied', async () => {
    const source = new WebcamSource();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
      },
      configurable: true,
    });

    await source.load({});
    expect(source.isReady()).toBe(false);
    expect(source.getError()).toContain('permission denied');
    source.destroy();
  });
});

describe('ImageSource sample', () => {
  it('returns zero sample when not ready', () => {
    const source = new ImageSource();
    const ctx = {
      cols: 4,
      rows: 4,
      getControl: () => 1,
    } as unknown as SourceContext;
    const sample = source.sample(0, 0, ctx);
    expect(sample.brightness).toBe(0);
    source.destroy();
  });
});
