import { describe, it, expect } from 'vitest';
import { BeatDetector } from '../src/audio/BeatDetector';
import { AudioFeatureExtractor } from '../src/audio/AudioFeatureExtractor';
import { AudioReactiveMapper, normalizeBpm } from '../src/audio/AudioReactiveMapper';
import type { AudioFeatures } from '../src/audio/AudioTypes';

/** Bass energy at time t for kicks every `periodMs`: a sharp attack and a fast decay over a quiet floor. */
function kick(tMs: number, periodMs: number, floor = 0.08, offsetMs = 0): number {
  const phase = ((tMs - offsetMs) % periodMs + periodMs) % periodMs;
  return floor + (phase < 60 ? 0.85 * (1 - phase / 60) : 0);
}

/** Run the detector at a frame rate over a duration; returns the last state and every state. */
function drive(det: BeatDetector, opts: { periodMs: number; fromMs?: number; toMs: number; fps?: number; floor?: number; offsetMs?: number }) {
  const step = 1000 / (opts.fps ?? 60);
  let last = det.getState();
  const states = [];
  for (let t = opts.fromMs ?? 0; t <= opts.toMs; t += step) {
    last = det.update(kick(t, opts.periodMs, opts.floor, opts.offsetMs), t);
    states.push({ t, ...last });
  }
  return { last, states };
}

describe('BeatDetector', () => {
  it('finds the tempo of a steady kick', () => {
    const det = new BeatDetector();
    const { last, states } = drive(det, { periodMs: 500, toMs: 6000 }); // 120 BPM
    expect(last.bpm).toBeGreaterThan(118);
    expect(last.bpm).toBeLessThan(122);
    expect(last.confidence).toBeGreaterThan(0.9);
    // One pulse per kick, none in between.
    const onsets = states.filter((s, i) => s.pulse === 1 && (i === 0 || states[i - 1].pulse < 1));
    expect(onsets.length).toBeGreaterThanOrEqual(11);
    expect(onsets.length).toBeLessThanOrEqual(13);
  });

  it('phase runs 0 to 1 between beats', () => {
    const det = new BeatDetector();
    const { states } = drive(det, { periodMs: 500, toMs: 5000 });
    const tail = states.slice(-30);
    const phases = tail.map((s) => s.phase);
    expect(Math.max(...phases)).toBeGreaterThan(0.85);
    expect(Math.min(...phases)).toBeLessThan(0.15);
    // Monotone within a beat: each step either advances a little or wraps.
    for (let i = 1; i < phases.length; i++) {
      const d = phases[i] - phases[i - 1];
      expect(d > 0 || d < -0.5).toBe(true);
    }
  });

  it('folds fast and slow kicks into the 60 to 200 range', () => {
    const fast = new BeatDetector();
    expect(drive(fast, { periodMs: 250, toMs: 5000 }).last.bpm).toBeCloseTo(120, 0); // 240 folds to 120
    const slow = new BeatDetector();
    expect(drive(slow, { periodMs: 1500, toMs: 12000 }).last.bpm).toBeCloseTo(80, 0); // 40 folds to 80
  });

  it('follows a tempo change and survives a few dropped kicks', () => {
    const det = new BeatDetector();
    drive(det, { periodMs: 500, toMs: 5000 });
    const { last } = drive(det, { periodMs: 667, fromMs: 5016, toMs: 14000, offsetMs: 5016 }); // 90 BPM
    expect(last.bpm).toBeGreaterThan(88);
    expect(last.bpm).toBeLessThan(92);
  });

  it('drops the estimate after silence and ignores a quiet floor', () => {
    const det = new BeatDetector();
    drive(det, { periodMs: 500, toMs: 4000 });
    expect(det.getState().bpm).toBeGreaterThan(0);
    let s = det.getState();
    for (let t = 4016; t <= 9000; t += 16) s = det.update(0.08, t);
    expect(s.bpm).toBe(0);
    expect(s.confidence).toBe(0);
    expect(s.pulse).toBe(0);

    const quiet = new BeatDetector();
    let q = quiet.getState();
    for (let t = 0; t <= 3000; t += 16) q = quiet.update(0.1 + 0.02 * Math.sin(t), t);
    expect(q.bpm).toBe(0);
  });

  it('is frame rate independent within a couple of BPM', () => {
    const at30 = drive(new BeatDetector(), { periodMs: 500, toMs: 6000, fps: 30 }).last.bpm;
    const at120 = drive(new BeatDetector(), { periodMs: 500, toMs: 6000, fps: 120 }).last.bpm;
    expect(Math.abs(at30 - 120)).toBeLessThan(2.5);
    expect(Math.abs(at120 - 120)).toBeLessThan(2.5);
  });
});

describe('beat features', () => {
  it('the extractor exposes beat, beatPhase, beatConfidence, and bpm', () => {
    const extractor = new AudioFeatureExtractor();
    let f: AudioFeatures | null = null;
    for (let t = 0; t <= 6000; t += 16) f = extractor.extractFromValues({ amplitude: 0.5, bass: kick(t, 500) }, t);
    expect(f!.bpm).toBeGreaterThan(118);
    expect(f!.beatConfidence).toBeGreaterThan(0.9);
    expect(f!.beatPhase).toBeGreaterThanOrEqual(0);
    expect(f!.beatPhase).toBeLessThan(1);
    expect(extractor.getBeatDetector().getState().bpm).toBe(f!.bpm);
    extractor.reset();
    expect(extractor.getBeatDetector().getState().bpm).toBe(0);
  });

  it('bpm maps to controls over 60 to 200', () => {
    expect(normalizeBpm(0)).toBe(0);
    expect(normalizeBpm(60)).toBe(0);
    expect(normalizeBpm(130)).toBeCloseTo(0.5, 5);
    expect(normalizeBpm(240)).toBe(1);

    const mapper = new AudioReactiveMapper();
    mapper.setMapping({
      enabled: true,
      mappings: [{ feature: 'bpm', target: { type: 'control', control: 'speed', min: 0.5, max: 2.5, amount: 1 } }],
      smoothing: { attack: 0, release: 0, sensitivity: 1, noiseGate: 0, minThreshold: 0, maxClamp: 1 },
    });
    const controls: Record<string, number> = { speed: 1 };
    const bridge = {
      setControl: (n: string, v: number) => { controls[n] = v; },
      getControl: (n: string, fb = 0) => controls[n] ?? fb,
      getLayerManager: () => ({ getLayer: () => undefined }) as never,
      getPostProcessor: () => ({ setPassAmount: () => {} }) as never,
      noteOn: () => {},
      enablePlugin: () => {},
    };
    const features: AudioFeatures = { amplitude: 1, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, spectralCentroid: 0, transient: 0, beat: 0, beatPhase: 0, beatConfidence: 1, bpm: 130 };
    mapper.apply(bridge as never, features, 0.016, 0);
    // base 1 + 0.5 * amount 1 * (2.5 - 0.5)
    expect(controls.speed).toBeCloseTo(2, 5);
  });
});
