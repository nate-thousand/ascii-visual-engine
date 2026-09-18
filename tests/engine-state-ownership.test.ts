import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import type { AsciiEngine as Engine } from '../src/core/AsciiEngine';
import type { Source, SourceContext, SourceSample, SourceFitMode } from '../src/sources/Source';
import { getPreset } from '../src/presets';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

/** A ready pixel source whose every pixel has the same brightness. */
class FlatSource implements Source {
  readonly id = 'flat';
  readonly name = 'Flat';
  readonly type = 'canvas' as const;
  private fitMode: SourceFitMode = 'stretch';
  constructor(private level: number) {}
  initialize(_engine: Engine): void {}
  async load(_input: unknown): Promise<void> {}
  update(_dt: number, _ctx: SourceContext): void {}
  sample(_x: number, _y: number, _ctx: SourceContext): SourceSample {
    return { brightness: this.level, contrast: 1, edge: 0 };
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
    const w = 4;
    const h = 4;
    const v = Math.round(this.level * 255);
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    return { width: w, height: h, data, colorSpace: 'srgb' } as ImageData;
  }
}

function makeEngine(presetId: Parameters<typeof getPreset>[0]) {
  const canvas = createMockCanvas(400, 300) as HTMLCanvasElement & { toBlob: unknown };
  canvas.toBlob = (cb: (b: Blob | null) => void) => cb(new Blob(['x'], { type: 'image/png' }));
  const engine = new AsciiEngine({
    canvas,
    preset: getPreset(presetId),
    width: 400,
    height: 300,
    autoStart: false,
  });
  // The stubbed clock reports a low fps; keep adaptive quality from resizing the grid mid test.
  engine.getPerformanceManager().setAdaptiveQuality(false);
  return engine;
}

describe('source owns the grid', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a pattern preset shows the source at sourceBlend 1', () => {
    const engine = makeEngine('glyphOrganicBloom');
    engine.getSourceManager().registerSource(new FlatSource(1));
    engine.setActiveSource('flat');
    engine.setControl('sourceBlend', 1);
    engine.setControl('sourceEdge', 0);
    engine.setControl('strength', 1);
    engine.start();
    frames.advanceFrames(3);

    const cells = engine.getRendererManager().getGridState(0).cells;
    expect(cells.length).toBeGreaterThan(0);
    // Organic Bloom runs radialSymmetry and cellular patterns; none may dim a white source.
    expect(cells.every((c) => c.brightness > 0.99)).toBe(true);
    engine.destroy();
  });

  it('sourceBlend 0 hands the grid back to the patterns', () => {
    const engine = makeEngine('glyphOrganicBloom');
    engine.getSourceManager().registerSource(new FlatSource(1));
    engine.setActiveSource('flat');
    engine.setControl('sourceEdge', 0);
    engine.setControl('sourceBlend', 0);
    engine.start();
    frames.advanceFrames(3);

    const cells = engine.getRendererManager().getGridState(0).cells;
    expect(cells.some((c) => c.brightness < 0.9)).toBe(true);
    engine.destroy();
  });

  it('survives setPreset when the preset declares no source', () => {
    const engine = makeEngine('glyphOrganicBloom');
    engine.getSourceManager().registerSource(new FlatSource(0.5));
    engine.setActiveSource('flat');
    expect(engine.getSourceMode()).toBe('source');

    engine.setPreset(getPreset('glyphCrtTerminal'));
    expect(engine.getSourceMode()).toBe('source');
    expect(engine.getDebugState().source.activeSourceId).toBe('flat');

    engine.setSourceMode('procedural');
    expect(engine.getSourceMode()).toBe('procedural');
    engine.destroy();
  });
});

describe('playback owns the grid', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a stepped frame survives a live tick until stopPlayback', () => {
    const engine = makeEngine('glyphOrganicBloom');
    engine.startRecording(60);
    engine.start();
    frames.advanceFrames(6);
    engine.stopRecording();
    const recorded = engine.getExportManager().getTimelineRecorder().getTimeline();
    expect(recorded.length).toBeGreaterThan(1);

    engine.playRecording({ frameRate: 60 });
    engine.pausePlayback();
    engine.scrubPlayback(0);
    expect(engine.isPlaybackActive()).toBe(true);
    const shown = gridFingerprint(recorded[0].grid.cells);
    expect(gridFingerprint(engine.getRendererManager().getGridState(0).cells)).toBe(shown);

    frames.advanceFrames(2);
    expect(gridFingerprint(engine.getRendererManager().getGridState(0).cells)).toBe(shown);

    engine.stopPlayback();
    expect(engine.isPlaybackActive()).toBe(false);
    frames.advanceFrames(2);
    expect(gridFingerprint(engine.getRendererManager().getGridState(0).cells)).not.toBe(shown);
    engine.destroy();
  });
});

describe('quality scaling is engine state', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scales from the base density, does not compound, and survives setPreset', () => {
    stubAnimationFrame();
    const engine = makeEngine('glyphOrganicBloom');
    const base = engine.getControl('density', 1);

    engine.setQualityPreset('low');
    const low = engine.getControl('density', 1);
    expect(low).toBeLessThan(base);

    engine.setQualityPreset('low');
    expect(engine.getControl('density', 1)).toBeCloseTo(low, 6);

    engine.setQualityPreset('ultra');
    expect(engine.getControl('density', 1)).toBeGreaterThan(low);

    engine.setQualityPreset('low');
    const next = getPreset('glyphCrtTerminal');
    engine.setPreset(next);
    expect(engine.getControl('density', 1)).toBeCloseTo(low * (next.density / base), 6);

    // A host edit becomes the new base for the next quality change.
    engine.setControl('density', 1.5);
    engine.setQualityPreset('ultra');
    engine.setQualityPreset('low');
    expect(engine.getControl('density', 1)).toBeCloseTo(1.5 * (low / base), 6);
    engine.destroy();
  });
});
