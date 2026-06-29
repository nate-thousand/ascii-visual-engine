import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  RendererManager,
  CanvasRenderer,
  DomRenderer,
  OffscreenCanvasRenderer,
  WebGLRendererStub,
  GridBuffer,
  isOffscreenCanvasSupported,
  listRendererIds,
} from '../src/renderers';

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
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

describe('RendererManager', () => {
  let manager: RendererManager;

  afterEach(() => {
    manager?.destroy();
  });

  it('registers and activates renderers', () => {
    manager = new RendererManager();
    const canvas = createMockCanvas();
    manager.registerRenderer(
      new CanvasRenderer({
        canvas,
        width: 800,
        height: 600,
        density: 1,
        glyphSet: ['.', '#'],
      }),
    );

    const result = manager.setActiveRenderer('canvas');
    expect(result.ok).toBe(true);
    expect(manager.getActiveId()).toBe('canvas');
  });

  it('transfers grid state when switching renderers', () => {
    manager = new RendererManager();
    const canvas = createMockCanvas();
    const domElement = { style: {}, textContent: '' } as unknown as HTMLElement;

    manager.registerRenderer(
      new CanvasRenderer({
        canvas,
        width: 400,
        height: 300,
        density: 1,
        glyphSet: ['.', '#'],
      }),
    );
    manager.registerRenderer(
      new DomRenderer({
        element: domElement,
        width: 400,
        height: 300,
        density: 1,
        glyphSet: ['.', '#'],
      }),
    );

    manager.setActiveRenderer('canvas');
    const grid = manager.getGridState(0);
    grid.cells[0].char = 'X';

    manager.setActiveRenderer('dom');
    expect(manager.getGridState(0).cells[0].char).toBe('X');
  });

  it('rejects WebGL stub activation with warning', () => {
    manager = new RendererManager();
    manager.registerRenderer(
      new WebGLRendererStub({
        width: 800,
        height: 600,
        density: 1,
        glyphSet: ['.'],
      }),
    );

    const result = manager.setActiveRenderer('webgl');
    expect(result.ok).toBe(false);
    expect(result.warning).toContain('not yet implemented');
  });
});

describe('DomRenderer', () => {
  it('renders grid as text content', () => {
    const element = { style: {}, textContent: '' } as unknown as HTMLElement;
    const renderer = new DomRenderer({
      element,
      width: 200,
      height: 100,
      density: 1,
      glyphSet: ['.', '#'],
    });

    renderer.render({ trailAmount: 0, time: 0 }, {
      engine: {} as never,
      dt: 0.016,
      getControl: () => 0,
    });

    expect(typeof element.textContent).toBe('string');
    expect((element.textContent as string).length).toBeGreaterThan(0);
    renderer.destroy();
  });
});

describe('OffscreenCanvasRenderer', () => {
  it('falls back safely when OffscreenCanvas is unavailable', () => {
    const original = globalThis.OffscreenCanvas;
    // @ts-expect-error test override
    globalThis.OffscreenCanvas = undefined;

    const canvas = createMockCanvas();
    const renderer = new OffscreenCanvasRenderer({
      canvas,
      width: 400,
      height: 300,
      density: 1,
      glyphSet: ['.'],
    });

    expect(renderer.isAvailable()).toBe(true);
    expect(renderer.isUsingOffscreen()).toBe(false);
    expect(renderer.getSwitchWarning()).toContain('falling back');

    renderer.render({ trailAmount: 0, time: 0 }, {
      engine: {} as never,
      dt: 0.016,
      getControl: () => 0,
    });

    renderer.destroy();
    globalThis.OffscreenCanvas = original;
  });

  it('reports offscreen support helper', () => {
    expect(typeof isOffscreenCanvasSupported()).toBe('boolean');
  });
});

describe('WebGLRendererStub', () => {
  it('does not break when render is called', () => {
    const renderer = new WebGLRendererStub({
      width: 400,
      height: 300,
      density: 1,
      glyphSet: ['.'],
    });

    expect(renderer.isAvailable()).toBe(false);
    expect(() =>
      renderer.render({ trailAmount: 0, time: 0 }, {
        engine: {} as never,
        dt: 0.016,
        getControl: () => 0,
      }),
    ).not.toThrow();
    renderer.destroy();
  });
});

describe('GridBuffer', () => {
  it('rebuilds grid on density change', () => {
    const buffer = new GridBuffer({
      width: 800,
      height: 600,
      density: 1,
      glyphSet: ['.', '#'],
    });

    const colsBefore = buffer.getGridState(0).cols;
    buffer.setDensity(2);
    expect(buffer.getGridState(0).cols).toBeGreaterThan(colsBefore);
  });
});

describe('listRendererIds', () => {
  it('lists all renderer backends', () => {
    expect(listRendererIds()).toEqual(['canvas', 'dom', 'offscreen-canvas', 'webgl']);
  });
});
