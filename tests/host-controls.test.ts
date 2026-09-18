import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

/**
 * Host facing controls folded in from the platform's vendored copy:
 * setColor, setGlyphSet, setBassGlyphScale.
 */
describe('AsciiEngine host controls', () => {
  let engine: AsciiEngine;
  let canvas: HTMLCanvasElement & { _fillRectStyles: string[] };
  let frames: ReturnType<typeof stubAnimationFrame>;

  beforeEach(() => {
    frames = stubAnimationFrame();
    canvas = createMockCanvas() as HTMLCanvasElement & { _fillRectStyles: string[] };
    engine = new AsciiEngine({ canvas, preset: basicPreset, width: 640, height: 480 });
  });

  afterEach(() => {
    engine.destroy();
    vi.unstubAllGlobals();
  });

  it('setColor changes the glyph colour used by the active renderer', () => {
    const ctx = canvas.getContext('2d') as unknown as { fillStyle: string; fillText: ReturnType<typeof vi.fn> };
    engine.setColor('#ff00aa');
    engine.start();
    frames.advanceFrames(2);
    const calls = ctx.fillText.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // fillStyle is set to the glyph colour before glyphs are drawn
    expect(ctx.fillStyle).toMatch(/#ff00aa|255, 0, 170/);
  });

  it('setGlyphSet overrides the resolved glyph set and disables the glyph language', () => {
    engine.disablePlugin('glitch');
    engine.setControl('glitchAmount', 0);
    engine.setGlyphSet(['A', 'B', 'C']);
    expect(engine.getGlyphRegistry().getResolvedGlyphSet()).toEqual(['A', 'B', 'C']);
    engine.start();
    frames.advanceFrames(3);
    const chars = new Set(engine.getGridState().cells.map((c) => c.char));
    for (const ch of chars) expect(['A', 'B', 'C', ' ']).toContain(ch);
  });

  it('setGlyphSet ignores an empty set', () => {
    const before = [...engine.getGlyphRegistry().getResolvedGlyphSet()];
    engine.setGlyphSet([]);
    expect(engine.getGlyphRegistry().getResolvedGlyphSet()).toEqual(before);
  });

  it('setBassGlyphScale pulses cell scale and settles back to 1 at zero', () => {
    engine.start();
    frames.advanceFrames(2);
    expect(engine.getGridState().cells.every((c) => c.scale === 1)).toBe(true);

    engine.setBassGlyphScale(1);
    frames.advanceFrames(4);
    const scales = engine.getGridState().cells.map((c) => c.scale);
    expect(scales.some((s) => s > 1)).toBe(true);
    expect(new Set(scales).size).toBeGreaterThan(1); // per glyph random pulse

    engine.setBassGlyphScale(0);
    frames.advanceFrames(30);
    expect(engine.getGridState().cells.every((c) => c.scale === 1)).toBe(true);
  });

  it('setBassGlyphScale clamps to 0..1', () => {
    engine.start();
    engine.setBassGlyphScale(5);
    frames.advanceFrames(4);
    const max = Math.max(...engine.getGridState().cells.map((c) => c.scale));
    expect(max).toBeLessThanOrEqual(1 + 1.95 * 2.5 + 1e-9);
  });
});
