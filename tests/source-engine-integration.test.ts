import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const fillRectStyles: string[] = [];
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(function (this: { fillStyle: string }) {
      fillRectStyles.push(this.fillStyle);
    }),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    canvas: { width, height },
  };

  return {
    width,
    height,
    style: { width: '', height: '' },
    getContext: () => ctx,
    _fillRectStyles: fillRectStyles,
  } as unknown as HTMLCanvasElement & { _fillRectStyles: string[] };
}

describe('AsciiEngine source integration', () => {
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

  it('procedural mode works when source mode is procedural', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    expect(engine.getSourceMode()).toBe('procedural');
    advanceFrames(3);

    const renderer = engine.getRendererManager();
    const chars = renderer.getGridState(0).cells.map((c) => c.char);
    expect(chars.some((c) => c !== chars[0])).toBe(true);
    engine.destroy();
  });

  it('can switch source mode without restarting engine', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.setActiveSource('image');
    expect(engine.getSourceMode()).toBe('source');
    engine.setSourceMode('procedural');
    expect(engine.getSourceMode()).toBe('procedural');
    engine.setActiveSource('canvas');
    expect(engine.getSourceMode()).toBe('source');
    engine.destroy();
  });

  it('getDebugState includes source state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    const state = engine.getDebugState();
    expect(state.source.mode).toBe('procedural');
    expect(state.source.activeSourceId).toBeNull();
    engine.destroy();
  });
});
