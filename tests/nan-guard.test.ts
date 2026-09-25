import { describe, it, expect, vi, afterEach } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { listPresets, getPreset } from '../src/presets';
import { drawGridToCanvas } from '../src/renderers/canvasDrawing';
import type { AsciiPreset, GridCell } from '../src/core/types';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/**
 * A NaN in one cell's brightness or burst used to reach `buckets[NaN].push`
 * in the canvas renderer, which threw and left the canvas black while the
 * loop kept running. Hosts feed the engine audio levels and mapped controls,
 * so every number that comes in is checked, every preset is run long enough
 * for an unstable simulation to blow up, and the renderer treats NaN as dark.
 */

function boot(preset: AsciiPreset, size: [number, number] = [320, 180]) {
  vi.unstubAllGlobals();
  const clock = stubAnimationFrame();
  const engine = new AsciiEngine({
    canvas: createMockCanvas(size[0], size[1]),
    preset,
    width: size[0],
    height: size[1],
    autoStart: false,
    seed: 1,
    fixedTimestep: 60,
  });
  engine.getPerformanceManager().setAdaptiveQuality(false);
  engine.start();
  return { engine, clock };
}

function firstNonFinite(engine: AsciiEngine): string | null {
  for (const c of engine.getRendererManager().getGridState(0).cells) {
    if (!Number.isFinite(c.brightness) || !Number.isFinite(c.burst) || !Number.isFinite(c.scale)) {
      return `brightness=${c.brightness} burst=${c.burst} scale=${c.scale} at ${c.x},${c.y}`;
    }
  }
  return null;
}

describe('every built in preset stays finite', () => {
  afterEach(() => vi.unstubAllGlobals());

  for (const preset of listPresets()) {
    it(`${preset.id} runs 4 seconds with bursts and no NaN cell`, () => {
      const { engine, clock } = boot(preset);
      let bad: string | null = null;
      for (let f = 0; f < 240 && !bad; f++) {
        if (f % 30 === 0) engine.noteOn({ intensity: 1, x: 0.5, y: 0.5 });
        clock.advanceFrames(1, 16.67);
        bad = firstNonFinite(engine);
        if (bad) bad = `frame ${f}: ${bad}`;
      }
      engine.destroy();
      expect(bad).toBeNull();
    });
  }
});

describe('reaction diffusion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stays bounded and keeps drawing after many steps', () => {
    const { engine, clock } = boot(getPreset('reactionDiffusionSim'), [640, 360]);
    clock.advanceFrames(600, 16.67);
    expect(firstNonFinite(engine)).toBeNull();
    expect(engine.getDebugState().simulation.totalParticles).toBeGreaterThan(0);
    engine.destroy();
  });
});

describe('non finite input is ignored with one warning', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('setControl keeps the previous value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine } = boot(getPreset('basic'));
    engine.setControl('speed', 0.7);
    engine.setControl('speed', NaN);
    engine.setControl('speed', Infinity);
    expect(engine.getControl('speed', 0)).toBe(0.7);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('setControl')).length).toBe(1);
    engine.destroy();
  });

  it('setBassGlyphScale with NaN leaves cell scale finite', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine, clock } = boot(getPreset('basic'));
    engine.setBassGlyphScale(0.8);
    engine.setBassGlyphScale(NaN);
    clock.advanceFrames(10, 16.67);
    expect(firstNonFinite(engine)).toBeNull();
    const scales = engine.getRendererManager().getGridState(0).cells.map((c) => c.scale);
    expect(scales.some((s) => s > 1)).toBe(true);
    engine.destroy();
  });

  it('noteOn drops NaN position and intensity so the burst uses defaults', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { engine, clock } = boot(getPreset('basic'));
    engine.noteOn({ x: NaN, y: NaN, intensity: NaN });
    clock.advanceFrames(5, 16.67);
    expect(firstNonFinite(engine)).toBeNull();
    const cells = engine.getRendererManager().getGridState(0).cells;
    expect(cells.some((c) => c.burst > 0)).toBe(true);
    engine.destroy();
  });
});

describe('canvas drawing', () => {
  it('draws a grid with NaN cells instead of throwing', () => {
    const canvas = createMockCanvas(100, 50);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const cells: GridCell[] = [];
    for (let i = 0; i < 6; i++) {
      cells.push({ x: i, y: 0, char: '#', brightness: i === 2 ? NaN : 0.5, burst: i === 4 ? NaN : 0, scale: 1, phase: 0 } as GridCell);
    }
    expect(() => drawGridToCanvas(ctx, cells, 10, 10, {})).not.toThrow();
  });
});
