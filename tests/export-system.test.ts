import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gridToAscii,
  cloneGridState,
  buildSceneDocument,
  serializeScene,
  parseScene,
  gridToSvg,
  ExportManager,
  padFrameIndex,
} from '../src/export';
import { basicPreset } from '../src/presets/basic';
import { AsciiEngine } from '../src/core/AsciiEngine';

function makeGrid(cols = 4, rows = 3) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        char: x === y ? '#' : '.',
        baseChar: '.',
        x,
        y,
        phase: 0,
        brightness: 0.5,
        burst: 0,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        rotation: 0,
        deformation: 0,
      });
    }
  }
  return { cells, cols, rows, time: 1, width: 400, height: 300 };
}

function createMockEngineBridge() {
  const grid = makeGrid();
  return {
    getCanvas: () => null,
    getGridState: () => grid,
    getPreset: () => basicPreset,
    getControl: (name: string, fallback = 0) =>
      (basicPreset as Record<string, number>)[name] ?? fallback,
    getControls: () => ({ density: 1, speed: 1 }),
    getActiveRendererId: () => 'canvas',
    getInputMapping: () => ({ enabled: false }),
    getAudioMapping: () => ({ enabled: false, mappings: [] }),
    getResolvedGlyphSet: () => ['.', '#'],
    getDebugState: () => ({
      effects: ['wave'],
      motions: ['flowField'],
      simulation: { activeSimulations: [] },
      density: 1,
    }),
    applySceneDocument: vi.fn(),
    isRunning: () => true,
  };
}

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(100 * 100 * 4),
    })),
    canvas: { width: 100, height: 100 },
  };
  return {
    width: 100,
    height: 100,
    style: { width: '', height: '' },
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,abc',
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['x'], { type: 'image/png' })),
  } as unknown as HTMLCanvasElement;
}

describe('gridToAscii', () => {
  it('exports plain ASCII text from grid', () => {
    const grid = makeGrid();
    const text = gridToAscii(grid);
    expect(text).toContain('#');
    expect(text.split('\n').length).toBe(3);
  });

  it('clones grid state without shared cell references', () => {
    const grid = makeGrid();
    const clone = cloneGridState(grid);
    clone.cells[0].char = '@';
    expect(grid.cells[0].char).toBe('#');
  });
});

describe('gridToSvg', () => {
  it('produces valid SVG with glyph tspans', () => {
    const svg = gridToSvg(makeGrid(), { transparent: true });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<tspan');
    expect(svg).toContain('#');
  });
});

describe('JSON scene export', () => {
  it('builds scene document with preset and grid', () => {
    const doc = buildSceneDocument(createMockEngineBridge() as never, 'Test');
    expect(doc.version).toBe(1);
    expect(doc.preset.id).toBe('basic');
    expect(doc.grid?.cols).toBe(4);
    expect(doc.metadata.name).toBe('Test');
  });

  it('round-trips serialize and parse', () => {
    const doc = buildSceneDocument(createMockEngineBridge() as never);
    const json = serializeScene(doc);
    const parsed = parseScene(json);
    expect(parsed.preset.id).toBe(doc.preset.id);
    expect(parsed.controls.density).toBeDefined();
  });
});

describe('ExportManager', () => {
  let manager: ExportManager;

  beforeEach(() => {
    manager = new ExportManager();
    manager.setEngine(createMockEngineBridge() as never, vi.fn());
  });

  it('exports ASCII text', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ click: vi.fn(), href: '', download: '' }),
    });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:', revokeObjectURL: vi.fn() });

    const result = manager.exportASCII();
    expect(result.ok).toBe(true);
    expect(result.data).toContain('#');
  });

  it('exports JSON scene', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ click: vi.fn(), href: '', download: '' }),
    });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:', revokeObjectURL: vi.fn() });

    const result = manager.exportJSON('snapshot');
    expect(result.ok).toBe(true);
    expect(result.data).toContain('"preset"');
  });

  it('tracks recording state', () => {
    const start = manager.startRecording(24);
    expect(start.ok).toBe(true);
    expect(manager.getDebugState().recording.state).toBe('recording');
    manager.stopRecording();
    expect(manager.getDebugState().recording.state).toBe('stopped');
  });
});

describe('padFrameIndex', () => {
  it('zero-pads frame numbers', () => {
    expect(padFrameIndex(1)).toBe('0001');
    expect(padFrameIndex(42)).toBe('0042');
  });
});

describe('AsciiEngine export integration', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => ({
        id: '',
        style: { color: '', backgroundColor: '', fontFamily: '', whiteSpace: '' },
        textContent: '',
      }),
    });
  });

  it('exposes export API', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });

    expect(engine.getExportManager()).toBeDefined();
    expect(engine.getDebugState().export.recording.state).toBe('idle');
    expect(typeof engine.exportJSON).toBe('function');
    engine.destroy();
  });

  it('records frames while running', () => {
    vi.stubGlobal('performance', { now: () => 0 });
    let rafCb: ((t: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });

    engine.startRecording(30);
    engine.start();
    rafCb?.(16);
    rafCb?.(32);
    engine.stopRecording();
    expect(engine.getDebugState().export.recording.frameCount).toBeGreaterThan(0);
    engine.destroy();
  });
});
