import { describe, it, expect, afterEach, vi } from 'vitest';
import { SourceSampler, pixelBrightness, pixelCoverage, layoutText, isSvgMarkup, sizeSvgMarkup, TextSource } from '../src/sources';
import type { Source, SourceContext, SourceSample, SourceFitMode } from '../src/sources/Source';
import type { AsciiEngine as Engine } from '../src/core/AsciiEngine';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { getPreset } from '../src/presets';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/** RGBA image from a per pixel function returning [r, g, b, a]. */
function rgba(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y);
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
}

/** A logo: black disc on a transparent ground. */
const BLACK_ON_CLEAR = rgba(8, 8, (x, y) => ((x - 3.5) ** 2 + (y - 3.5) ** 2 <= 6 ? [0, 0, 0, 255] : [0, 0, 0, 0]));

function gridOf(cols: number, rows: number, char = '#', brightness = 0.8) {
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push({ x, y, char, brightness, phase: 0 });
  return { cells };
}

describe('alpha aware sampling', () => {
  it('transparent is background and invert flips the visible content only', () => {
    expect(pixelBrightness(BLACK_ON_CLEAR.data, 0)).toBe(0);
    expect(pixelCoverage(BLACK_ON_CLEAR.data, 0)).toBe(0);
    const center = (3 * 8 + 3) * 4;
    expect(pixelBrightness(BLACK_ON_CLEAR.data, center)).toBe(0);
    expect(pixelBrightness(BLACK_ON_CLEAR.data, center, true)).toBe(1);
    expect(pixelBrightness(BLACK_ON_CLEAR.data, 0, true)).toBe(0);
    const half = rgba(1, 1, () => [255, 255, 255, 128]);
    expect(pixelBrightness(half.data, 0)).toBeCloseTo(128 / 255, 3);
  });

  it('a black logo on transparent is invisible in the ramp until inverted', () => {
    const sampler = new SourceSampler();
    const plain = gridOf(8, 8, '.', 0.5);
    sampler.applyToGrid(BLACK_ON_CLEAR, plain, 8, 8, [' ', '+', '#'], 'stretch', 8, 8, 1, 0, 1, undefined, false);
    expect(plain.cells.every((c) => c.char === ' ' && c.brightness === 0)).toBe(true);

    const inverted = gridOf(8, 8, '.', 0.5);
    sampler.applyToGrid(BLACK_ON_CLEAR, inverted, 8, 8, [' ', '+', '#'], 'stretch', 8, 8, 1, 0, 1, undefined, true);
    const at = (x: number, y: number) => inverted.cells[y * 8 + x];
    expect(at(3, 3).char).toBe('#');
    expect(at(0, 0).char).toBe(' ');
  });
});

describe('mask mode', () => {
  it('keeps the procedural cells inside the shape and blanks or dims the outside', () => {
    const sampler = new SourceSampler();
    const hard = gridOf(8, 8, '@', 0.9);
    sampler.applyMask(BLACK_ON_CLEAR, hard, 8, 8, 'stretch', 8, 8, { invert: true, blend: 1 });
    const at = (g: typeof hard, x: number, y: number) => g.cells[y * 8 + x];
    expect(at(hard, 3, 3)).toMatchObject({ char: '@', brightness: 0.9 });
    expect(at(hard, 0, 0)).toMatchObject({ char: ' ', brightness: 0 });
    expect(hard.cells.filter((c) => c.char === '@').length).toBeGreaterThan(10);
    expect(hard.cells.filter((c) => c.char === ' ').length).toBeGreaterThan(30);

    const soft = gridOf(8, 8, '@', 0.8);
    sampler.applyMask(BLACK_ON_CLEAR, soft, 8, 8, 'stretch', 8, 8, { invert: true, blend: 0.5 });
    expect(at(soft, 3, 3)).toMatchObject({ char: '@', brightness: 0.8 });
    expect(at(soft, 0, 0)).toMatchObject({ char: '@', brightness: 0.4 });

    // Without invert the black disc is below threshold everywhere: the whole frame is outside.
    const none = gridOf(8, 8, '@', 0.8);
    sampler.applyMask(BLACK_ON_CLEAR, none, 8, 8, 'stretch', 8, 8, { blend: 1 });
    expect(none.cells.every((c) => c.char === ' ')).toBe(true);

    // Threshold moves the outline on a soft edge.
    const soft2 = rgba(4, 1, (x) => [255, 255, 255, Math.round((x / 3) * 255)]);
    const low = gridOf(4, 1);
    const high = gridOf(4, 1);
    sampler.applyMask(soft2, low, 4, 1, 'stretch', 4, 1, { threshold: 0.2, smooth: false });
    sampler.applyMask(soft2, high, 4, 1, 'stretch', 4, 1, { threshold: 0.9, smooth: false });
    expect(low.cells.map((c) => c.char).join('')).toBe(' ###');
    expect(high.cells.map((c) => c.char).join('')).toBe('   #');

    // Smooth: a cell just under the threshold fades instead of vanishing.
    const faded = gridOf(4, 1, '#', 1);
    sampler.applyMask(soft2, faded, 4, 1, 'stretch', 4, 1, { threshold: 0.9, softness: 0.3 });
    expect(faded.cells.map((c) => c.char).join('')).toBe('  ##');
    expect(faded.cells[2].brightness).toBeGreaterThan(0);
    expect(faded.cells[2].brightness).toBeLessThan(0.3);
    expect(faded.cells[3].brightness).toBe(1);
  });

  it('area sampling: a stroke thinner than a cell still contributes its share', () => {
    const sampler = new SourceSampler();
    // A 1 px white vertical line at x = 10 in a 40 x 8 image, sampled by 4 x 1 cells (10 px per cell).
    const line = rgba(40, 8, (x) => (x === 10 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    const nearest = gridOf(4, 1, '.', 0);
    sampler.applyToGrid(line, nearest, 4, 1, [' ', '+', '#'], 'stretch', 40, 8, 1, 0, 1, undefined, false, false);
    // Nearest: cell 1 samples x = 13, misses the line entirely.
    expect(nearest.cells.map((c) => c.brightness)).toEqual([0, 0, 0, 0]);

    const smooth = gridOf(4, 1, '.', 0);
    sampler.applyToGrid(line, smooth, 4, 1, [' ', '+', '#'], 'stretch', 40, 8, 1, 0, 1, undefined, false, true);
    expect(smooth.cells[1].brightness).toBeCloseTo(0.1, 5);
    expect(smooth.cells[0].brightness).toBe(0);
    expect(smooth.cells[2].brightness).toBe(0);

    // A full white image averages to 1 everywhere, including the edge cells.
    const white = rgba(40, 8, () => [255, 255, 255, 255]);
    const full = gridOf(4, 1, '.', 0);
    sampler.applyToGrid(white, full, 4, 1, [' ', '#'], 'stretch', 40, 8, 1, 0, 1, undefined, false, true);
    expect(full.cells.map((c) => c.brightness)).toEqual([1, 1, 1, 1]);

    // Half alpha averages to half; inverted, a black opaque image is fully lit.
    const half = rgba(40, 8, () => [255, 255, 255, 128]);
    expect(sampler.areaBrightness(half, 0, 0, 40, 8)).toBeCloseTo(128 / 255, 3);
    const black = rgba(40, 8, () => [0, 0, 0, 255]);
    expect(sampler.areaBrightness(black, 0, 0, 40, 8)).toBe(0);
    expect(sampler.areaBrightness(black, 0, 0, 40, 8, true)).toBe(1);
    // A box hanging past the image edge counts the outside as background.
    expect(sampler.areaBrightness(white, 30, 0, 50, 8)).toBeCloseTo(0.5, 5);
    expect(sampler.areaBrightness(white, 50, 0, 60, 8)).toBe(0);
  });
});

/** A ready source with fixed pixels, the test's stand in for a loaded logo. */
class LogoSource implements Source {
  readonly id = 'logo';
  readonly name = 'Logo';
  readonly type = 'image' as const;
  private fitMode: SourceFitMode = 'stretch';
  constructor(private data: ImageData) {}
  initialize(_engine: Engine): void {}
  async load(): Promise<void> {}
  update(): void {}
  sample(): SourceSample {
    return { brightness: 0, contrast: 0, edge: 0 };
  }
  destroy(): void {}
  isReady(): boolean {
    return true;
  }
  getError(): string | null {
    return null;
  }
  getFitMode(): SourceFitMode {
    return this.fitMode;
  }
  setFitMode(mode: SourceFitMode): void {
    this.fitMode = mode;
  }
  getImageData(): ImageData {
    return this.data;
  }
}

describe('engine mask mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs the procedural look and masks it by the source shape at the end of the frame', () => {
    const clock = stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(400, 300), preset: getPreset('basic'), width: 400, height: 300, autoStart: false, seed: 1 });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    // Left half opaque white, right half transparent.
    const half = rgba(100, 10, (x) => (x < 50 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    engine.getSourceManager().registerSource(new LogoSource(half));
    engine.setActiveSource('logo');
    engine.setControl('sourceMask', 1);
    engine.start();
    clock.advanceFrames(3);

    expect(engine.getDebugState().source.applyMode).toBe('mask');
    const grid = engine.getRendererManager().getGridState(0);
    const left = grid.cells.filter((c) => c.x < grid.cols / 2 - 1);
    const right = grid.cells.filter((c) => c.x > grid.cols / 2);
    expect(right.every((c) => c.char === ' ' && c.brightness === 0)).toBe(true);
    // Inside the shape the pattern is intact: varied glyphs, not a brightness ramp of the source.
    expect(new Set(left.map((c) => c.char)).size).toBeGreaterThan(2);
    expect(left.some((c) => c.brightness > 0)).toBe(true);
    // Both edges of the image are sampled: the last row is not dropped.
    expect(grid.cells.filter((c) => c.y === grid.rows - 1 && c.x < grid.cols / 2 - 1).some((c) => c.char !== ' ')).toBe(true);

    engine.setControl('sourceMask', 0);
    clock.advanceFrames(1);
    expect(engine.getDebugState().source.applyMode).toBe('brightness');
    const ramp = engine.getRendererManager().getGridState(0);
    // Ramp mode: the source's own brightness lands on the cells (glitch may touch a few).
    const leftRamp = ramp.cells.filter((c) => c.x < ramp.cols / 2 - 1);
    const rightRamp = ramp.cells.filter((c) => c.x > ramp.cols / 2);
    expect(leftRamp.filter((c) => c.brightness > 0).length / leftRamp.length).toBeGreaterThan(0.9);
    expect(rightRamp.filter((c) => c.brightness === 0).length / rightRamp.length).toBeGreaterThan(0.9);
    engine.destroy();
  });
});

describe('SVG handling', () => {
  it('recognizes markup and sizes it for rasterizing', () => {
    expect(isSvgMarkup('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(true);
    expect(isSvgMarkup('<?xml version="1.0"?>\n<!-- logo -->\n<svg viewBox="0 0 10 10"/>')).toBe(true);
    expect(isSvgMarkup('https://x/logo.svg')).toBe(false);
    expect(isSvgMarkup('<div>')).toBe(false);

    if (typeof DOMParser === 'undefined') {
      // Node without a DOM: the markup passes through untouched.
      expect(sizeSvgMarkup('<svg/>')).toBe('<svg/>');
      return;
    }
    const sized = sizeSvgMarkup('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100"/></svg>', 1000);
    expect(sized).toContain('width="1000"');
    expect(sized).toContain('height="500"');
  });
});

describe('layoutText', () => {
  const measure = (text: string, font: string) => text.length * parseFloat(font.split(' ')[1]) * 0.6;

  it('fits the largest size that clears the padding on both axes', () => {
    const wide = layoutText({ text: 'HELLO' }, 1000, 1000, measure);
    // 5 chars * 0.6 = 3 em wide; available width 840 → 280px; height allows 840/1.1 = 763.
    expect(wide.size).toBe(280);
    expect(wide.lines[0].x).toBeCloseTo((1000 - 840) / 2, 0);
    const tall = layoutText({ text: 'A\nB\nC\nD', padding: 0 }, 1000, 220, measure);
    expect(tall.size).toBe(50);
    expect(tall.lines).toHaveLength(4);
    expect(tall.lines[1].y - tall.lines[0].y).toBeCloseTo(55, 5);
  });

  it('honors explicit size, alignment, letter spacing, and the font string', () => {
    const left = layoutText({ text: 'ab', size: 100, align: 'left', padding: 0.1, font: 'Inter', weight: 400 }, 400, 200, measure);
    expect(left.font).toBe('400 100px Inter');
    expect(left.lines[0].x).toBe(20);
    const right = layoutText({ text: 'ab', size: 100, align: 'right', padding: 0.1 }, 400, 200, measure);
    expect(right.lines[0].x).toBe(400 - 20 - 120);
    const spaced = layoutText({ text: 'ab', size: 100, letterSpacing: 0.5, padding: 0 }, 400, 200, measure);
    expect(spaced.lines[0].width).toBe(120 + 50);
    expect(layoutText({ text: '', size: 10 }, 100, 100, measure).lines[0].width).toBe(0);
  });
});

describe('TextSource', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rasterizes on demand at the grid size and reports its layout', async () => {
    const fills: [string, number, number][] = [];
    const ctx = {
      font: '',
      fillStyle: '',
      textBaseline: '',
      textAlign: '',
      clearRect: vi.fn(),
      fillText: (t: string, x: number, y: number) => fills.push([t, x, y]),
      measureText: (t: string) => ({ width: t.length * parseFloat(ctx.font.split(' ')[1]) * 0.6 }),
      getImageData: (_x: number, _y: number, w: number, h: number) => rgba(w, h, () => [255, 255, 255, 255]),
    };
    const canvas = { width: 0, height: 0, getContext: () => ctx };
    vi.stubGlobal('document', { createElement: () => canvas });

    const source = new TextSource();
    await source.load('bad input' as unknown);
    expect(source.isReady()).toBe(true);
    await source.load({ text: 'ASCII\nENGINE', weight: 900 });
    expect(source.isReady()).toBe(true);
    expect(source.getError()).toBeNull();
    const context = { grid: { width: 640, height: 360 } } as unknown as SourceContext;
    source.update(0, context);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(fills.map((f) => f[0])).toEqual(['ASCII', 'ENGINE']);
    expect(source.getLayout()?.font).toMatch(/^900 \d+px sans-serif$/);
    expect(source.getImageData()?.width).toBe(640);

    // No re-raster until something changes.
    fills.length = 0;
    source.update(0, context);
    expect(fills).toHaveLength(0);
    source.setText('NEW');
    source.update(0, context);
    expect(fills.map((f) => f[0])).toEqual(['NEW']);
    fills.length = 0;
    source.setOptions({ letterSpacing: 0.2 });
    source.update(0, context);
    expect(fills.map((f) => f[0])).toEqual(['N', 'E', 'W']);
    expect(source.getOptions()).toMatchObject({ text: 'NEW', weight: 900, letterSpacing: 0.2 });

    await source.load(42 as unknown);
    expect(source.isReady()).toBe(false);
    expect(source.getError()).toContain('TextSource');
    source.destroy();
  });

  it('is a built in source the engine can load', async () => {
    const clock = stubAnimationFrame();
    const engine = new AsciiEngine({ canvas: createMockCanvas(400, 300), preset: getPreset('basic'), width: 400, height: 300, autoStart: false });
    engine.getPerformanceManager().setAdaptiveQuality(false);
    // A document with a text capable canvas, stubbed after the DOM renderer built its element.
    const ctx = {
      font: '',
      fillStyle: '',
      textBaseline: '',
      textAlign: '',
      clearRect: vi.fn(),
      fillText: vi.fn(),
      measureText: (t: string) => ({ width: t.length * 10 }),
      getImageData: (_x: number, _y: number, w: number, h: number) => rgba(w, h, (x) => (x < w / 2 ? [255, 255, 255, 255] : [0, 0, 0, 0])),
    };
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    expect(engine.getSourceManager().getSource('text')?.type).toBe('text');
    engine.setActiveSource('text');
    await engine.loadSource('text', 'HI');
    expect(engine.getDebugState().source).toMatchObject({ mode: 'source', activeSourceId: 'text', ready: true });
    engine.start();
    clock.advanceFrames(2);
    expect(ctx.fillText).toHaveBeenCalledWith('HI', expect.any(Number), expect.any(Number));
    const grid = engine.getRendererManager().getGridState(0);
    expect(engine.getDebugState().source.width).toBe(grid.width);
    // The type's raster drives the grid: lit on the left, dark on the right (glitch may touch a few).
    const left = grid.cells.filter((c) => c.x < grid.cols / 2 - 1);
    const right = grid.cells.filter((c) => c.x > grid.cols / 2);
    expect(left.filter((c) => c.brightness > 0).length / left.length).toBeGreaterThan(0.9);
    expect(right.filter((c) => c.brightness === 0).length / right.length).toBeGreaterThan(0.9);
    engine.destroy();
  });
});
