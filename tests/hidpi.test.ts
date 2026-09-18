import { describe, it, expect, afterEach, vi } from 'vitest';
import { CanvasRenderer } from '../src/renderers/CanvasRenderer';
import { resolvePixelRatio, MAX_PIXEL_RATIO } from '../src/renderers/pixelRatio';
import { createEngine } from '../src/core/createEngine';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

type MockCanvas = HTMLCanvasElement & { _fillRectStyles: string[] };

function ctxOf(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d') as unknown as { setTransform: ReturnType<typeof vi.fn> };
}

describe('pixel ratio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves auto from devicePixelRatio, capped', () => {
    vi.stubGlobal('window', { devicePixelRatio: 3 });
    expect(resolvePixelRatio('auto')).toBe(MAX_PIXEL_RATIO);
    vi.stubGlobal('window', { devicePixelRatio: 1.5 });
    expect(resolvePixelRatio('auto')).toBe(1.5);
    vi.stubGlobal('window', {});
    expect(resolvePixelRatio('auto')).toBe(1);
    expect(resolvePixelRatio(0)).toBe(1);
    expect(resolvePixelRatio(0.1)).toBe(0.5);
    expect(resolvePixelRatio(4)).toBe(MAX_PIXEL_RATIO);
  });

  it('scales the backing store and keeps CSS size and grid in CSS pixels', () => {
    const canvas = createMockCanvas(400, 300) as MockCanvas;
    const renderer = new CanvasRenderer({ canvas, width: 400, height: 300, density: 1, glyphSet: ['.', '#'], pixelRatio: 2 });
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('300px');
    expect(ctxOf(canvas).setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(renderer.getDimensions().cols).toBe(new CanvasRenderer({ canvas: createMockCanvas(400, 300), width: 400, height: 300, density: 1, glyphSet: ['.', '#'], pixelRatio: 1 }).getDimensions().cols);

    renderer.resize(200, 100);
    expect(canvas.width).toBe(400);
    expect(canvas.style.width).toBe('200px');
    expect(ctxOf(canvas).setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);

    renderer.setPixelRatio(1);
    expect(canvas.width).toBe(200);
    expect(ctxOf(canvas).setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);
    expect(renderer.getPixelRatio()).toBe(1);
  });

  it('the engine follows devicePixelRatio on resize when auto, and pins otherwise', () => {
    stubAnimationFrame();
    vi.stubGlobal('window', { devicePixelRatio: 2, innerWidth: 400, innerHeight: 300 });
    const canvas = createMockCanvas(400, 300);
    const handle = createEngine(canvas, { width: 400, height: 300, autoStart: false });
    expect(handle.getPixelRatio()).toBe(2);
    expect(canvas.width).toBe(800);
    expect(handle.engine.getDebugState().renderer.pixelRatio).toBe(2);

    (window as unknown as { devicePixelRatio: number }).devicePixelRatio = 1;
    handle.resize(300, 200);
    expect(handle.getPixelRatio()).toBe(1);
    expect(canvas.width).toBe(300);

    handle.setPixelRatio(2);
    (window as unknown as { devicePixelRatio: number }).devicePixelRatio = 1;
    handle.resize(300, 200);
    expect(handle.getPixelRatio()).toBe(2);
    expect(canvas.width).toBe(600);

    handle.setPixelRatio('auto');
    expect(handle.getPixelRatio()).toBe(1);
    handle.destroy();
  });
});
