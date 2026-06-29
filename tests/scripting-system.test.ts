import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import {
  ScriptEngine,
  ScriptRegistry,
  ScriptLoader,
  ScriptRunner,
  ScriptAPI,
  createScriptContext,
} from '../src/scripting';
import type { ScriptEngineBridge, ScriptModule } from '../src/scripting/ScriptTypes';

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    canvas: { width: 400, height: 300 },
  };
  return {
    width: 400,
    height: 300,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

function createMockBridge(overrides: Partial<ScriptEngineBridge> = {}): ScriptEngineBridge {
  const calls: string[] = [];
  return {
    setPreset: vi.fn(),
    setPresetById: vi.fn(),
    getPreset: () => basicPreset,
    setControl: vi.fn((name) => calls.push(`setControl:${name}`)),
    getControl: (_name, fallback = 0) => fallback,
    enablePlugin: vi.fn((id) => calls.push(`enablePlugin:${id}`)),
    disablePlugin: vi.fn(),
    enableMotion: vi.fn(),
    disableMotion: vi.fn(),
    setMotionWeight: vi.fn(),
    enableSimulation: vi.fn(),
    disableSimulation: vi.fn(),
    resetSimulations: vi.fn(),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    enableLayer: vi.fn(),
    disableLayer: vi.fn(),
    resetComposition: vi.fn(),
    registerGlyphLanguage: vi.fn(),
    applyGlyphLanguage: vi.fn(),
    getTime: () => 1.5,
    getFps: () => 60,
    getGridState: () => ({ cols: 2, rows: 2, cells: [] }),
    emitCustom: vi.fn(),
    onEngineEvent: vi.fn(() => () => {}),
    listPresetIds: () => ['basic', 'terminal'],
    getBasePreset: (id) => (id === 'basic' ? basicPreset : null),
    ...overrides,
  };
}

describe('ScriptRegistry', () => {
  it('registers and lists scripts', () => {
    const registry = new ScriptRegistry();
    const mod: ScriptModule = { id: 'test', init: vi.fn() };
    registry.register(mod);
    expect(registry.has('test')).toBe(true);
    expect(registry.listIds()).toEqual(['test']);
  });

  it('throws when registering without id', () => {
    const registry = new ScriptRegistry();
    expect(() => registry.register({ id: '' })).toThrow();
  });
});

describe('ScriptLoader', () => {
  it('loads and caches modules', () => {
    const loader = new ScriptLoader();
    const mod: ScriptModule = { id: 'cached' };
    loader.load(mod);
    expect(loader.getCached('cached')).toBe(mod);
  });

  it('hot reloads module reference', () => {
    const loader = new ScriptLoader();
    const v1: ScriptModule = { id: 'hot', name: 'v1' };
    const v2: ScriptModule = { id: 'hot', name: 'v2' };
    loader.load(v1);
    loader.reload(v2);
    expect(loader.getCached('hot')?.name).toBe('v2');
  });
});

describe('ScriptAPI', () => {
  it('createPreset merges base preset with options', () => {
    const bridge = createMockBridge();
    const logs: string[] = [];
    const api = new ScriptAPI(bridge, (e) => logs.push(e.message));

    const preset = api.createPreset({
      id: 'custom',
      name: 'Custom',
      motions: ['FlowField', 'Breathing'],
      simulations: ['Particles'],
      glyphLanguage: 'organic',
    });

    expect(preset.id).toBe('custom');
    expect(preset.motions?.[0].id).toBe('flowField');
    expect(preset.simulations?.[0].id).toBe('particle');
    expect(preset.glyphLanguage).toBe('organic');
  });

  it('spawnParticles enables simulation and fires noteOn', () => {
    const bridge = createMockBridge();
    const api = new ScriptAPI(bridge, () => {});

    api.spawnParticles({ x: 0.5, y: 0.5, count: 10, intensity: 2 });
    expect(bridge.enableSimulation).toHaveBeenCalledWith('particle');
    expect(bridge.setControl).toHaveBeenCalledWith('simSpawnRate', expect.any(Number));
    expect(bridge.noteOn).toHaveBeenCalled();
  });

  it('tickAnimations interpolates control values', () => {
    const bridge = createMockBridge();
    const api = new ScriptAPI(bridge, () => {});
    const ctx = createScriptContext(0.5, 0.016, 0);
    ctx.vars['anim:speed'] = { from: 0, to: 1, start: 0, duration: 1 };

    api.tickAnimations(ctx);
    expect(bridge.setControl).toHaveBeenCalledWith('speed', 0.5);
  });
});

describe('ScriptRunner', () => {
  it('runs init, update, and destroy lifecycle', async () => {
    const bridge = createMockBridge();
    const runner = new ScriptRunner(bridge);
    const init = vi.fn();
    const update = vi.fn();
    const destroy = vi.fn();
    const mod: ScriptModule = { id: 'lifecycle', init, update, destroy };

    await runner.start(mod);
    expect(init).toHaveBeenCalled();
    expect(runner.getState()).toBe('running');

    runner.onTick(0.016, 1);
    expect(update).toHaveBeenCalled();

    await runner.stop();
    expect(destroy).toHaveBeenCalled();
    expect(runner.getState()).toBe('idle');
  });

  it('captures logs from api.log', async () => {
    const bridge = createMockBridge();
    const runner = new ScriptRunner(bridge);
    const mod: ScriptModule = {
      id: 'logger',
      init(api) {
        api.log('hello script');
      },
    };

    await runner.start(mod);
    expect(runner.getLogs().some((l) => l.message === 'hello script')).toBe(true);
  });

  it('disable pauses update without stopping', async () => {
    const bridge = createMockBridge();
    const runner = new ScriptRunner(bridge);
    const update = vi.fn();
    await runner.start({ id: 'pause', update });
    runner.setEnabled(false);
    runner.onTick(0.016, 1);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('ScriptEngine integration', () => {
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

  function advanceFrames(count: number, ms = 16): void {
    for (let i = 0; i < count; i++) {
      now += ms;
      const cb = rafCallbacks.shift();
      if (cb) cb(now);
    }
  }

  it('engine exposes script debug state', async () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });

    engine.registerScript({
      id: 'debug-test',
      init(api) {
        api.log('started');
        api.setControl('speed', 2);
      },
    });

    await engine.runScript('debug-test');
    const state = engine.getDebugState().script;
    expect(state.activeScriptId).toBe('debug-test');
    expect(state.state).toBe('running');
    expect(state.logs.some((l) => l.message === 'started')).toBe(true);

    engine.destroy();
  });

  it('script update runs each frame', async () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: true,
    });

    let ticks = 0;
    engine.registerScript({
      id: 'tick-test',
      update(_api, _ctx, dt) {
        ticks += dt > 0 ? 1 : 0;
      },
    });

    await engine.runScript('tick-test');
    advanceFrames(5);
    expect(ticks).toBeGreaterThan(0);

    engine.destroy();
  });

  it('clearScriptConsole clears logs', async () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 400,
      height: 300,
      autoStart: false,
    });

    engine.registerScript({
      id: 'clear-test',
      init(api) {
        api.log('line');
      },
    });

    await engine.runScript('clear-test');
    expect(engine.getDebugState().script.logs.length).toBeGreaterThan(0);
    engine.clearScriptConsole();
    expect(engine.getDebugState().script.logs).toHaveLength(0);

    engine.destroy();
  });
});
