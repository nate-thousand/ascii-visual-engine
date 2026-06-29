import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { terminalPreset } from '../src/presets/terminal';

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

describe('AsciiEngine plugin integration', () => {
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

  it('enables preset plugins on startup', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    const enabledIds = engine.getEnabledPlugins().map((p) => p.id).sort();
    expect(enabledIds).toEqual(['burst', 'glitch', 'trails', 'wave']);
    engine.destroy();
  });

  it('animates grid cells when plugins are enabled', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    const gridBefore = engine
      .getPluginManager()
      .get('wave')
      ?.enabled;

    expect(gridBefore).toBe(true);

    advanceFrames(3);

    const renderer = engine.getRendererManager();
    const cells = renderer.getGridState(0).cells;
    const chars = cells.map((c) => c.char);
    const allSame = chars.every((c) => c === chars[0]);

    expect(allSame).toBe(false);
    engine.destroy();
  });

  it('stops animating motion when wave effect is disabled', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    engine.disablePlugin('wave');
    engine.disablePlugin('wavePattern');
    engine.disablePlugin('glitch');
    engine.disablePlugin('burst');
    engine.disableMotion('wave');

    advanceFrames(2);
    const renderer = engine.getRendererManager();
    const snapshot1 = renderer.getGridState(0).cells.map((c) => `${c.char}:${c.brightness.toFixed(3)}`);

    advanceFrames(5);
    const snapshot2 = renderer.getGridState(0).cells.map((c) => `${c.char}:${c.brightness.toFixed(3)}`);

    expect(snapshot2).toEqual(snapshot1);
    engine.destroy();
  });

  it('enablePlugin and disablePlugin toggle plugin state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.disablePlugin('glitch');
    expect(engine.getPlugin('glitch')?.enabled).toBe(false);

    engine.enablePlugin('glitch');
    expect(engine.getPlugin('glitch')?.enabled).toBe(true);
    engine.destroy();
  });

  it('setPreset reapplies plugin configuration and resets controls', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.setControl('glitchAmount', 0.99);
    engine.setPreset(terminalPreset);

    const enabled = new Set(engine.getEnabledPlugins().map((p) => p.id));
    expect(enabled.has('noise')).toBe(true);
    expect(enabled.has('wave')).toBe(false);
    expect(enabled.has('scanline')).toBe(true);
    expect(engine.getControl('glitchAmount')).toBe(terminalPreset.glitchAmount);
    engine.destroy();
  });

  it('getDebugState reflects engine state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.2 });
    const state = engine.getDebugState();

    expect(state.preset).toBe('basic');
    expect(state.effects).toContain('wave');
    expect(state.lastNoteOn?.intensity).toBe(1.2);
    engine.destroy();
  });

  it('disabling wave motion is visible when wavePattern is also off', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    advanceFrames(3);
    engine.disablePlugin('wavePattern');
    advanceFrames(3);

    const renderer = engine.getRendererManager();
    const withWave = renderer.getGridState(0).cells.map((c) => c.char).join('');
    engine.disablePlugin('wave');
    advanceFrames(3);
    const withoutWave = renderer.getGridState(0).cells.map((c) => c.char).join('');

    expect(withoutWave).not.toBe(withWave);
    engine.destroy();
  });

  it('trails fade only applies when trails plugin is enabled', () => {
    const canvas = createMockCanvas() as HTMLCanvasElement & {
      _fillRectStyles: string[];
    };
    const engine = new AsciiEngine({
      canvas,
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: true,
    });

    engine.setControl('trailAmount', 1);
    engine.enablePlugin('trails');
    advanceFrames(1);
    const fadeStyle = canvas._fillRectStyles.at(-1)!;

    canvas._fillRectStyles.length = 0;
    engine.disablePlugin('trails');
    advanceFrames(1);
    const clearStyle = canvas._fillRectStyles.at(-1)!;

    expect(fadeStyle).toMatch(/^rgba\(0, 0, 0,/);
    expect(clearStyle).toBe('#000000');
    engine.destroy();
  });
});
