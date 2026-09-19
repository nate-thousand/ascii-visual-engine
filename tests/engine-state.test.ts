import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { createEngine } from '../src/core/createEngine';
import { getPreset } from '../src/presets';
import { createMockCanvas, stubAnimationFrame } from './helpers/mockCanvas';

describe('engine state', () => {
  let frames: ReturnType<typeof stubAnimationFrame>;
  beforeEach(() => {
    frames = stubAnimationFrame();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function make(autoStart = false) {
    return new AsciiEngine({ canvas: createMockCanvas(200, 100), preset: getPreset('basic'), width: 200, height: 100, autoStart });
  }

  it('moves idle -> running -> idle -> destroyed and emits every transition', () => {
    const engine = make();
    const seen: string[] = [];
    engine.on('state', (s) => seen.push(s));
    expect(engine.getState()).toBe('idle');
    expect(engine.isRunning()).toBe(false);

    engine.start();
    engine.start();
    expect(engine.getState()).toBe('running');
    expect(engine.isRunning()).toBe(true);
    frames.advanceFrames(2);
    const t = engine.getEngineTime();
    expect(t).toBeGreaterThan(0);

    engine.stop();
    engine.stop();
    expect(engine.getState()).toBe('idle');
    frames.advanceFrames(2);
    expect(engine.getEngineTime()).toBe(t);

    engine.start();
    frames.advanceFrames(1);
    expect(engine.getEngineTime()).toBeGreaterThan(t);

    engine.destroy();
    engine.destroy();
    expect(engine.getState()).toBe('destroyed');
    expect(engine.isDestroyed()).toBe(true);
    expect(engine.getDebugState().state).toBe('destroyed');
    expect(seen).toEqual(['running', 'idle', 'running', 'idle', 'destroyed']);
  });

  it('autoStart constructs straight into running', () => {
    const engine = make(true);
    expect(engine.getState()).toBe('running');
    engine.destroy();
  });

  it('start() after destroy throws; other mutations warn once and are ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = make();
    engine.setControl('speed', 0.5);
    engine.destroy();

    expect(() => engine.start()).toThrow(/after destroy/);
    engine.setControl('speed', 2);
    engine.setPreset(getPreset('terminal'));
    engine.resize(10, 10);
    engine.noteOn({ x: 0.5, y: 0.5 });
    expect(engine.getControl('speed')).toBe(0.5);
    expect(engine.getPreset().id).toBe('basic');
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('after destroy()'))).toHaveLength(1);
    expect(engine.getState()).toBe('destroyed');
  });

  it('the facade exposes getState', () => {
    const handle = createEngine(createMockCanvas(200, 100), { width: 200, height: 100, autoStart: false });
    expect(handle.getState()).toBe('idle');
    handle.start();
    expect(handle.getState()).toBe('running');
    handle.destroy();
    expect(handle.getState()).toBe('destroyed');
  });
});
