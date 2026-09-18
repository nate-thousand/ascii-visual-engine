import { vi } from 'vitest';

export function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
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

export function stubAnimationFrame(): {
  advanceFrames: (count: number, msPerFrame?: number) => void;
} {
  let now = 0;
  const rafCallbacks: FrameRequestCallback[] = [];

  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  return {
    advanceFrames(count: number, msPerFrame = 16) {
      for (let i = 0; i < count; i++) {
        now += msPerFrame;
        const cb = rafCallbacks.shift();
        if (!cb) break;
        cb(now);
      }
    },
  };
}

export function gridFingerprint(
  cells: Array<{ char: string; brightness: number }>,
): string {
  return cells.map((c) => `${c.char}:${c.brightness.toFixed(3)}`).join('|');
}
