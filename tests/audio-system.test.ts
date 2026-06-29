import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AudioAnalyzer,
  AudioFeatureExtractor,
  AudioReactiveMapper,
  resolveAudioMappingPreset,
} from '../src/audio';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { audioBassPreset } from '../src/presets/audio';

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

function createMockAnalyser(binCount = 64): AnalyserNode {
  const frequencyData = new Uint8Array(binCount);
  for (let i = 0; i < binCount; i++) {
    frequencyData[i] = i < 4 ? 200 : i < 20 ? 120 : 40;
  }
  const timeData = new Uint8Array(128);
  for (let i = 0; i < timeData.length; i++) {
    timeData[i] = 128 + Math.sin(i * 0.2) * 40;
  }

  return {
    fftSize: 256,
    frequencyBinCount: binCount,
    getByteFrequencyData: (arr: Uint8Array) => {
      arr.set(frequencyData.subarray(0, arr.length));
    },
    getByteTimeDomainData: (arr: Uint8Array) => {
      arr.set(timeData.subarray(0, arr.length));
    },
    context: {} as AudioContext,
  } as unknown as AnalyserNode;
}

describe('AudioFeatureExtractor', () => {
  it('extracts band features from analyzer data', () => {
    const analyzer = new AudioAnalyzer();
    analyzer.setAnalyser(createMockAnalyser());
    analyzer.update();

    const extractor = new AudioFeatureExtractor();
    const features = extractor.extract(analyzer, 0);

    expect(features.amplitude).toBeGreaterThan(0);
    expect(features.bass).toBeGreaterThan(features.treble);
    expect(features.spectralCentroid).toBeGreaterThanOrEqual(0);
    expect(features.spectralCentroid).toBeLessThanOrEqual(1);
  });

  it('detects transients from amplitude jumps', () => {
    const extractor = new AudioFeatureExtractor();
    extractor.extractFromValues({ amplitude: 0.1 }, 0);
    const spike = extractor.extractFromValues({ amplitude: 0.9 }, 16);
    expect(spike.transient).toBeGreaterThan(0.3);
  });
});

describe('AudioReactiveMapper', () => {
  it('maps features to controls with smoothing', () => {
    const mapper = new AudioReactiveMapper();
    mapper.setMapping({
      enabled: true,
      smoothing: { attack: 0.01, release: 0.01, sensitivity: 1, noiseGate: 0, minThreshold: 0, maxClamp: 1 },
      mappings: [
        { feature: 'bass', target: { type: 'control', control: 'strength', amount: 1, min: 0, max: 1 } },
      ],
    });

    const engine = {
      controls: new Map<string, number>([['strength', 0.3]]),
      setControl(name: string, value: number) {
        this.controls.set(name, value);
      },
      getControl(name: string, fallback = 0) {
        return this.controls.get(name) ?? fallback;
      },
      getLayerManager: () => ({ getLayer: () => undefined }),
      getPostProcessor: () => ({ getPass: () => undefined, setPassAmount: vi.fn() }),
      noteOn: vi.fn(),
    };

    mapper.snapshotBaseValues(engine);
    mapper.apply(engine, {
      amplitude: 0.8,
      bass: 0.9,
      lowMid: 0.4,
      mid: 0.3,
      highMid: 0.2,
      treble: 0.1,
      spectralCentroid: 0.5,
      transient: 0,
      beat: 0,
    }, 0.016, 0);

    expect(engine.getControl('strength')).toBeGreaterThan(0.3);
  });

  it('triggers noteOn on transient mapping', () => {
    const mapper = new AudioReactiveMapper();
    mapper.setMapping({
      enabled: true,
      smoothing: { attack: 0.01, release: 0.01, sensitivity: 1, noiseGate: 0, minThreshold: 0, maxClamp: 1 },
      mappings: [
        { feature: 'transient', target: { type: 'noteOn', cooldownMs: 0 } },
      ],
    });

    const noteOn = vi.fn();
    const engine = {
      controls: new Map<string, number>(),
      setControl: vi.fn(),
      getControl: () => 0,
      getLayerManager: () => ({ getLayer: () => undefined }),
      getPostProcessor: () => ({ getPass: () => undefined, setPassAmount: vi.fn() }),
      noteOn,
    };

    mapper.apply(engine, {
      amplitude: 1,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
      spectralCentroid: 0.5,
      transient: 0.9,
      beat: 0,
    }, 0.016, 100);

    expect(noteOn).toHaveBeenCalled();
  });

  it('resolveAudioMappingPreset merges smoothing defaults', () => {
    const resolved = resolveAudioMappingPreset({
      mappings: [{ feature: 'amplitude', target: { type: 'control', control: 'speed', amount: 0.5 } }],
      smoothing: { attack: 0.5 },
    });
    expect(resolved?.smoothing.attack).toBe(0.5);
    expect(resolved?.smoothing.release).toBeGreaterThan(0);
  });
});

describe('AsciiEngine audio integration', () => {
  it('loads audio mapping from preset', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: audioBassPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getAudioFeatures()).toBeNull();
    expect(engine.isAudioConnected()).toBe(false);
    const mapping = engine.getDebugState().audio;
    expect(mapping.mappingEnabled).toBe(true);
    engine.destroy();
  });

  it('connectAudio accepts external analyser', async () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    engine.setAudioMapping({
      enabled: true,
      smoothing: { attack: 0.01, release: 0.01, sensitivity: 1, noiseGate: 0, minThreshold: 0, maxClamp: 1 },
      mappings: [
        { feature: 'amplitude', target: { type: 'control', control: 'strength', amount: 0.8, min: 0, max: 1 } },
      ],
    });

    const result = await engine.connectAudio({
      type: 'analyser',
      analyser: createMockAnalyser(),
    });

    expect(result.ok).toBe(true);
    expect(engine.isAudioConnected()).toBe(true);
    engine.disconnectAudio();
    expect(engine.isAudioConnected()).toBe(false);
    engine.destroy();
  });

  it('basic preset works without audio connected', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });

    expect(engine.getDebugState().audio.connected).toBe(false);
    engine.destroy();
  });
});

describe('AudioInput graceful failure', () => {
  it('returns error when Web Audio unavailable', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error test environment
    delete globalThis.window;

    const { AudioInput } = await import('../src/audio/AudioInput');
    const input = new AudioInput();
    const result = await input.connect({ type: 'microphone' });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();

    globalThis.window = originalWindow;
  });
});
