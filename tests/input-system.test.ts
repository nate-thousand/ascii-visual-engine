import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PerformanceMapper,
  KeyboardInput,
  resolveInputMappingPreset,
  mapMidiToNoteEvent,
  getDevicePresetMapping,
} from '../src/input';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { performanceGenericPreset } from '../src/presets/input';

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    canvas: { width: 800, height: 600 },
  };
  return {
    width: 800,
    height: 600,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

function createMockEngine() {
  const controls = new Map<string, number>([
    ['glitchAmount', 0.1],
    ['trailAmount', 0.3],
    ['density', 1],
  ]);
  return {
    controls,
    setControl(name: string, value: number) {
      controls.set(name, value);
    },
    getControl(name: string, fallback = 0) {
      return controls.get(name) ?? fallback;
    },
    getLayerManager: () => ({ getLayer: () => undefined }),
    getPostProcessor: () => ({ getPass: () => undefined, setPassAmount: vi.fn() }),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    getPlugin: () => ({ enabled: true }),
    setPresetById: vi.fn(),
  };
}

describe('PerformanceMapper', () => {
  it('maps noteOn to engine noteOn with pitch position', () => {
    const mapper = new PerformanceMapper();
    mapper.setMapping({ enabled: true, defaultNoteOn: true });
    const engine = createMockEngine();

    mapper.handleEvent(engine, {
      type: 'noteOn',
      source: 'midi',
      channel: 0,
      note: 64,
      velocity: 100,
      timestamp: 0,
    });

    expect(engine.enablePlugin).toHaveBeenCalledWith('burst');
    expect(engine.noteOn).toHaveBeenCalled();
    const event = (engine.noteOn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(event.x).toBeCloseTo(64 / 127, 2);
    expect(event.intensity).toBeGreaterThan(0.5);
  });

  it('maps controlChange to engine control', () => {
    const mapper = new PerformanceMapper();
    mapper.setMapping({
      enabled: true,
      ccMappings: [
        { controller: 1, target: { type: 'control', control: 'glitchAmount', min: 0, max: 1 } },
      ],
    });
    const engine = createMockEngine();

    mapper.handleEvent(engine, {
      type: 'controlChange',
      source: 'midi',
      channel: 0,
      controller: 1,
      value: 127,
      timestamp: 0,
    });

    expect(engine.getControl('glitchAmount')).toBeCloseTo(1, 1);
  });

  it('learns CC mapping', () => {
    const mapper = new PerformanceMapper();
    mapper.setMapping({ enabled: true });
    const engine = createMockEngine();

    mapper.startLearn({ type: 'control', control: 'trailAmount', min: 0, max: 1 });
    mapper.handleEvent(engine, {
      type: 'controlChange',
      source: 'midi',
      channel: 0,
      controller: 74,
      value: 64,
      timestamp: 0,
    });

    const learned = mapper.getMapping().learnedMappings ?? [];
    expect(learned.some((m) => m.controller === 74)).toBe(true);
    expect(mapper.isLearnMode()).toBe(false);
  });

  it('panic clears active notes', () => {
    const mapper = new PerformanceMapper();
    mapper.setMapping({ enabled: true, defaultNoteOn: true });
    const engine = createMockEngine();

    mapper.handleEvent(engine, {
      type: 'noteOn',
      source: 'midi',
      channel: 0,
      note: 60,
      velocity: 100,
      timestamp: 0,
    });
    expect(mapper.getActiveNotes()).toContain(60);

    mapper.panic(engine);
    expect(mapper.getActiveNotes()).toHaveLength(0);
    expect(engine.noteOff).toHaveBeenCalled();
  });
});

describe('KeyboardInput', () => {
  function createKeyEvent(type: 'keydown' | 'keyup', key: string): KeyboardEvent {
    return {
      type,
      key,
      repeat: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
  }

  beforeEach(() => {
    const listeners: Record<string, Set<(e: Event) => void>> = {};
    vi.stubGlobal('window', {
      addEventListener(type: string, fn: (e: Event) => void) {
        (listeners[type] ??= new Set()).add(fn);
      },
      removeEventListener(type: string, fn: (e: Event) => void) {
        listeners[type]?.delete(fn);
      },
      dispatchEvent(e: Event) {
        listeners[e.type]?.forEach((fn) => fn(e));
        return true;
      },
    });
  });

  it('maps key to note event', () => {
    const keyboard = new KeyboardInput();
    const events: unknown[] = [];
    keyboard.setMessageHandler((e) => events.push(e));
    keyboard.enable();

    window.dispatchEvent(createKeyEvent('keydown', 'a'));
    window.dispatchEvent(createKeyEvent('keyup', 'a'));

    keyboard.disable();
    expect(events.length).toBe(2);
    expect((events[0] as { type: string }).type).toBe('noteOn');
    expect((events[1] as { type: string }).type).toBe('noteOff');
  });

  it('releaseAll prevents stuck notes', () => {
    const keyboard = new KeyboardInput();
    keyboard.enable();
    window.dispatchEvent(createKeyEvent('keydown', 'd'));
    const released = keyboard.releaseAll();
    expect(released.length).toBe(1);
    expect(keyboard.getActiveNotes()).toHaveLength(0);
    keyboard.disable();
  });
});

describe('Device presets', () => {
  it('provides Akai MPK Mini mappings', () => {
    const mapping = getDevicePresetMapping('akaiMpkMini');
    expect(mapping.ccMappings?.length).toBeGreaterThan(0);
    expect(mapping.noteMappings?.length).toBeGreaterThan(0);
  });

  it('resolveInputMappingPreset merges config', () => {
    const resolved = resolveInputMappingPreset({ enabled: true, devicePreset: 'genericKeyboard' });
    expect(resolved?.enabled).toBe(true);
  });
});

describe('mapMidiToNoteEvent', () => {
  it('normalizes pitch and velocity', () => {
    const event = mapMidiToNoteEvent(64, 127, 0, 'midi');
    expect(event.x).toBeCloseTo(64 / 127, 2);
    expect(event.intensity).toBeGreaterThan(1);
  });
});

describe('AsciiEngine input integration', () => {
  it('loads performance preset input mapping', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: performanceGenericPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    const mapping = engine.getInputMapping();
    expect(mapping.enabled).toBe(true);
    expect(engine.getDebugState().input.mappingCount).toBeGreaterThan(0);
    engine.destroy();
  });

  it('basic preset works without input connected', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getDebugState().input.midiConnected).toBe(false);
    engine.destroy();
  });

  it('setInputMapping updates mapper config', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.setInputMapping({
      enabled: true,
      ccMappings: [
        { controller: 7, target: { type: 'control', control: 'density', min: 0.5, max: 2 } },
      ],
    });
    expect(engine.getInputMapping().ccMappings?.length).toBe(1);
    engine.destroy();
  });

  it('noteOn from engine triggers debug state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.noteOn({ x: 0.5, y: 0.5, intensity: 1.5 });
    expect(engine.getDebugState().lastNoteOn?.intensity).toBe(1.5);
    engine.destroy();
  });
});

describe('localStorage mapping persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  it('saves learned mappings to localStorage', () => {
    const mapper = new PerformanceMapper();
    mapper.startLearn({ type: 'control', control: 'speed', min: 0, max: 3 });
    mapper.handleEvent(createMockEngine(), {
      type: 'controlChange',
      source: 'midi',
      channel: 0,
      controller: 10,
      value: 64,
      timestamp: 0,
    });
    mapper.saveToStorage();

    const mapper2 = new PerformanceMapper();
    mapper2.loadFromStorage();
    expect(mapper2.getMapping().learnedMappings?.length).toBe(1);
  });
});
