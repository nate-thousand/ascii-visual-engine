import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEngine, AsciiEngine, getPreset } from '../src';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

describe('createEngine', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts on a canvas with a preset id and autostarts', () => {
    const handle = createEngine(createMockCanvas(400, 300), { preset: 'glyphCrtTerminal', width: 400, height: 300 });
    expect(handle.engine).toBeInstanceOf(AsciiEngine);
    expect(handle.getPreset().id).toBe('glyphCrtTerminal');
    frames.advanceFrames(2);
    expect(handle.engine.getEngineTime()).toBeGreaterThan(0);
    handle.destroy();
  });

  it('accepts a preset object and respects autoStart false', () => {
    const handle = createEngine(createMockCanvas(400, 300), {
      preset: getPreset('basic'),
      width: 400,
      height: 300,
      autoStart: false,
    });
    frames.advanceFrames(2);
    expect(handle.engine.getEngineTime()).toBe(0);
    handle.start();
    frames.advanceFrames(2);
    expect(handle.engine.getEngineTime()).toBeGreaterThan(0);
    handle.stop();
    const t = handle.engine.getEngineTime();
    frames.advanceFrames(2);
    expect(handle.engine.getEngineTime()).toBe(t);
    handle.destroy();
  });

  it('falls back to the default preset on an unknown id and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handle = createEngine(createMockCanvas(400, 300), { preset: 'nope', width: 400, height: 300, autoStart: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
    expect(handle.getPreset().id).toBeTruthy();
    handle.setPreset('nope');
    expect(handle.getPreset().id).not.toBe('nope');
    handle.destroy();
    warn.mockRestore();
  });

  it('routes controls, presets, and events to the engine', () => {
    const handle = createEngine(createMockCanvas(400, 300), { width: 400, height: 300, autoStart: false });
    const seen: string[] = [];
    const off = handle.on('preset', (p) => seen.push(p.id));
    handle.on('control', ({ name, value }) => seen.push(`${name}=${value}`));

    handle.setPreset('glyphMinimalZen');
    handle.setPresetById('glyphFlowField');
    handle.setControl('speed', 1.5);
    expect(handle.getControl('speed')).toBe(1.5);
    expect(seen).toEqual(['glyphMinimalZen', 'glyphFlowField', 'speed=1.5']);

    off();
    handle.setPreset('basic');
    expect(seen).toHaveLength(3);
    handle.destroy();
  });

  it('exposes the host setters and reads level as 0 without audio', () => {
    const handle = createEngine(createMockCanvas(400, 300), { width: 400, height: 300, autoStart: false });
    handle.setGlyphSet(['a', 'b']);
    handle.setColor('#ff00ff');
    handle.setBassGlyphScale(2);
    expect(handle.getLevel()).toBe(0);
    expect(handle.engine.getDebugState().glyph.enabled).toBe(false);
    // No window in this environment; the calls must still be safe.
    expect(() => handle.enableKeyboardInput()).not.toThrow();
    expect(() => handle.disableKeyboardInput()).not.toThrow();
    expect(handle.engine.getDebugState().input.keyboardEnabled).toBe(false);
    expect(handle.getScriptEngine()).toBe(handle.engine.getScriptEngine());
    handle.destroy();
  });

  it('loads and clears a source', async () => {
    const handle = createEngine(createMockCanvas(400, 300), { width: 400, height: 300, autoStart: false });
    // Swap the canvas source for a stub so this runs without a DOM.
    const loaded: unknown[] = [];
    const manager = handle.engine.getSourceManager();
    manager.unregisterSource('canvas');
    manager.registerSource({
      id: 'canvas',
      name: 'Stub',
      type: 'canvas',
      initialize() {},
      async load(input: unknown) {
        loaded.push(input);
      },
      update() {},
      sample: () => ({ brightness: 0, contrast: 1, edge: 0 }),
      destroy() {},
      isReady: () => true,
      getError: () => null,
      getFitMode: () => 'fit' as const,
      setFitMode() {},
    });
    await handle.loadSource('canvas', { canvas: 'x' });
    expect(loaded).toEqual([{ canvas: 'x' }]);
    expect(handle.engine.getSourceMode()).toBe('source');
    expect(handle.engine.getDebugState().source.activeSourceId).toBe('canvas');
    handle.clearSource();
    expect(handle.engine.getSourceMode()).toBe('procedural');
    handle.destroy();
  });
});
